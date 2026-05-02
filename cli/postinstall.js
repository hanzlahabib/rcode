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
    // Fallback: check if the install prefix is a global npm prefix
    const prefix = process.env.npm_config_prefix || '';
    const home = os.homedir();
    if (prefix && !prefix.startsWith(home) && !prefix.includes('node_modules')) return true;
    return false;
  } catch {
    return false;
  }
})();

const globalTarget = path.join(os.homedir(), '.claude');

if (isGlobalInstall) {
  // Run the global install in the background so npm output isn't blocked
  const { install } = require('./install.js');
  install({
    target: globalTarget,
    ides: ['claude'],
    ide: 'claude',
    yes: true,
    noPrompt: true,
    commitPlanning: false,
    global: true,        // signal: skip per-project artifacts (STATE.md, ROADMAP.md, .planning/)
    silent: false,
  }).then((code) => {
    if (code === 0) {
      console.log(`\n✓ Rihal commands + skills installed globally → ${globalTarget}`);
      console.log('  All /rihal-* commands are now available in every project.\n');
    } else {
      console.warn(`\n⚠ Global auto-install exited with code ${code}. Run 'rcode install' manually if needed.\n`);
    }
    printWelcome();
  }).catch((err) => {
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
