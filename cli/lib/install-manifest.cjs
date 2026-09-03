/**
 * cli/lib/install-manifest.cjs — manifest generation and orphan sweep:
 * package version lookup, SHA256 hashing, agent/files manifests, install
 * manifest (manifest.yaml), and stale-file sweep.
 *
 * Split out of cli/install.js (#1066 Phase 1) — mechanical move, no
 * behavior change.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const semver = require('semver');
const { safeRmSync } = require('./fsutil.cjs');
const { homedir } = require('./homedir.cjs');
const { PACKAGE_ROOT, SOURCE_ROOT } = require('./install-shared.cjs');
const { parseFrontmatter } = require('./install-skills.cjs');
const { listAvailableModules } = require('./install-plan.cjs');

function readPackageVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Auto-generate agent-manifest.csv from the installed agent files'
 * frontmatter. Columns: id, file, name, description, color.
 *
 * The `id` column strips the `rcode-` prefix so workflow code can match
 * against the council-panel scorer's AGENT_IDS (which use bare names).
 */
function generateAgentManifest(plan, target) {
  const rows = [['id', 'file', 'name', 'description', 'color']];
  const seen = new Set(); // Track IDs already added to avoid duplicates
  // Memoize per-file text reads — same agent .md may be visited across loops 1-3.
  const _textCache = new Map();
  const readAgentText = (p) => {
    if (!_textCache.has(p)) _textCache.set(p, fs.readFileSync(p, 'utf8'));
    return _textCache.get(p);
  };

  for (const entry of plan) {
    if (!entry.rel.startsWith(path.join('.claude', 'agents'))) continue;
    if (!entry.rel.match(/^\.claude[\/\\]agents[\/\\][^\/\\]+\.md$/)) continue;
    const filePath = path.join(target, entry.rel);
    const text = readAgentText(filePath);
    const { frontmatter } = parseFrontmatter(text);
    const name = frontmatter.name || path.basename(entry.rel, '.md');
    const bareId = name.replace(/^rcode-/, '');
    if (seen.has(bareId)) continue; // Skip duplicate
    seen.add(bareId);
    const desc = (frontmatter.description || '').replace(/"/g, '""');
    rows.push([
      bareId,
      entry.rel,
      name,
      `"${desc}"`,
      frontmatter.color || '',
    ]);
  }
  // Also include agents already on disk but not in current plan
  const agentDir = path.join(target, '.claude', 'agents');
  if (fs.existsSync(agentDir)) {
    const existingFiles = fs.readdirSync(agentDir).filter(f => f.startsWith('rcode-') && f.endsWith('.md'));
    const alreadyIncluded = new Set(plan.filter(e => e.rel.startsWith(path.join('.claude', 'agents'))).map(e => path.basename(e.rel)));
    for (const file of existingFiles) {
      if (alreadyIncluded.has(file)) continue;
      const filePath = path.join(agentDir, file);
      const text = readAgentText(filePath);
      const { frontmatter } = parseFrontmatter(text);
      const name = frontmatter.name || path.basename(file, '.md');
      const bareId = name.replace(/^rcode-/, '');
      if (seen.has(bareId)) continue; // Skip if already added
      seen.add(bareId);
      const desc = (frontmatter.description || '').replace(/"/g, '""');
      rows.push([bareId, path.join('.claude', 'agents', file), name, `"${desc}"`, frontmatter.color || '']);
    }
  }
  // Issues #805/#808/#825: always scan known global locations (not gated on
  // rows.length === 1) so the manifest reflects every installed agent. On a
  // fresh project install agents may live in ~/.claude/agents/ (global slash
  // commands) or in the source tree if local copy was skipped via dedup.
  // Also scan rcode/agents/ in SOURCE_ROOT as a last-resort fallback so the
  // manifest is never empty when the package itself ships agent definitions.
  const extraScans = [
    path.join(homedir(), '.claude', 'agents'),
    path.join(homedir(), '.rcode', 'agents'),
  ];
  // Final fallback: scan the package source itself.
  try {
    const sourceAgentsDir = path.join(SOURCE_ROOT, 'agents');
    if (fs.existsSync(sourceAgentsDir)) extraScans.push(sourceAgentsDir);
  } catch { /* SOURCE_ROOT may not be in scope on some paths */ }

  for (const scanDir of extraScans) {
    if (!fs.existsSync(scanDir)) continue;
    let files;
    try {
      files = fs.readdirSync(scanDir).filter(f => f.startsWith('rcode-') && f.endsWith('.md'));
    } catch { continue; }
    for (const file of files) {
      const filePath = path.join(scanDir, file);
      let text;
      try { text = readAgentText(filePath); } catch { continue; }
      const { frontmatter } = parseFrontmatter(text);
      const name = frontmatter.name || path.basename(file, '.md');
      const bareId = name.replace(/^rcode-/, '');
      if (seen.has(bareId)) continue;
      seen.add(bareId);
      const desc = (frontmatter.description || '').replace(/"/g, '""');
      rows.push([bareId, path.join('.claude', 'agents', file), name, `"${desc}"`, frontmatter.color || '']);
    }
  }
  return rows.map((r) => r.join(',')).join('\n') + '\n';
}

/**
 * Generate files-manifest.csv with SHA256 per installed file. Used by
 * update/doctor to detect drift. Columns: rel, sha256, size.
 */
function generateFilesManifest(plan, target, { mergeExistingManifest = false, extraScanDirs = [] } = {}) {
  const rows = [['rel', 'sha256', 'size']];
  const newRels = new Set();
  // Memoize Buffer reads — plan loop and merge loop can visit the same file path.
  const _bufCache = new Map();
  const readFileBuf = (p) => {
    if (!_bufCache.has(p)) _bufCache.set(p, fs.readFileSync(p));
    return _bufCache.get(p);
  };

  for (const entry of plan) {
    const filePath = path.join(target, entry.rel);
    if (!fs.existsSync(filePath)) continue;
    const buf = readFileBuf(filePath);
    const rel = entry.rel.split(path.sep).join('/');
    rows.push([rel, sha256(buf), String(buf.length)]);
    newRels.add(rel);
  }

  // Issue #702: skills installed via installSkills() and sidebar stubs
  // generated by cli/generate-command-skills.cjs are NOT in the install plan
  // (they're walked from rcode/skills/ separately and copied directly).
  // Without this scan, files-manifest.csv was missing the largest category
  // of installed files — orphan sweep + doctor drift detection were blind
  // to renamed/removed skills.
  function walkScanDir(absDir) {
    if (!fs.existsSync(absDir)) return;
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const full = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        walkScanDir(full);
      } else if (entry.isFile()) {
        const rel = path.relative(target, full).split(path.sep).join('/');
        if (newRels.has(rel)) continue; // already in plan
        // Skip files outside the project root (defense-in-depth — extraScanDirs
        // is a code-controlled set, but cheap to verify).
        if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
        try {
          const buf = readFileBuf(full);
          rows.push([rel, sha256(buf), String(buf.length)]);
          newRels.add(rel);
        } catch { /* unreadable file — skip */ }
      }
    }
  }
  for (const scan of extraScanDirs) walkScanDir(scan);

  // Merge old manifest entries that are still on disk but not in the current
  // plan — this keeps orphaned files traceable by doctor/uninstall even when
  // --force sweep was not run. Without this, a re-install without --force
  // silently drops stale files from the manifest, making them invisible.
  if (mergeExistingManifest) {
    const manifestPath = path.join(target, '.rcode', '_config', 'files-manifest.csv');
    if (fs.existsSync(manifestPath)) {
      try {
        const oldRows = fs.readFileSync(manifestPath, 'utf8').split('\n').slice(1).filter(Boolean);
        for (const row of oldRows) {
          const [rel] = row.split(',');
          if (!rel || newRels.has(rel)) continue;
          const full = path.join(target, rel);
          if (!fs.existsSync(full)) continue; // already gone — don't re-add
          const buf = readFileBuf(full);
          rows.push([rel, sha256(buf), String(buf.length)]);
          newRels.add(rel);
        }
      } catch { /* best-effort */ }
    }
  }

  return rows.map((r) => r.join(',')).join('\n') + '\n';
}

/**
 * Orphan sweep — remove files that were part of a previous install but aren't
 * in the current plan. Reads `.rcode/_config/files-manifest.csv` from the
 * previous install and computes the diff against the new plan.
 *
 * Closes #196 — without this, upgrading rcode leaves stale skill/command
 * files around that show up as ghost slash commands in the IDE.
 *
 * Deliberately conservative:
 *   - Only removes files that appeared in the PREVIOUS manifest.
 *   - Never removes files the user created themselves.
 *   - Never touches .rcode/config.yaml, .rcode/state.json, or .planning/.
 *
 * Returns the number of orphan files removed.
 */
function sweepStaleInstalledFiles(target, newPlan) {
  const manifestPath = path.join(target, '.rcode', '_config', 'files-manifest.csv');
  if (!fs.existsSync(manifestPath)) return 0;

  let oldRels;
  try {
    const rows = fs.readFileSync(manifestPath, 'utf8').split('\n').slice(1).filter(Boolean);
    oldRels = rows.map(r => r.split(',')[0]).filter(Boolean);
  } catch {
    return 0;
  }

  const newRelsSet = new Set(newPlan.map(e => e.rel.split(path.sep).join('/')));
  // Safety — never sweep these, even if they somehow landed in the manifest.
  const neverSweep = /^(\.rcode\/config\.yaml|\.rcode\/state\.json|\.rcode\/state\.json\.lock|\.planning\/|\.rcode\/brain\/sources\.yaml)/;
  // #382 — local overrides: files matching <name>.local.md are user-managed.
  // The installer never touches them: not in copy, not in sweep, not even on
  // --force-overwrite. This gives users a stable path to customize agent
  // voice / examples / project-specific rules without losing them on update.
  const isLocalOverride = (rel) => /\.local\.(md|mdc|json|yaml|yml|toml|js|ts)$/.test(rel);

  let removed = 0;
  const emptyCandidateDirs = new Set();
  // Issue #703: a tampered or malformed CSV could contain a rel like
  // '../../etc/passwd'. path.join collapses '..' segments and could escape
  // the project root. Use safeRmSync's project-root containment check —
  // any rel whose realpath escapes target is refused with reason='outside-root'.
  const targetRoot = path.resolve(target);
  for (const rel of oldRels) {
    if (newRelsSet.has(rel)) continue;
    if (neverSweep.test(rel)) continue;
    if (isLocalOverride(rel)) continue; // #382 — never sweep user-owned overrides
    // Reject relative paths that obviously try to escape before even hitting fs.
    if (rel.includes('..') || path.isAbsolute(rel)) continue;
    const full = path.join(target, rel);
    if (!fs.existsSync(full)) continue;
    const result = safeRmSync(full, targetRoot);
    if (result.ok) {
      emptyCandidateDirs.add(path.dirname(full));
      removed += 1;
    }
    // outside-root / lstat / unlink failures are silently skipped — sweep is
    // best-effort and we never want to abort the install on a single bad row.
  }

  // Remove any now-empty parent dirs (bottom-up, so nested emptiness cascades).
  const dirsSortedDeep = Array.from(emptyCandidateDirs).sort((a, b) => b.length - a.length);
  for (const dir of dirsSortedDeep) {
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
      }
    } catch (err) {
      console.error('[install] sweepStaleInstalledFiles: failed to remove empty dir', dir + ':', err?.message || err);
    }
  }

  return removed;
}

function generateInstallManifest(opts) {
  const version = readPackageVersion();
  const newModules = opts.modules.length > 0 ? opts.modules : listAvailableModules();
  // Merge with existing manifest if present; capture previous_version for rollback (#253).
  let existingModules = [];
  let previousVersion = null;
  const existingPath = path.join(opts.target, '.rcode', '_config', 'manifest.yaml');
  if (fs.existsSync(existingPath)) {
    const text = fs.readFileSync(existingPath, 'utf8');
    let inModules = false;
    for (const line of text.split('\n')) {
      if (line.startsWith('version:')) {
        const v = line.replace('version:', '').trim();
        if (semver.valid(v) && v !== version) previousVersion = v;
      }
      if (line.startsWith('modules:')) { inModules = true; continue; }
      if (inModules && line.trim().startsWith('-')) { existingModules.push(line.trim().slice(1).trim()); }
      else if (inModules && !line.startsWith(' ')) { inModules = false; }
    }
  }
  const allModules = [...new Set([...existingModules, ...newModules])];
  const moduleLines = allModules.map((m) => `  - ${m}`).join('\n');
  const lines = [
    '# rcode v2 install manifest',
    `version: ${version}`,
    `installDate: ${new Date().toISOString()}`,
  ];
  if (previousVersion) lines.push(`previous_version: ${previousVersion}`);
  lines.push('modules:', moduleLines, 'ides:', '  - claude-code', '');
  return lines.join('\n');
}

module.exports = {
  readPackageVersion,
  sha256,
  generateAgentManifest,
  generateFilesManifest,
  sweepStaleInstalledFiles,
  generateInstallManifest,
};
