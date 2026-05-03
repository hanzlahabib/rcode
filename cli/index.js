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
  install: require('./install'), // primary unified installer (v2 base + v1 skills)
  init: require('./install'),    // backward-compat alias
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
  'show-model': require('./show-model'),
  'github-sync': require('./github-sync'),
  tiers: require('./tiers'),
  version: () => console.log(PACKAGE_JSON.version),
  help: printHelp,
};

function printHelp() {
  console.log(`
🕌 Rihal Code v${PACKAGE_JSON.version}
    Context-aware AI team methodology. See tiers: \`rihal-code tiers\`

Usage:
  rcode <command>

📦 PROJECT
  install        Install Rihal Code into the current project
                 (sets up .rihal/, .claude/skills/, .claude/commands/,
                 .cursor/rules/, .windsurf/rules/, .antigravity/agents/, AGENTS.md)
  init           Alias for install
  update         Refresh skill files (backs up .rihal/ state first)
  uninstall      Remove Rihal Code from the current project
  remove         Alias for uninstall
  config         Get/set project configuration (project_name, user_name, etc.)
  context        Memory bank freshness (--check | --refresh | --install-hook)
  github-sync    Sync .rihal/ phases/epics/stories to GitHub (dry-run default)

👥 TEAM
  team           List the team roster
  digest         Print compact digests for all agents
  show-model     Show which model each agent uses in the current profile
  dashboard      Start the Diwan view-only dashboard (port 7717)
  serve          Alias for dashboard

⚙️  META
  tiers          Show Starter / Advanced / Ultra / Standards tier map
  doctor         Run compliance check on skills
  set-profile    Change model profile (quality | balanced | budget | inherit)
  set-mode       Toggle communication mode (guided | yolo)
  version        Print version
  help           Show this help

Getting started:
  cd my-project
  rcode install      # set up agents + slash commands
  rcode tiers        # see the Golden Path
  rcode set-profile  # choose model profile (quality | balanced | budget)

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
