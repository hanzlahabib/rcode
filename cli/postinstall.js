/**
 * rcode postinstall hook — runs automatically after `npm install -g`
 *
 * Auto-installs commands, skills, workflows, and bin tools into the global
 * Claude Code directory (~/.claude/) so every project can use rcode immediately
 * without needing a per-project `rcode install` run.
 *
 * Artifacts (.planning/, STATE.md, ROADMAP.md) are always created in the
 * project CWD at runtime — the global install only ships read-only tooling.
 */

'use strict';
const os = require('os');
const path = require('path');

/**
 * Decide whether the current postinstall invocation represents a GLOBAL
 * `npm install -g @hanzlaa/rcode` (true) or a transitive devDep install
 * inside someone's project (false).
 *
 * Pure function — takes its inputs explicitly so tests can drive every
 * branch without needing to mutate process.env / __dirname / process.cwd.
 *
 * @param {object} env  process.env-like
 * @param {string} dirname  __dirname of the postinstall script
 * @param {string} cwd  process.cwd() at invocation time
 */
function isGlobalInstall(env, dirname, cwd) {
  try {
    if (env.npm_config_global === 'true') return true;
    if (env.PNPM_HOME && dirname.startsWith(env.PNPM_HOME)) return true;
    const globalPatterns = [
      /\/node_modules\/@hanzlaa\/rcode/,
      /[/\\]lib[/\\]node_modules[/\\]/,
      /\.nvm[/\\]versions[/\\]/,
      /\.pnpm[/\\]/,
      /\.yarn[/\\]global/,
    ];
    if (globalPatterns.some((re) => re.test(dirname))) return true;
    const localNodeModules = path.join(cwd, 'node_modules');
    if (!dirname.startsWith(localNodeModules)) return true;
    return false;
  } catch {
    return false;
  }
}

// Skip in CI or test environments. Tests that import this module bypass
// the top-level effect by checking require.main !== module.
if (require.main === module) {
  if (process.env.CI || process.env.NODE_ENV === 'test') {
    process.exit(0);
  }
  runPostInstall();
}

function runPostInstall() {

const globalTarget = path.join(os.homedir(), '.claude');

if (isGlobalInstall(process.env, __dirname, process.cwd())) {
  // Spawn dist/rcode.js (fully bundled — no devDep requires) to do the global
  // install. Calling cli/install.js directly fails in global npm installs because
  // devDependencies (picocolors, semver, etc.) are not installed for global packages.
  const { spawn } = require('child_process');
  const distCli = path.join(__dirname, '..', 'dist', 'rcode.js');
  const child = spawn(process.execPath, [distCli, 'install', '--global', '--yes', '--no-prompt'], {
    stdio: 'inherit',
    env: { ...process.env },
  });
  child.on('close', (code) => {
    if (code === 0) {
      // #662 — npm 10+ hides postinstall stdout by default. Emit to stderr
      // (npm shows it) AND write a receipt file rcode doctor/version can
      // surface later for users who never saw the original line.
      const receiptLine = `✓ rcode installed → ${globalTarget}  (run 'rcode install' in a project to configure)`;
      process.stderr.write('\n' + receiptLine + '\n');
      process.stderr.write('  All /rcode-* commands are now available in every project.\n\n');
      try {
        const fs = require('fs');
        const receiptPath = path.join(globalTarget, '.rcode-install-receipt');
        const receipt = {
          ts: new Date().toISOString(),
          target: globalTarget,
          source: 'postinstall',
          message: receiptLine,
        };
        fs.mkdirSync(globalTarget, { recursive: true });
        fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
      } catch (_) { /* receipt is best-effort, never fail postinstall */ }
    } else {
      process.stderr.write(`\n⚠ Global auto-install exited with code ${code}. Run 'rcode install' manually if needed.\n\n`);
    }
    printWelcome();
  });
  child.on('error', (err) => {
    console.warn(`\n⚠ Global auto-install failed: ${err.message}`);
    console.warn('  Run "rcode install" manually to set up rcode commands.\n');
    printWelcome();
  });
} else {
  printWelcome();
}

function printWelcome() {
  console.log(`
🕌 rcode installed.

Commands are available globally in every Claude Code project.
To set up per-project state + planning structure, run inside your project:

  rcode install      # creates .rcode/config.yaml, .planning/, STATE.md

🌱 The Golden Path (say these phrases in your AI IDE):
  1. "scaffold a new project"     → rcode-scaffold-project
  2. "create a PRD"               → rcode-create-prd
  3. "create a story"             → rcode-create-story
  4. "plan a sprint"              → rcode-sprint-planning
  5. "dev this story"             → rcode-dev-story
  6. "review this code"           → rcode-review
  7. "sprint status"              → rcode-sprint-status

More:
  rcode help         # all commands (grouped)
  rcode dashboard    # view-only Diwan on :7717

Docs: https://github.com/hanzlahabib/rihal-code
`);
}

} // end runPostInstall

module.exports = { isGlobalInstall };
