/**
 * memory-drift.cjs — pure-heuristic "memory says X, code now does Y" checker (#958).
 *
 * Compares claims in .rcode/memory/project/{stack.md,decisions.md} against the
 * last 10 commits and the current working tree. No LLM calls, no network I/O —
 * git + fs only, target <300ms on a warm repo.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RECENT_COMMIT_COUNT = 10;
const STALE_INDEX_DAYS = 30;

function safeExec(cmd, cwd) {
  try {
    return execSync(cmd, {
      cwd,
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
}

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function readJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Extract backtick-quoted, path-like tokens from markdown — anything with a
 * '/' that isn't a URL or a CLI flag. Strips trailing `:LINE` or `:LINE-LINE`
 * anchors (e.g. `cli/install.js:741-743` -> `cli/install.js`).
 */
// Generated/build-artifact directories: commonly referenced descriptively in
// memory but not checked in, so a missing path there isn't drift.
const GENERATED_PATH_PREFIXES = ['dist/', 'build/', 'node_modules/', 'coverage/', '.next/', 'out/'];

function extractPaths(text) {
  const paths = new Set();
  const re = /`([^`]+)`/g;
  let m;
  while ((m = re.exec(text))) {
    let token = m[1].trim();
    if (!token || /\s/.test(token)) continue;
    if (!token.includes('/')) continue;
    if (/^https?:\/\//.test(token)) continue;
    if (token.startsWith('-') || token.startsWith('--')) continue;
    if (token.startsWith('@')) continue; // scoped npm package name, not a path
    if (token.includes('{') || token.includes('}')) continue; // brace-expansion glob, not a literal path
    if (token.startsWith('/rcode') || token.startsWith('/rihal')) continue; // slash-command name, not a path
    token = token.replace(/^\.\//, '');
    token = token.replace(/:\d+(-\d+)?$/, ''); // strip line-number anchor
    if (!token) continue;
    if (GENERATED_PATH_PREFIXES.some((p) => token.startsWith(p))) continue;
    paths.add(token);
  }
  return [...paths];
}

/**
 * Extract npm package names named in a markdown table/list — backtick-quoted
 * tokens that look like package identifiers, not paths or file extensions.
 */
function extractPackageNames(text) {
  const names = new Set();
  const re = /`(@?[a-zA-Z0-9][\w.-]*(?:\/[\w.-]+)?)`/g;
  let m;
  while ((m = re.exec(text))) {
    const token = m[1];
    if (/\.(js|cjs|mjs|md|json|ts|tsx|jsx|yml|yaml)$/.test(token)) continue;
    if (token.includes('/') && !token.startsWith('@')) continue;
    if (token.includes('.') && !token.startsWith('@')) continue; // e.g. "0001-zero-deps" false positives
    names.add(token);
  }
  return [...names];
}

function depNames(pkgJson) {
  if (!pkgJson) return new Set();
  return new Set([
    ...Object.keys(pkgJson.dependencies || {}),
    ...Object.keys(pkgJson.devDependencies || {}),
  ]);
}

/**
 * a) package.json deps changed in a way that contradicts stack.md:
 *    - a package stack.md names by identifier was removed from package.json
 *      within the last RECENT_COMMIT_COUNT commits that touched package.json.
 *    - stack.md claims "zero runtime dependencies" but package.json currently
 *      lists a non-empty "dependencies" (runtime) block.
 */
function checkDependencyDrift(cwd, stackText, drifts) {
  const pkgPath = path.join(cwd, 'package.json');
  const currentRaw = readFileSafe(pkgPath);
  if (!currentRaw) return;
  const current = readJsonSafe(currentRaw);
  if (!current) return;

  if (/zero\s+runtime\s+dependenc/i.test(stackText)) {
    const runtimeDeps = Object.keys(current.dependencies || {});
    if (runtimeDeps.length > 0) {
      drifts.push({
        kind: 'dep-contradiction',
        claim: 'stack.md claims "zero runtime dependencies"',
        evidence: `package.json "dependencies" now lists: ${runtimeDeps.join(', ')}`,
        file: 'package.json',
      });
    }
  }

  const touchCommits = safeExec(
    `git log -n ${RECENT_COMMIT_COUNT} --format=%H -- package.json`,
    cwd
  )
    .trim()
    .split('\n')
    .filter(Boolean);
  if (touchCommits.length === 0) return;

  // Compare package.json as of the oldest commit in the touched-commit window
  // against the current working tree — not the commit before it, which may
  // not exist (root commit) or predate the window we care about.
  const oldestTouch = touchCommits[touchCommits.length - 1];
  const oldRaw = safeExec(`git show ${oldestTouch}:package.json`, cwd);
  const old = readJsonSafe(oldRaw);
  if (!old) return;

  const oldDeps = depNames(old);
  const currentDeps = depNames(current);
  const namedInMemory = new Set(extractPackageNames(stackText));

  for (const dep of oldDeps) {
    if (namedInMemory.has(dep) && !currentDeps.has(dep)) {
      drifts.push({
        kind: 'dep-removed',
        claim: `stack.md names \`${dep}\` as part of the stack`,
        evidence: `package.json no longer lists \`${dep}\` (removed within last ${RECENT_COMMIT_COUNT} commits touching package.json)`,
        file: 'package.json',
      });
    }
  }
}

/**
 * b) files/dirs named in memory (stack.md, decisions.md) no longer exist.
 */
function checkMissingPaths(cwd, sourceLabel, text, drifts) {
  for (const rel of extractPaths(text)) {
    const full = path.join(cwd, rel);
    if (!fs.existsSync(full)) {
      drifts.push({
        kind: 'missing-path',
        claim: `${sourceLabel} references \`${rel}\``,
        evidence: `\`${rel}\` does not exist in the working tree`,
        file: sourceLabel,
      });
    }
  }
}

/**
 * c) memory INDEX.md older than STALE_INDEX_DAYS days.
 */
function checkIndexStaleness(cwd, drifts) {
  const indexPath = path.join(cwd, '.rcode', 'memory', 'INDEX.md');
  const text = readFileSafe(indexPath);
  if (!text) return;

  const m = text.match(/\*\*Last updated:\*\*\s*(\d{4}-\d{2}-\d{2})/);
  if (!m) return;

  const lastUpdated = new Date(m[1] + 'T00:00:00Z');
  if (Number.isNaN(lastUpdated.getTime())) return;

  const ageDays = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays > STALE_INDEX_DAYS) {
    drifts.push({
      kind: 'stale-index',
      claim: `INDEX.md "Last updated" is ${m[1]}`,
      evidence: `${Math.floor(ageDays)} days old (threshold: ${STALE_INDEX_DAYS} days)`,
      file: '.rcode/memory/INDEX.md',
    });
  }
}

/**
 * Run all drift heuristics against a project root. Returns {drifts: [...]}.
 * Never throws — a missing/unreadable memory dir yields an empty report.
 *
 * @param {string} cwd - project root to check (defaults to process.cwd())
 */
function checkDrift(cwd = process.cwd()) {
  const drifts = [];

  const stackPath = path.join(cwd, '.rcode', 'memory', 'project', 'stack.md');
  const decisionsPath = path.join(cwd, '.rcode', 'memory', 'project', 'decisions.md');
  const stackText = readFileSafe(stackPath);
  const decisionsText = readFileSafe(decisionsPath);

  try {
    if (stackText) {
      checkDependencyDrift(cwd, stackText, drifts);
      checkMissingPaths(cwd, 'project/stack.md', stackText, drifts);
    }
    if (decisionsText) {
      checkMissingPaths(cwd, 'project/decisions.md', decisionsText, drifts);
    }
    checkIndexStaleness(cwd, drifts);
  } catch {
    // Fail open — drift detection is advisory, never blocking.
  }

  return { drifts };
}

module.exports = {
  checkDrift,
  extractPaths,
  extractPackageNames,
};
