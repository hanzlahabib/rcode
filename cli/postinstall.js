/**
 * rihal-code postinstall hook — runs automatically after `npm install -g`
 *
 * Auto-installs commands, skills, workflows, and bin tools into the global
 * Claude Code directory (~/.claude/) so every project can use rihal immediately
 * without needing a per-project `rcode install` run.
 *
 * Artifacts (.planning/, STATE.md, ROADMAP.md) are always created in the
 * project CWD at runtime — the global install only ships read-only tooling.
 */

'use strict';
const os = require('os');
const path = require('path');

// Skip in CI or test environments
if (process.env.CI || process.env.NODE_ENV === 'test') {
  process.exit(0);
}

// Only auto-install when invoked as a global package (npm install -g).
// A local devDependency install should not touch the user's ~/.claude/.
const isGlobalInstall = (() => {
  try {
    // npm sets npm_config_global=true for global installs
    if (process.env.npm_config_global === 'true') return true;
    // pnpm sets npm_config_global too, but check PNPM_HOME as a fallback
    if (process.env.PNPM_HOME && __dirname.startsWith(process.env.PNPM_HOME)) return true;
    // Check if __dirname is inside a known global node_modules path.
    // Covers: /usr/local/lib, /usr/lib, ~/.nvm/.../lib, ~/.pnpm/..., ~/.yarn/...
    const globalPatterns = [
      /\/node_modules\/@hanzlaa\/rcode/,  // any global node_modules
      /[/\\]lib[/\\]node_modules[/\\]/,   // /usr/local/lib/node_modules
      /\.nvm[/\\]versions[/\\]/,           // nvm
      /\.pnpm[/\\]/,                       // pnpm global store
      /\.yarn[/\\]global/,                 // yarn global
    ];
    if (globalPatterns.some((re) => re.test(__dirname))) return true;
    // Last resort: package is NOT inside a project's local node_modules
    // (local installs have .../project/node_modules/@hanzlaa/rcode/cli)
    const localNodeModules = path.join(process.cwd(), 'node_modules');
    if (!__dirname.startsWith(localNodeModules)) return true;
    return false;
  } catch {
    return false;
  }
})();

const globalTarget = path.join(os.homedir(), '.claude');

if (isGlobalInstall) {
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
      console.log(`\n✓ Rihal commands + skills installed globally → ${globalTarget}`);
      console.log('  All /rihal-* commands are now available in every project.\n');
    } else {
      console.warn(`\n⚠ Global auto-install exited with code ${code}. Run 'rcode install' manually if needed.\n`);
    }
    printWelcome();
  });
  child.on('error', (err) => {
    console.warn(`\n⚠ Global auto-install failed: ${err.message}`);
    console.warn('  Run "rcode install" manually to set up rihal commands.\n');
    printWelcome();
  });
} else {
  printWelcome();
}

function printWelcome() {
  console.log(`
🕌 Rihal Code installed.

Commands are available globally in every Claude Code project.
To set up per-project state + planning structure, run inside your project:

  rcode install      # creates .rihal/config.yaml, .planning/, STATE.md

🌱 The Golden Path (say these phrases in your AI IDE):
  1. "scaffold a new project"     → rihal-scaffold-project
  2. "create a PRD"               → rihal-create-prd
  3. "create a story"             → rihal-create-story
  4. "plan a sprint"              → rihal-sprint-planning
  5. "dev this story"             → rihal-dev-story
  6. "review this code"           → rihal-code-review
  7. "sprint status"              → rihal-sprint-status

More:
  rcode help         # all commands (grouped)
  rcode dashboard    # view-only Diwan on :7717

Docs: https://github.com/hanzlahabib/rihal-code
`);
}
