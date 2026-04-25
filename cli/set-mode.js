/**
 * rihal-code set-mode — toggle the communication mode.
 *
 * Thin wrapper over `rihal-code config communication_mode <value>` with
 * inline explanations of what each mode changes. Supports the same
 * typo suggestions as the underlying config setter.
 *
 * Usage:
 *   rihal-code set-mode                show current mode + explanation
 *   rihal-code set-mode guided         switch to guided (ask at gates)
 *   rihal-code set-mode yolo           switch to yolo (skip menus, trust defaults)
 *
 * Affects:
 *   - Workflow step files ("halt at menu" vs "pick default and continue")
 *   - /rihal:kickoff next-step menu (interactive vs auto-continue)
 *   - github-sync confirmation prompts (yolo still requires --force-yolo
 *     for github mutations — see docs/adr/0001-github-sync-as-cli.md)
 *   - /rihal:pause and /rihal:resume (yolo skips the confirmation prompt
 *     on resume; guided always asks)
 *   - All agent skill files that read communication_mode from config
 */

const fs = require('fs');
const path = require('path');
const {
  loadConfig,
  setConfigValue,
  VALID_COMMUNICATION_MODES,
} = require('./lib/config.cjs');

const MODE_DESCRIPTIONS = {
  guided:
    'Ask questions, confirm at every major gate, halt at decision menus.\n' +
    '     Recommended for: first-time use, critical projects, new domains.',
  yolo:
    'Skip menus, use sensible defaults, report decisions in the final summary.\n' +
    '     Destructive ops (github push, rm, force-push) STILL require\n' +
    '     explicit confirmation unless you also pass --force-yolo.\n' +
    '     Recommended for: experienced solo projects, prototypes, CI.',
};

module.exports = function setMode(args) {
  const cwd = process.cwd();
  const rihalDir = path.join(cwd, '.rihal');

  if (!fs.existsSync(rihalDir)) {
    console.error(`❌ No .rihal/ directory found in ${cwd}`);
    console.error(`   Run 'rcode install' first.`);
    process.exit(1);
  }

  const requested = args[0];

  if (!requested) {
    // Show current + available modes
    const config = loadConfig(cwd);
    const current = config.communication_mode || 'guided';
    console.log(`\n🕌 Communication mode: ${current}\n`);
    for (const mode of VALID_COMMUNICATION_MODES) {
      const marker = mode === current ? ' ← current' : '';
      console.log(`  • ${mode}${marker}`);
      console.log(`     ${MODE_DESCRIPTIONS[mode]}`);
      console.log();
    }
    console.log(`Usage: rcode set-mode <${[...VALID_COMMUNICATION_MODES].join('|')}>`);
    console.log();
    return;
  }

  // Delegate to the shared config setter — it handles validation,
  // typo suggestions, and atomic writes.
  const previous = loadConfig(cwd).communication_mode || 'guided';
  const result = setConfigValue(cwd, 'communication_mode', requested);
  if (!result.ok) {
    console.error(`\n❌ ${result.error}`);
    if (result.suggestion) {
      console.error(`   Did you mean '${result.suggestion}'?`);
    }
    console.error();
    process.exit(1);
  }

  console.log(`\n✅ Communication mode: ${previous} → ${requested}`);
  console.log();
  console.log(`   ${MODE_DESCRIPTIONS[requested]}`);
  console.log();

  if (requested === 'yolo') {
    console.log(`   ⚠ Note: destructive operations (github-sync, uninstall,`);
    console.log(`     force push) still require explicit confirmation unless`);
    console.log(`     --force-yolo / --yes is passed.`);
    console.log();
  }
};
