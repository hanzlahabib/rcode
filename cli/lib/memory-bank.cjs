/**
 * Memory bank freshness detection.
 *
 * The .rcode/context/ directory is the project's "memory bank" — a lean
 * brief and a fuller project-brief that every rcode workflow reads at
 * runtime. If these files go stale (code changed, deps updated, new
 * directories appeared), every agent gets outdated context and their
 * answers degrade silently.
 *
 * This module detects staleness programmatically by comparing a project
 * fingerprint (git HEAD, package manifest hash, top-level structure hash)
 * against one stored in .rcode/state.json at the last /rcode-init run.
 *
 * It is intentionally READ-ONLY + write-fingerprint. The actual scan and
 * rewrite of the memory bank is done by Claude when /rcode-init runs —
 * this library only tells callers WHEN to refresh, not HOW.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { writeJsonAtomic } = require('./fsutil.cjs');

// ---------- Thresholds ----------

/**
 * If any of these cross, memory bank is considered stale.
 * Deliberately conservative — false positives (warning when actually fresh)
 * are cheap, false negatives (not warning when stale) cost the user quality.
 */
const STALE_THRESHOLDS = {
  commitsSinceInit: 20,       // N commits since fingerprint was written
  daysSinceInit: 14,          // wall-clock days since last init
};

// ---------- Fingerprint ----------

/**
 * Files that indicate dependency changes. First match wins — we hash the
 * first file that exists. Covers major ecosystems without locking us into
 * any specific one.
 */
const MANIFEST_CANDIDATES = [
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'package.json',
  'pyproject.toml',
  'poetry.lock',
  'requirements.txt',
  'Pipfile.lock',
  'Cargo.lock',
  'Cargo.toml',
  'go.sum',
  'go.mod',
  'Gemfile.lock',
  'Gemfile',
  'composer.lock',
  'composer.json',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
];

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function hashFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const buf = fs.readFileSync(filePath);
    return sha256(buf);
  } catch {
    return null;
  }
}

/**
 * Pick the first manifest that exists in cwd, hash its contents.
 * Returns { name, hash } or null.
 */
function manifestFingerprint(cwd) {
  for (const name of MANIFEST_CANDIDATES) {
    const full = path.join(cwd, name);
    const hash = hashFileIfExists(full);
    if (hash) return { name, hash };
  }
  return null;
}

/**
 * Hash the sorted list of top-level directory names. Catches "new dir
 * appeared" (which usually means a new subsystem was added) without
 * needing to walk the tree.
 */
function structureFingerprint(cwd) {
  try {
    const entries = fs
      .readdirSync(cwd, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((n) => !n.startsWith('.') && n !== 'node_modules' && n !== 'dist' && n !== 'build')
      .sort();
    return {
      dirs: entries,
      hash: sha256(entries.join('|')),
    };
  } catch {
    return { dirs: [], hash: null };
  }
}

/**
 * Return git HEAD sha + branch, or null if not a git repo.
 */
function gitFingerprint(cwd) {
  try {
    const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' });
    if (sha.status !== 0) return null;
    const branch = spawnSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8' });
    return {
      head: sha.stdout.trim(),
      branch: branch.status === 0 ? branch.stdout.trim() : null,
    };
  } catch {
    return null;
  }
}

/**
 * Count commits between two shas. Returns null if anything fails
 * (e.g. stored sha no longer exists in history after a force-push).
 */
function commitsBetween(cwd, from, to) {
  if (!from || !to) return null;
  try {
    const result = spawnSync(
      'git',
      ['rev-list', '--count', `${from}..${to}`],
      { cwd, encoding: 'utf8' },
    );
    if (result.status !== 0) return null;
    return parseInt(result.stdout.trim(), 10);
  } catch {
    return null;
  }
}

/**
 * Compute the full fingerprint for the current state of a project.
 * Used both to write at init time and to compare at check time.
 */
function computeFingerprint(cwd) {
  const git = gitFingerprint(cwd);
  const manifest = manifestFingerprint(cwd);
  const structure = structureFingerprint(cwd);

  return {
    timestamp: new Date().toISOString(),
    git_head: git ? git.head : null,
    git_branch: git ? git.branch : null,
    manifest_name: manifest ? manifest.name : null,
    manifest_hash: manifest ? manifest.hash : null,
    structure_hash: structure.hash,
    structure_dirs: structure.dirs,
  };
}

// ---------- State.json I/O ----------

function stateFilePath(cwd) {
  return path.join(cwd, '.rcode', 'state.json');
}

function readState(cwd) {
  const p = stateFilePath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Persist the init fingerprint into .rcode/state.json under `memory_bank`.
 * Called by /rcode-init (via rcode context --refresh) after a scan
 * rewrites context/active.md + context/project-brief.md.
 */
function writeFingerprint(cwd) {
  const state = readState(cwd) || {};
  const fingerprint = computeFingerprint(cwd);
  state.memory_bank = {
    ...state.memory_bank,
    last_init: fingerprint,
  };
  writeJsonAtomic(stateFilePath(cwd), state);
  return fingerprint;
}

function readFingerprint(cwd) {
  const state = readState(cwd);
  return state?.memory_bank?.last_init || null;
}

// ---------- Staleness check ----------

/**
 * Compare stored fingerprint to the current project state. Returns a
 * structured report callers can print or branch on.
 *
 * Return shape:
 *   {
 *     status: 'fresh' | 'stale' | 'never',
 *     reasons: string[],          // human-readable reasons for stale/never
 *     current: Fingerprint,       // what we just computed
 *     stored: Fingerprint|null,   // what was saved at last init
 *     context_files: {            // which context files actually exist
 *       active: boolean,
 *       brief: boolean,
 *     },
 *   }
 */
function checkStaleness(cwd) {
  const current = computeFingerprint(cwd);
  const stored = readFingerprint(cwd);

  const activePath = path.join(cwd, '.rcode/context/active.md');
  const briefPath = path.join(cwd, '.rcode/context/project-brief.md');
  const context_files = {
    active: fs.existsSync(activePath),
    brief: fs.existsSync(briefPath),
  };

  // If the context files don't even exist, status is 'never'.
  if (!context_files.active && !context_files.brief) {
    return {
      status: 'never',
      reasons: ['memory bank has never been initialized — run /rcode-init'],
      current,
      stored,
      context_files,
    };
  }

  // Partially-present: one file exists but not the other.
  if (!context_files.active || !context_files.brief) {
    const missing = [];
    if (!context_files.active) missing.push('.rcode/context/active.md');
    if (!context_files.brief) missing.push('.rcode/context/project-brief.md');
    return {
      status: 'stale',
      reasons: [`incomplete memory bank — missing: ${missing.join(', ')}`],
      current,
      stored,
      context_files,
    };
  }

  // Context files exist but no fingerprint stored — fresh install with stub
  // context files, or state.json got truncated before fingerprint was written.
  if (!stored) {
    return {
      status: 'stale',
      reasons: ['run /rcode-init in your editor to populate project context'],
      current,
      stored,
      context_files,
    };
  }

  // Compare fingerprints and collect reasons.
  const reasons = [];

  // Manifest changed → deps changed
  if (
    current.manifest_hash &&
    stored.manifest_hash &&
    current.manifest_hash !== stored.manifest_hash
  ) {
    reasons.push(
      `${current.manifest_name || 'dependency manifest'} changed since last init`,
    );
  }

  // Structure changed → new top-level dirs
  if (
    current.structure_hash &&
    stored.structure_hash &&
    current.structure_hash !== stored.structure_hash
  ) {
    const storedDirs = new Set(stored.structure_dirs || []);
    const currentDirs = new Set(current.structure_dirs || []);
    const added = [...currentDirs].filter((d) => !storedDirs.has(d));
    const removed = [...storedDirs].filter((d) => !currentDirs.has(d));
    const parts = [];
    if (added.length) parts.push(`added: ${added.join(', ')}`);
    if (removed.length) parts.push(`removed: ${removed.join(', ')}`);
    reasons.push(`top-level structure changed (${parts.join('; ') || 'reorganized'})`);
  }

  // Commits since init
  if (current.git_head && stored.git_head && current.git_head !== stored.git_head) {
    const n = commitsBetween(cwd, stored.git_head, current.git_head);
    if (n !== null && n >= STALE_THRESHOLDS.commitsSinceInit) {
      reasons.push(`${n} commits since last init (threshold: ${STALE_THRESHOLDS.commitsSinceInit})`);
    } else if (n !== null) {
      // Tracked but below threshold — note it without marking stale.
      // We still include this as informational; caller decides what to do.
    }
  }

  // Time since init
  if (stored.timestamp) {
    const storedTs = Date.parse(stored.timestamp);
    if (!Number.isNaN(storedTs)) {
      const daysElapsed = (Date.now() - storedTs) / (1000 * 60 * 60 * 24);
      if (daysElapsed >= STALE_THRESHOLDS.daysSinceInit) {
        reasons.push(
          `${Math.floor(daysElapsed)} days since last init (threshold: ${STALE_THRESHOLDS.daysSinceInit})`,
        );
      }
    }
  }

  // Branch changed — informational, not a staleness reason on its own
  // (working on a feature branch is normal).

  return {
    status: reasons.length > 0 ? 'stale' : 'fresh',
    reasons,
    current,
    stored,
    context_files,
  };
}

module.exports = {
  computeFingerprint,
  writeFingerprint,
  readFingerprint,
  checkStaleness,
  commitsBetween,
  STALE_THRESHOLDS,
  MANIFEST_CANDIDATES,
};
