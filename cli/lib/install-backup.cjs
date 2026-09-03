/**
 * cli/lib/install-backup.cjs — pre-overwrite tar.gz backups, pnpm lockfile
 * silent-failure detection, and the post-install 5-point health check.
 *
 * Split out of cli/install.js (#1066 Phase 1) — mechanical move, no
 * behavior change.
 */

const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const { homedir } = require('./homedir.cjs');
const { ok, fail, dim, bold, PACKAGE_ROOT } = require('./install-shared.cjs');

/**
 * Create a tar.gz backup of every file the install plan would touch BEFORE
 * --force-overwrite clobbers them. Closes #381 — without this, customized
 * .claude/agents/rcode-*.md and similar files were silently lost.
 *
 * Returns { ok, path, warning, fileCount } — ok=false means we couldn't
 * create the backup (tar missing, no paths, etc.); the caller decides
 * whether to abort or continue.
 */
function createInstallBackup(target, plan) {
  const { spawnSync } = require('child_process');

  // Build the list of files that EXIST and are about to be overwritten.
  // Plan items use `rel` (the relative dest path); see plan.push sites in
  // buildInstallPlan / discover* helpers.
  const paths = [];
  for (const item of plan) {
    const relPath = item.rel || item.dest;
    if (!relPath) continue;
    const fullDest = path.join(target, relPath);
    if (fs.existsSync(fullDest)) {
      paths.push(relPath);
    }
  }
  // Also include the package-managed state files even though install
  // explicitly preserves them — defensive: if install regresses and starts
  // touching them, the backup catches it.
  for (const stateFile of [
    '.rcode/config.yaml',
    '.rcode/state.json',
    '.rcode/_config/manifest.yaml',
    '.rcode/_config/files-manifest.csv',
  ]) {
    if (fs.existsSync(path.join(target, stateFile))) {
      paths.push(stateFile);
    }
  }

  if (paths.length === 0) {
    return { ok: false, warning: 'no existing files to back up — fresh install', fileCount: 0 };
  }

  const backupsDir = path.join(target, '.rcode/backups');
  try {
    fs.mkdirSync(backupsDir, { recursive: true });
  } catch (err) {
    return { ok: false, warning: `could not create .rcode/backups/: ${err.message}`, fileCount: 0 };
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(backupsDir, `install-force-${ts}.tgz`);
  const backupRel = path.relative(target, backupFile);

  const result = spawnSync(
    'tar',
    ['-czf', backupFile, '-C', target, '--files-from=-'],
    {
      input: paths.join('\n') + '\n',
      encoding: 'utf8',
    }
  );

  if (result.status !== 0) {
    return {
      ok: false,
      warning: `tar failed: ${(result.stderr || '').trim().split('\n')[0]}`,
      fileCount: paths.length,
    };
  }

  return { ok: true, path: backupRel, fileCount: paths.length };
}

/**
 * Issue #838 — pnpm lockfile silent failure detection.
 *
 * pnpm add -D can exit 0 and print "Done" even when the lockfile is
 * corrupted, without actually writing package.json. This helper is called
 * after any pnpm add run (including auto-install flows) to confirm the
 * package genuinely landed in devDependencies.
 *
 * Returns { ok: true } when:
 *   - no package.json exists in target (nothing to verify)
 *   - package found in dependencies or devDependencies
 *
 * Returns { ok: false, message } when:
 *   - package.json exists in a pnpm project (pnpm-lock.yaml present) but
 *     @hanzlaa/rcode is absent from both dep sections — strongly suggests
 *     a silent pnpm add failure due to a broken lockfile.
 */
function verifyPnpmAddDevDep(target) {
  const pkgPath = path.join(target, 'package.json');
  const lockPath = path.join(target, 'pnpm-lock.yaml');
  // Only diagnose when both a package.json and pnpm-lock.yaml exist (pnpm project).
  if (!fs.existsSync(pkgPath) || !fs.existsSync(lockPath)) return { ok: true };
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const inDeps = Object.prototype.hasOwnProperty.call(pkg.dependencies || {}, '@hanzlaa/rcode');
    const inDevDeps = Object.prototype.hasOwnProperty.call(pkg.devDependencies || {}, '@hanzlaa/rcode');
    if (!inDeps && !inDevDeps) {
      return {
        ok: false,
        message:
          '@hanzlaa/rcode not found in package.json — if you ran `pnpm add -D @hanzlaa/rcode` ' +
          'and it reported success, your lockfile may be corrupted.\n' +
          '  Fix: pnpm install --fix-lockfile && pnpm add -D @hanzlaa/rcode',
      };
    }
    return { ok: true };
  } catch {
    return { ok: true }; // unreadable package.json — not our problem
  }
}

/**
 * Run a 5-point smoke test against the fresh install. Closes #193.
 * Returns true if all pass, false if any critical check failed.
 * Prints a clean ✓/✖ line per check.
 */
function runInstallHealthCheck(target, counts) {
  console.log(`  ${bold('Health check:')}`);
  const { execFileSync } = require('child_process');
  let fails = 0;

  // Issue #689: thresholds were hardcoded at 20 ("expected ≥ 20 agents",
  // "expected ≥ 20 skills", "expected ≥ 20 commands"). If the package ever
  // ships fewer than 20 of any kind, the health check fails on every install
  // even when the install actually succeeded. Worse: if the package ships
  // 22 agents and an install lands 21 (one corrupt copy), the >= 20 threshold
  // passes — false green.
  //
  // Source the expected counts from the package manifest itself. The verifier
  // in cli/lib/manifest.cjs already does this; we mirror its result here.
  let expected = { agents: 20, skills: 20, commands: 20 };
  try {
    const { readPackageManifest } = require('./manifest.cjs');
    const pkgManifest = readPackageManifest(PACKAGE_ROOT);
    if (pkgManifest && pkgManifest.agents instanceof Set && pkgManifest.actions instanceof Set) {
      // Tolerate ~10% loss vs source — global precedence, .local.md
      // overrides, and intentionally-skipped sidebar stubs all reduce the
      // count without indicating a failure.
      const tolerate = (n) => Math.max(1, Math.floor(n * 0.9));
      expected.agents = tolerate(pkgManifest.agents.size);
      expected.skills = tolerate(pkgManifest.actions.size);
      // Commands count comes from rcode/commands/. No bundled enumerator
      // exists; reuse the agents threshold as a proxy floor.
      const commandsDir = path.join(PACKAGE_ROOT, 'rcode', 'commands');
      if (fs.existsSync(commandsDir)) {
        const cmdCount = fs.readdirSync(commandsDir).filter(f => f.endsWith('.md') && !f.startsWith('_')).length;
        expected.commands = tolerate(cmdCount);
      }
    }
  } catch { /* keep hardcoded fallback */ }

  function check(label, fn) {
    try {
      const out = fn();
      console.log(`    ${ok(label)}${out ? dim(' — ' + out) : ''}`);
    } catch (err) {
      fails += 1;
      console.log(`    ${fail(label)} ${pc.red('—')} ${String(err.message || err).slice(0, 120)}`);
    }
  }

  check('rcode-tools.cjs runs', () => {
    const toolsPath = path.join(target, '.rcode', 'bin', 'rcode-tools.cjs');
    if (!fs.existsSync(toolsPath)) throw new Error('bin/rcode-tools.cjs not installed');
    execFileSync('node', ['-c', toolsPath], { stdio: 'pipe' });
    return 'syntax ok';
  });

  check('.rcode/config.yaml present', () => {
    const p = path.join(target, '.rcode', 'config.yaml');
    if (!fs.existsSync(p)) throw new Error('missing');
    const text = fs.readFileSync(p, 'utf8');
    if (!/user_name:|project_name:/.test(text)) throw new Error('config.yaml incomplete');
    return `${fs.statSync(p).size} bytes`;
  });

  check('.rcode/state.json parses', () => {
    const p = path.join(target, '.rcode', 'state.json');
    if (!fs.existsSync(p)) throw new Error('missing');
    JSON.parse(fs.readFileSync(p, 'utf8'));
    return 'valid JSON';
  });

  check('agents installed', () => {
    if ((counts.agentCount || 0) < expected.agents) {
      throw new Error(`only ${counts.agentCount} agents (expected ≥ ${expected.agents})`);
    }
    return `${counts.agentCount}`;
  });

  check('skills + commands installed', () => {
    // When a global install exists, dedup deliberately removes the project's
    // copies — the commands resolve from ~/.claude/ instead. Counting only the
    // project then reports "install may be broken" on a perfectly correct
    // install, which is a false alarm that teaches users to ignore this check.
    // Count what the user can actually reach: project + global.
    const globalCount = (dir) => {
      try { return fs.readdirSync(dir).filter((f) => f.startsWith('rcode-')).length; }
      catch { return 0; }
    };
    const reachableCommands = (counts.commandCount || 0)
      + globalCount(path.join(homedir(), '.claude', 'commands'));
    const reachableSkills = (counts.skillsInstalled || 0)
      + globalCount(path.join(homedir(), '.claude', 'skills'));

    const issues = [];
    if (reachableSkills < expected.skills) issues.push(`${reachableSkills} skills reachable (expected ≥ ${expected.skills})`);
    if (reachableCommands < expected.commands) issues.push(`${reachableCommands} commands reachable (expected ≥ ${expected.commands})`);
    if (issues.length) throw new Error(`low count: ${issues.join(', ')}`);
    return `${counts.skillsInstalled} skills + ${counts.commandCount} commands`;
  });

  if (fails > 0) {
    console.log('');
    console.log('  ' + fail(`${fails} health check${fails === 1 ? '' : 's'} failed — install may be broken.`));
    console.log(dim('     Debug: node .rcode/bin/rcode-tools.cjs state read && ls -la .rcode/'));
    console.log(dim('     Reinstall: rcode install . --force'));
    console.log('');
    return false;
  }
  console.log('');
  return true;
}

module.exports = {
  createInstallBackup,
  verifyPnpmAddDevDep,
  runInstallHealthCheck,
};
