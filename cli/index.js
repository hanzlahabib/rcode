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
  init: require('./init'),
  dashboard: require('./dashboard'),
  serve: require('./dashboard'),
  digest: require('./digest'),
  team: require('./team'),
  doctor: require('./doctor'),
  'set-profile': require('./set-profile'),
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
  init           Scaffold .rihal/ directory in your current project
  dashboard      Start the Diwan view-only dashboard (port 7717)
  serve          Alias for dashboard
  digest         Print compact digests for all agents
  team           List the team roster
  doctor         Run compliance check on skills
  set-profile    Change the model profile (quality | balanced | budget | inherit)
  show-model     Show which model each agent uses in the current profile
  github-sync    Sync .rihal/ phases/epics/stories to GitHub (dry-run default)
  version        Print version
  help           Show this help

Examples:
  cd my-project
  npx @hanzlahabib/rihal-code init         # sets up .rihal/ with templates
  npx @hanzlahabib/rihal-code dashboard    # view project state in browser

Documentation: https://github.com/hanzlahabib/rihal-code
  `.trim());
}

function main() {
  const [, , command = 'help', ...args] = process.argv;

  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }

  try {
    handler(args, { packageRoot: PACKAGE_ROOT, packageJson: PACKAGE_JSON });
  } catch (err) {
    console.error(`Error running '${command}':`, err.message);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

main();
