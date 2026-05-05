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
  nuke: require('./nuke'),         // full cleanup across all package managers + global state
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
  nuke           Wipe ALL rihal/rcode installs everywhere (global packages,
                 binaries, ~/.claude/* rihal artifacts, ~/.rihal/, project artifacts)
                 Default = dry-run. Pass --yes to remove. Pass --include-planning
                 to also remove .planning/ in CWD.
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

/**
 * npm 10+ suppresses postinstall script output during global installs, so users
 * who run `npm install -g @hanzlaa/rcode` see only "added 1 package" with no
 * confirmation that 100+ commands and skills were installed. We detect a fresh
 * install on the first `rcode <anything>` invocation by checking for a marker
 * file under ~/.rihal/, print a one-time welcome banner, then drop the marker.
 */
function maybeShowFirstRunBanner() {
  const os = require('os');
  const home = os.homedir();
  const markerDir = path.join(home, '.rihal');
  const marker = path.join(markerDir, '.welcome-shown');
  if (fs.existsSync(marker)) return;

  // Only show banner if global install actually ran — i.e. ~/.claude/commands/
  // has rihal-*.md files. Otherwise this is a developer running from source.
  const globalCommands = path.join(home, '.claude', 'commands');
  let hasGlobalRihal = false;
  try {
    hasGlobalRihal = fs.existsSync(globalCommands) &&
      fs.readdirSync(globalCommands).some(f => f.startsWith('rihal-') && f.endsWith('.md'));
  } catch { /* unreadable */ }
  if (!hasGlobalRihal) return;

  console.log(`\n🕌 Rihal Code v${PACKAGE_JSON.version} — first run detected.\n`);
  console.log(`   ✓ ${countGlobalRihal(globalCommands)} slash commands installed → ~/.claude/commands/`);
  console.log(`   ✓ All /rihal-* commands available in every Claude Code project.`);
  console.log(`\n   To set up a project:  cd my-project && rcode install`);
  console.log(`   Show all commands:    rcode help`);
  console.log(`   Diagnose issues:      rcode doctor\n`);

  try {
    fs.mkdirSync(markerDir, { recursive: true });
    fs.writeFileSync(marker, `installed ${PACKAGE_JSON.version} at ${new Date().toISOString()}\n`);
  } catch { /* if we can't write the marker, banner shows again next time — annoying but not broken */ }
}

function countGlobalRihal(dir) {
  try {
    return fs.readdirSync(dir).filter(f => f.startsWith('rihal-') && f.endsWith('.md')).length;
  } catch { return 0; }
}

async function main() {
  const [, , command = 'help', ...args] = process.argv;

  // Show first-run banner before dispatching — npm hides postinstall output,
  // so this is the user's first visible confirmation that the install worked.
  maybeShowFirstRunBanner();

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
