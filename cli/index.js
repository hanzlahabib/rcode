#!/usr/bin/env node
/**
 * rcode CLI
 *
 * Usage:
 *   npx @hanzlaa/rcode init          → scaffold .rcode/ in current project
 *   npx @hanzlaa/rcode dashboard     → start the Diwan view-only dashboard
 *   npx @hanzlaa/rcode serve         → alias for dashboard
 *   npx @hanzlaa/rcode digest        → print compact agent digests
 *   npx @hanzlaa/rcode team          → list the team roster
 *   npx @hanzlaa/rcode agent <name>    → launch a specialist agent directly
 *   npx @hanzlaa/rcode doctor        → compliance check
 *   npx @hanzlaa/rcode version       → print version
 *   npx @hanzlaa/rcode help          → this message
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
  agent: require('./agent'),
  doctor: require('./doctor'),
  workflow: require('./workflow'),  // lifecycle bridge for non-Claude runtimes
  // Thin lifecycle aliases — delegate to workflow show <name> (#883)
  plan:    (args, ctx) => lifecycleAlias('plan',           args, ctx),
  execute: (args, ctx) => lifecycleAlias('execute-sprint', args, ctx),
  ship:    (args, ctx) => lifecycleAlias('ship',           args, ctx),
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
🕌 rcode v${PACKAGE_JSON.version}
    Context-aware AI team methodology. See tiers: \`rcode tiers\`

Usage:
  rcode <command>

📦 PROJECT
  install        Install rcode into the current project
                 (sets up .rcode/, .claude/skills/, .claude/commands/,
                 .cursor/rules/, .windsurf/rules/, .antigravity/agents/, AGENTS.md)
  init           Alias for install
  update         Refresh skill files (backs up .rcode/ state first)
  uninstall      Remove rcode from the current project
                 --yes      Skip confirmation prompts
                 --purge    Remove everything: .rcode/ state, .planning/ scaffolds,
                            .claude/agents/rules/, .cursor/ rcode files,
                            .gitignore block, and .git/hooks/pre-commit
  remove         Alias for uninstall
  nuke           Wipe ALL rcode/rcode installs everywhere (global packages,
                 binaries, ~/.claude/* rcode artifacts, ~/.rcode/, project artifacts)
                 Default = dry-run. Pass --yes to remove. Pass --include-planning
                 to also remove .planning/ in CWD.
  config         Get/set project configuration (project_name, user_name, etc.)
  context        Memory bank freshness (--check | --refresh | --install-hook)
  github-sync    Sync .rcode/ phases/epics/stories to GitHub (dry-run default)

🔄 LIFECYCLE (Codex / Copilot / Grok bridge)
  plan                         Print the plan workflow (alias for workflow show plan)
  execute                      Print the execute-sprint workflow
  ship                         Print the ship workflow
  workflow list                List all lifecycle workflow names
  workflow show <name>         Print a workflow's full instructions to stdout
  workflow show new-project    → project setup + ROADMAP
  workflow show create-prd     → write / update the PRD
  workflow show discuss-phase  → gather phase context
  workflow show plan           → create a SPRINT plan
  workflow show execute-sprint → execute a SPRINT
  workflow show verify-phase   → verify phase completion
  workflow show retrospective  → retrospective + velocity
  workflow show ship           → deploy / release workflow

  Non-Claude agents: pipe to your agent instead of using slash commands.
  Example: rcode plan | codex run -
  Example: rcode workflow show plan | codex run -

👥 TEAM
  team           List the team roster
  digest         Print compact digests for all agents
  agent <name>   Launch a specialist agent directly (bypasses orchestration)
                 rcode agent --list   to see available agents
  show-model     Show which model each agent uses in the current profile
  dashboard      Start the Diwan view-only dashboard (port 7717)
                 Starts a view-only dashboard at http://localhost:7717. No write access.
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

Documentation: https://github.com/hanzlahabib/rcode
  `.trim());
}

/**
 * Lifecycle aliases (plan/execute/ship): show the workflow then print actionable
 * next-step guidance so the user knows how to actually run it.
 */
function lifecycleAlias(workflowName, args, ctx) {
  require('./workflow')(['show', workflowName, ...args], ctx);

  const hasAuto = args.includes('--auto') || args.includes('--run');

  console.log('\n─────────────────────────────────────────────');
  console.log(`▶ To run: paste the above into Claude Code as  /${workflowName === 'execute-sprint' ? 'rcode-execute-sprint' : `rcode-${workflowName}`}`);
  console.log('  or pipe it directly:  rcode ' + (workflowName === 'execute-sprint' ? 'execute' : workflowName) + ' | cld --model sonnet');

  if (hasAuto) {
    console.log('\n  AUTO mode detected — in Claude Code run:  /rcode-' +
      (workflowName === 'execute-sprint' ? 'execute-sprint' : workflowName) +
      ' --auto  (applies yolo defaults, skips confirmation prompts)');
  }
}

/**
 * npm 10+ suppresses postinstall script output during global installs, so users
 * who run `npm install -g @hanzlaa/rcode` see only "added 1 package" with no
 * confirmation that 100+ commands and skills were installed. We detect a fresh
 * install on the first `rcode <anything>` invocation by checking for a marker
 * file under ~/.rcode/, print a one-time welcome banner, then drop the marker.
 */
function maybeShowFirstRunBanner() {
  const os = require('os');
  const home = os.homedir();
  const markerDir = path.join(home, '.rcode');
  const marker = path.join(markerDir, '.welcome-shown');
  if (fs.existsSync(marker)) return;

  // Only show banner if global install actually ran — i.e. ~/.claude/commands/
  // has rcode-*.md files. Otherwise this is a developer running from source.
  const globalCommands = path.join(home, '.claude', 'commands');
  let hasGlobalrcode = false;
  try {
    hasGlobalrcode = fs.existsSync(globalCommands) &&
      fs.readdirSync(globalCommands).some(f => f.startsWith('rcode-') && f.endsWith('.md'));
  } catch { /* unreadable */ }
  if (!hasGlobalrcode) return;

  console.log(`\n🕌 rcode v${PACKAGE_JSON.version} — first run detected.\n`);
  console.log(`   ✓ ${countGlobalRcode(globalCommands)} slash commands installed → ~/.claude/commands/`);
  console.log(`   ✓ All /rcode-* commands available in every Claude Code project.`);
  console.log(`\n   To set up a project:  cd my-project && rcode install`);
  console.log(`   Show all commands:    rcode help`);
  console.log(`   Diagnose issues:      rcode doctor\n`);

  try {
    fs.mkdirSync(markerDir, { recursive: true });
    fs.writeFileSync(marker, `installed ${PACKAGE_JSON.version} at ${new Date().toISOString()}\n`);
  } catch { /* if we can't write the marker, banner shows again next time — annoying but not broken */ }
}

function countGlobalRcode(dir) {
  try {
    return fs.readdirSync(dir).filter(f => f.startsWith('rcode-') && f.endsWith('.md')).length;
  } catch { return 0; }
}

async function main() {
  let [, , command = 'help', ...args] = process.argv;

  // Normalise flag aliases → bare-word commands
  if (command === '--help' || command === '-h') command = 'help';
  if (command === '--version' || command === '-v') command = 'version';

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
