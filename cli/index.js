#!/usr/bin/env node
/**
 * Rihal Method CLI
 *
 * Usage:
 *   npx @hanzlahabib/rihal-method init          → scaffold .rihal/ in current project
 *   npx @hanzlahabib/rihal-method dashboard     → start the Diwan view-only dashboard
 *   npx @hanzlahabib/rihal-method serve         → alias for dashboard
 *   npx @hanzlahabib/rihal-method digest        → print compact agent digests
 *   npx @hanzlahabib/rihal-method team          → list the team roster
 *   npx @hanzlahabib/rihal-method doctor        → compliance check
 *   npx @hanzlahabib/rihal-method version       → print version
 *   npx @hanzlahabib/rihal-method help          → this message
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
  version: () => console.log(PACKAGE_JSON.version),
  help: printHelp,
};

function printHelp() {
  console.log(`
🕌 Rihal Method v${PACKAGE_JSON.version}
    Context-aware AI team methodology with 18 specialized agents.

Usage:
  npx @hanzlahabib/rihal-method <command>

Commands:
  init           Scaffold .rihal/ directory in your current project
  dashboard      Start the Diwan view-only dashboard (port 7717)
  serve          Alias for dashboard
  digest         Print compact digests for all agents
  team           List the team roster
  doctor         Run compliance check on skills
  set-profile    Change the model profile (quality | balanced | budget | inherit)
  show-model     Show which model each agent uses in the current profile
  version        Print version
  help           Show this help

Examples:
  cd my-project
  npx @hanzlahabib/rihal-method init         # sets up .rihal/ with templates
  npx @hanzlahabib/rihal-method dashboard    # view project state in browser

Documentation: https://github.com/hanzlahabib/rihal-method
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
