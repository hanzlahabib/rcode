/**
 * rcode nuke — one-shot full cleanup
 *
 * Removes EVERY trace of rcode/rcode from the system:
 *   - Global npm/pnpm/yarn/bun installs (both @hanzlaa/rcode and legacy @hanzlahabib/rihal-code)
 *   - Global binaries (rcode, rcode, rcode) in all known PATH dirs
 *   - Global Claude Code artifacts (~/.claude/commands/rcode*, ~/.claude/agents/rcode-*, ~/.claude/skills/rcode-*)
 *   - Global state (~/.rcode/)
 *   - Project-level artifacts in CWD (.claude/commands/rcode*, .claude/agents/rcode-*, .rcode/, .planning/ optional)
 *
 * Default mode: dry-run — prints what *would* be removed.
 * Pass --yes to actually remove. Pass --include-planning to also remove .planning/ in CWD.
 *
 * Why this exists: gaps #1-#4 in the duplicate-commands incident (May 2026).
 * - Multiple package managers can hold separate copies invisibly to each other.
 * - rcode uninstall only cleans the project, not global package installs.
 * - Users had no single command to fully reset.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function readDirSafe(p) {
  try { return fs.readdirSync(p); } catch { return []; }
}

/**
 * Resolve where each package manager keeps its global node_modules.
 * Returns a list of { manager, dir } — dir may not exist.
 */
function getGlobalNodeModulesDirs() {
  const home = os.homedir();
  const candidates = [];

  // npm — npm root -g resolves to the active node version's lib/node_modules.
  try {
    const r = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) candidates.push({ manager: 'npm', dir: r.stdout.trim() });
  } catch { /* npm not installed */ }

  // pnpm — `pnpm root -g`
  try {
    const r = spawnSync('pnpm', ['root', '-g'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) candidates.push({ manager: 'pnpm', dir: r.stdout.trim() });
  } catch { /* pnpm not installed */ }

  // yarn classic — `yarn global dir` returns the parent; node_modules is inside.
  try {
    const r = spawnSync('yarn', ['global', 'dir'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) {
      candidates.push({ manager: 'yarn', dir: path.join(r.stdout.trim(), 'node_modules') });
    }
  } catch { /* yarn not installed */ }

  // bun — `bun pm bin -g` returns the bin dir; sibling install/global has node_modules.
  try {
    const r = spawnSync('bun', ['pm', 'bin', '-g'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) {
      // bun layout: ~/.bun/install/global/node_modules + ~/.bun/bin
      candidates.push({ manager: 'bun', dir: path.join(home, '.bun', 'install', 'global', 'node_modules') });
    }
  } catch { /* bun not installed */ }

  // Hardcoded fallbacks for stale/dead version managers (nvm versions that npm root doesn't know about).
  const nvmRoot = path.join(home, '.nvm', 'versions', 'node');
  if (exists(nvmRoot)) {
    for (const v of readDirSafe(nvmRoot)) {
      const dir = path.join(nvmRoot, v, 'lib', 'node_modules');
      if (exists(dir) && !candidates.some(c => c.dir === dir)) {
        candidates.push({ manager: `nvm/${v}`, dir });
      }
    }
  }

  return candidates;
}

/**
 * For a given global node_modules dir, return a list of rcode/rcode package paths.
 * Looks for both @hanzlaa/rcode (current) and @hanzlahabib/rihal-code (legacy).
 */
function findRcodePackages(globalNodeModules) {
  const found = [];
  for (const scope of ['@hanzlaa', '@hanzlahabib']) {
    const scopeDir = path.join(globalNodeModules, scope);
    if (!exists(scopeDir)) continue;
    for (const pkg of readDirSafe(scopeDir)) {
      // Match rcode, rcode, or anything starting with rcode
      if (pkg === 'rcode' || pkg === 'rcode' || pkg.startsWith('rcode')) {
        found.push({ scope, pkg, dir: path.join(scopeDir, pkg) });
      }
    }
  }
  return found;
}

/**
 * Resolve global bin directories where rcode/rcode/rcode may live.
 */
function getGlobalBinDirs() {
  const home = os.homedir();
  const dirs = new Set();

  // npm prefix bin
  try {
    const r = spawnSync('npm', ['prefix', '-g'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) dirs.add(path.join(r.stdout.trim(), 'bin'));
  } catch {}

  // pnpm bin
  try {
    const r = spawnSync('pnpm', ['bin', '-g'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) dirs.add(r.stdout.trim());
  } catch {}

  // yarn bin
  try {
    const r = spawnSync('yarn', ['global', 'bin'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) dirs.add(r.stdout.trim());
  } catch {}

  // bun
  try {
    const r = spawnSync('bun', ['pm', 'bin', '-g'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) dirs.add(r.stdout.trim());
  } catch {}

  // Hardcoded fallbacks
  dirs.add(path.join(home, '.local', 'share', 'pnpm'));
  dirs.add(path.join(home, '.local', 'bin'));
  dirs.add(path.join(home, '.bun', 'bin'));

  // nvm bins
  const nvmRoot = path.join(home, '.nvm', 'versions', 'node');
  if (exists(nvmRoot)) {
    for (const v of readDirSafe(nvmRoot)) {
      dirs.add(path.join(nvmRoot, v, 'bin'));
    }
  }

  return [...dirs].filter(exists);
}

const RCODE_BINS = ['rcode', 'rcode', 'rcode'];

function findRcodeBins(binDir) {
  const found = [];
  for (const name of RCODE_BINS) {
    const p = path.join(binDir, name);
    if (exists(p)) {
      let target = null;
      try { target = fs.readlinkSync(p); } catch {}
      // Only flag if it's clearly ours (target points at rcode/rcode package).
      // If it's not a symlink, include it anyway — bare scripts in pnpm bin etc.
      if (!target || /rcode|rcode|@hanzlaa|@hanzlahabib/.test(target)) {
        found.push({ name, path: p, target });
      }
    }
  }
  return found;
}

/**
 * Find rcode-related artifacts in a Claude Code config dir (~/.claude or .claude in CWD).
 */
function findClaudeArtifacts(claudeDir) {
  const found = [];
  if (!exists(claudeDir)) return found;

  // .claude/commands/rcode-*.md (claude-style root)
  const cmdRoot = path.join(claudeDir, 'commands');
  if (exists(cmdRoot)) {
    for (const f of readDirSafe(cmdRoot)) {
      if (f.startsWith('rcode-') && (f.endsWith('.md') || f.endsWith('.mdc'))) {
        found.push({ kind: 'command', path: path.join(cmdRoot, f) });
      }
    }
    // .claude/commands/rcode/ (vscode-style subdir)
    const rcodeSubdir = path.join(cmdRoot, 'rcode');
    if (exists(rcodeSubdir)) {
      found.push({ kind: 'commands-dir', path: rcodeSubdir });
    }
  }

  // .claude/agents/rcode-*.md
  const agentsDir = path.join(claudeDir, 'agents');
  if (exists(agentsDir)) {
    for (const f of readDirSafe(agentsDir)) {
      if (f.startsWith('rcode-') && (f.endsWith('.md') || f.endsWith('.mdc'))) {
        found.push({ kind: 'agent', path: path.join(agentsDir, f) });
      }
    }
  }

  // .claude/skills/rcode-*
  const skillsDir = path.join(claudeDir, 'skills');
  if (exists(skillsDir)) {
    for (const d of readDirSafe(skillsDir)) {
      if (d.startsWith('rcode-')) {
        found.push({ kind: 'skill-dir', path: path.join(skillsDir, d) });
      }
    }
  }

  return found;
}

function buildPlan({ includePlanning }) {
  const home = os.homedir();
  const cwd = process.cwd();
  const plan = {
    packages: [],
    bins: [],
    globalClaude: [],
    globalrcode: null,
    projectClaude: [],
    projectrcode: null,
    projectPlanning: null,
  };

  // Global node_modules packages
  for (const { manager, dir } of getGlobalNodeModulesDirs()) {
    for (const pkg of findRcodePackages(dir)) {
      plan.packages.push({ manager, ...pkg });
    }
  }

  // Global binaries
  for (const binDir of getGlobalBinDirs()) {
    for (const bin of findRcodeBins(binDir)) {
      plan.bins.push({ binDir, ...bin });
    }
  }

  // Global Claude artifacts (~/.claude/)
  plan.globalClaude = findClaudeArtifacts(path.join(home, '.claude'));

  // Global state (~/.rcode/)
  const globalrcode = path.join(home, '.rcode');
  if (exists(globalrcode)) plan.globalrcode = globalrcode;

  // Project-level (CWD only — never recurse, user may have many projects)
  plan.projectClaude = findClaudeArtifacts(path.join(cwd, '.claude'));
  const projectrcode = path.join(cwd, '.rcode');
  if (exists(projectrcode) && cwd !== home) plan.projectrcode = projectrcode;

  if (includePlanning) {
    const projectPlanning = path.join(cwd, '.planning');
    if (exists(projectPlanning) && cwd !== home) plan.projectPlanning = projectPlanning;
  }

  return plan;
}

function printPlan(plan, { dryRun }) {
  const banner = dryRun ? '[DRY RUN — pass --yes to remove]' : '[REMOVING]';
  console.log(`\n🔥 rcode nuke  · by Hanzla Habib  ${banner}\n`);

  let total = 0;
  const section = (title, items) => {
    if (!items || (Array.isArray(items) && items.length === 0)) return;
    console.log(`${title}`);
    if (Array.isArray(items)) {
      for (const item of items) {
        console.log(`  • ${item.description || item.path || item.dir || JSON.stringify(item)}`);
        total++;
      }
    } else {
      console.log(`  • ${items}`);
      total++;
    }
    console.log('');
  };

  section('📦 Global packages (node_modules):', plan.packages.map(p => ({
    description: `[${p.manager}] ${p.scope}/${p.pkg}  →  ${p.dir}`,
  })));

  section('🔗 Global binaries:', plan.bins.map(b => ({
    description: `${b.path}${b.target ? `  →  ${b.target}` : ''}`,
  })));

  section('🤖 ~/.claude/ artifacts:', plan.globalClaude.map(a => ({
    description: `[${a.kind}] ${a.path}`,
  })));

  if (plan.globalrcode) section('🗂️  ~/.rcode/ (global state):', plan.globalrcode);

  section('🤖 ./.claude/ artifacts (current project):', plan.projectClaude.map(a => ({
    description: `[${a.kind}] ${a.path}`,
  })));

  if (plan.projectrcode) section('🗂️  ./.rcode/ (project state):', plan.projectrcode);
  if (plan.projectPlanning) section('📋 ./.planning/ (your work — only with --include-planning):', plan.projectPlanning);

  if (total === 0) {
    console.log('  ✓ nothing to remove — system is clean.\n');
  } else {
    console.log(`  Total: ${total} item(s).\n`);
  }
  return total;
}

function rmrf(p) {
  try { fs.rmSync(p, { recursive: true, force: true }); return true; }
  catch (err) { console.warn(`  ⚠ failed to remove ${p}: ${err.message}`); return false; }
}

function uninstallPackage(manager, scope, pkg) {
  const fullName = `${scope}/${pkg}`;
  const cmd = manager === 'pnpm' ? ['pnpm', ['remove', '-g', fullName]]
    : manager === 'yarn' ? ['yarn', ['global', 'remove', fullName]]
    : manager === 'bun' ? ['bun', ['remove', '-g', fullName]]
    : ['npm', ['uninstall', '-g', fullName]];
  try {
    const r = spawnSync(cmd[0], cmd[1], { stdio: 'pipe', encoding: 'utf8' });
    return r.status === 0;
  } catch { return false; }
}

function executePlan(plan) {
  let removed = 0;

  // Try clean uninstall via package manager first (cleans bins automatically)
  for (const p of plan.packages) {
    const manager = p.manager.startsWith('nvm/') ? 'npm' : p.manager;
    process.stdout.write(`  ${manager} uninstall ${p.scope}/${p.pkg} ... `);
    const ok = uninstallPackage(manager, p.scope, p.pkg);
    console.log(ok ? '✓' : '⚠ failed via PM, falling back to rm');
    if (!ok) rmrf(p.dir);
    removed++;
  }

  // Force-remove any leftover bins (broken symlinks etc.)
  for (const b of plan.bins) {
    if (exists(b.path)) {
      if (rmrf(b.path)) { console.log(`  ✓ removed bin ${b.path}`); removed++; }
    }
  }

  // Claude artifacts (global)
  for (const a of plan.globalClaude) {
    if (rmrf(a.path)) { console.log(`  ✓ removed ${a.path}`); removed++; }
  }
  if (plan.globalrcode && rmrf(plan.globalrcode)) {
    console.log(`  ✓ removed ${plan.globalrcode}`); removed++;
  }

  // Claude artifacts (project)
  for (const a of plan.projectClaude) {
    if (rmrf(a.path)) { console.log(`  ✓ removed ${a.path}`); removed++; }
  }
  if (plan.projectrcode && rmrf(plan.projectrcode)) {
    console.log(`  ✓ removed ${plan.projectrcode}`); removed++;
  }
  if (plan.projectPlanning && rmrf(plan.projectPlanning)) {
    console.log(`  ✓ removed ${plan.projectPlanning}`); removed++;
  }

  return removed;
}

module.exports = function nuke(args = []) {
  const dryRun = !args.includes('--yes') && !args.includes('-y');
  const includePlanning = args.includes('--include-planning');

  // Safety: detect if CWD is the rcode source repo itself.
  const cwdPkgJson = path.join(process.cwd(), 'package.json');
  if (exists(cwdPkgJson)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(cwdPkgJson, 'utf8'));
      if (pkg.name === '@hanzlaa/rcode' || pkg.name === '@hanzlahabib/rihal-code') {
        console.log('\n⚠  You are inside the rcode source repo.');
        console.log('   Nuke would remove this repo\'s .claude/, .rcode/, and possibly .planning/.');
        console.log('   That is your source code — almost certainly not what you want.');
        console.log('   Run nuke from a different directory, or pass --i-know-what-im-doing to override.\n');
        if (!args.includes('--i-know-what-im-doing')) return;
      }
    } catch { /* package.json unreadable, ignore */ }
  }

  const plan = buildPlan({ includePlanning });
  const total = printPlan(plan, { dryRun });

  if (total === 0 || dryRun) {
    if (dryRun && total > 0) {
      console.log('To actually remove these, re-run with:  rcode nuke --yes');
      console.log('To also remove .planning/ (your work):  rcode nuke --yes --include-planning\n');
    }
    return;
  }

  console.log('Executing...\n');
  const removed = executePlan(plan);
  console.log(`\n✅ Done. Removed ${removed} item(s). Reinstall:  npm install -g @hanzlaa/rcode\n`);
};
