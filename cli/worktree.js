/**
 * `rcode worktree link` — repair a git worktree's rcode runtime, surgically.
 *
 * Why this exists as its own command rather than "just re-run install":
 *
 * rcode's gitignore block ignores `.rcode/bin/`, `workflows/`, `references/`,
 * `data/`, `skills/`, `commands/` and `.claude/` — correctly, since the
 * installer regenerates them. But that means `git worktree add` never brings
 * them along. The worktree gets config.yaml and state.json and no runtime, so a
 * skill loads from the global install and then finds no
 * `.rcode/workflows/<name>.md` to dispatch to.
 *
 * The only remedy used to be a full `rcode install` in the worktree — which
 * rewrites AGENTS.md, the gitignore block, hooks, and settings, and lands on top
 * of whatever work is already staged there. Users reasonably refuse to do that
 * mid-task and work around rcode instead.
 *
 * This command touches nothing but the missing runtime directories.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RUNTIME_DIRS = [
  path.join('.rcode', 'bin'),
  path.join('.rcode', 'workflows'),
  path.join('.rcode', 'references'),
  path.join('.rcode', 'data'),
  path.join('.rcode', 'skills'),
  path.join('.rcode', 'commands'),
  path.join('.rcode', 'agents-rules'),
  path.join('.rcode', 'templates'),
  '.claude',
];

function detect(target) {
  const dotGit = path.join(target, '.git');
  let isWorktree = false;
  try { isWorktree = fs.statSync(dotGit).isFile(); } catch { return { isWorktree: false }; }
  if (!isWorktree) return { isWorktree: false };

  const r = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: target, encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout.trim()) return { isWorktree: true, mainCheckout: null };
  const commonDir = path.resolve(target, r.stdout.trim());
  const mainCheckout = path.dirname(commonDir);
  return { isWorktree: true, mainCheckout: mainCheckout === path.resolve(target) ? null : mainCheckout };
}

function missingDirs(target, mainCheckout) {
  return RUNTIME_DIRS.filter((rel) =>
    fs.existsSync(path.join(mainCheckout, rel)) && !fs.existsSync(path.join(target, rel)));
}

function copyTree(src, dest) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyTree(s, d); }
    else fs.copyFileSync(s, d);
  }
}

function link(target, opts = {}) {
  const info = detect(target);
  if (!info.isWorktree) {
    console.log('Not a git worktree — nothing to link. (This is the main checkout.)');
    return 0;
  }
  if (!info.mainCheckout) {
    console.error('Could not resolve the main checkout from this worktree.');
    return 1;
  }

  const missing = missingDirs(target, info.mainCheckout);
  if (missing.length === 0) {
    console.log(`✓ Worktree runtime already complete (main checkout: ${info.mainCheckout})`);
    return 0;
  }

  if (opts.check) {
    console.log(`✗ ${missing.length} runtime dir(s) missing in this worktree:`);
    for (const m of missing) console.log(`    ${m}`);
    console.log(`\n  Fix: rcode worktree link`);
    return 1;
  }

  let linked = 0, copied = 0;
  for (const rel of missing) {
    const src = path.join(info.mainCheckout, rel);
    const dest = path.join(target, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
      // Symlink so the worktree follows the main checkout's rcode version
      // instead of silently pinning whatever was current today.
      fs.symlinkSync(src, dest, 'junction');
      linked++;
    } catch {
      try { fs.mkdirSync(dest, { recursive: true }); copyTree(src, dest); copied++; }
      catch (e) { console.error(`  ✗ ${rel}: ${e.message}`); }
    }
  }

  console.log(`✓ Worktree runtime restored from ${info.mainCheckout}`);
  if (linked) console.log(`    ${linked} linked`);
  if (copied) {
    console.log(`    ${copied} copied (symlinks unavailable here)`);
    console.log('    Copies pin today\'s version — re-run this after an rcode update.');
  }
  console.log('\n  Nothing else was touched: no AGENTS.md, no gitignore, no hooks, no settings.');
  return 0;
}

module.exports = function worktree(args) {
  const sub = args[0];
  const target = process.cwd();
  switch (sub) {
    case 'link':  return link(target, { check: false });
    case 'check': return link(target, { check: true });
    default:
      console.log('Usage:\n  rcode worktree link   — restore this worktree\'s rcode runtime from the main checkout\n  rcode worktree check  — report what is missing, change nothing');
      return sub ? 1 : 0;
  }
};
module.exports.detect = detect;
module.exports.missingDirs = missingDirs;
module.exports.RUNTIME_DIRS = RUNTIME_DIRS;
