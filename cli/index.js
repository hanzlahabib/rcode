#!/usr/bin/env node
/**
 * Rihal Code CLI
 *
 * Usage:
 *   npx @hanzlahabib/rihal-code init          → scaffold .rihal/ in current project
 *   npx @hanzlahabib/rihal-code dashboard     → start the Diwan view-only dashboard
 *   npx @hanzlahabib/rihal-code serve         → alias for dashboard
 *   npx @hanzlahabib/rihal-code digest        → print compact agent digests
 *   npx @hanzlahabib/rihal-code team          → list the team roster
 *   npx @hanzlahabib/rihal-code doctor        → compliance check
 *   npx @hanzlahabib/rihal-code version       → print version
 *   npx @hanzlahabib/rihal-code help          → this message
 */

const path = require('path');
const fs = require('fs');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));

const COMMANDS = {
  install: require('./init'),  // primary command (BMAD-style)
  init: require('./init'),     // backward-compat alias
  update: require('./update'),
  uninstall: require('./uninstall'),
  remove: require('./uninstall'),  // alias
  dashboard: require('./dashboard'),
  serve: require('./dashboard'),
  digest: require('./digest'),
  team: require('./team'),
  doctor: require('./doctor'),
  'set-profile': require('./set-profile'),
  'set-mode': require('./set-mode'),
  config: require('./config'),
  context: require('./context'),
  sprint: require('./sprint'),
  milestone: require('./milestone'),
  bug: require('./bug'),
  handoff: require('./handoff'),
  preserve: require('./preserve'),
  session: require('./session'),
  'story-commit': require('./story-commit'),
  'show-model': require('./show-model'),
  'github-sync': require('./github-sync'),
  version: () => console.log(PACKAGE_JSON.version),
  help: printHelp,
};

function printHelp() {
  console.log(`
🕌 Rihal Code v${PACKAGE_JSON.version}
    Context-aware AI team methodology with 18 specialized agents.

Usage:
  npx @hanzlahabib/rihal-code <command>

Commands:
  install        Install Rihal Code into the current project
                 (sets up .rihal/, .claude/skills/, .claude/commands/rihal/,
                 .cursor/rules/, .windsurf/rules/, .antigravity/agents/, AGENTS.md)
  init           Alias for install (backward compatibility)
  update         Refresh skill files while preserving .rihal/ state
                 (backs up to .rihal/backups/update-{ts}.tgz first)
  uninstall      Remove Rihal Code from the current project
                 (asks before deleting .rihal/ state — your project data)
  remove         Alias for uninstall
  dashboard      Start the Diwan view-only dashboard (port 7717)
  serve          Alias for dashboard
  digest         Print compact digests for all agents
  team           List the team roster
  doctor         Run compliance check on skills
  set-profile    Change the model profile (quality | balanced | budget | inherit)
  set-mode       Toggle communication mode (guided | yolo)
  config         Get/set project configuration (project_name, user_name, etc.)
  context        Check memory bank freshness (--check | --refresh | --install-hook)
  sprint         List sprints, show active, activate, or update story status
  milestone      Top-level organizing concept — group phases under shippable units
  bug            Capture/list/resolve mid-sprint bugs (links to active sprint)
  handoff        Read/write/clear the pause-state HANDOFF.json (for slash commands)
  preserve       Add a durable learning to .rihal/context/permanent.md
  session        Save/list/search permanent session logs in .rihal/progress/
  story-commit   Commit files against a story with structured GitHub label trailers
  show-model     Show which model each agent uses in the current profile
  github-sync    Sync .rihal/ phases/epics/stories to GitHub (dry-run default)
  version        Print version
  help           Show this help

Examples:
  cd my-project
  npx @hanzlahabib/rihal-code install       # sets up agents + slash commands
  npx @hanzlahabib/rihal-code dashboard     # view project state in browser

Documentation: https://github.com/hanzlahabib/rihal-code
  `.trim());
}

async function main() {
  const [, , command = 'help', ...args] = process.argv;

  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }

  try {
    await handler(args, { packageRoot: PACKAGE_ROOT, packageJson: PACKAGE_JSON });
  } catch (err) {
    console.error(`Error running '${command}':`, err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  } finally {
    // Release any readline session a prompt helper may have opened so the
    // process can exit naturally instead of hanging on stdin.
    try {
      require('./lib/prompts.cjs').closeSession();
    } catch { /* prompts module may not be loaded */ }
  }
}

main();
