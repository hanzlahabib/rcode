/**
 * rcode migrate-namespace — clean up legacy rihal-* skills/commands whose
 * rcode-* twin already exists (#954), plus unprefixed/cross-scope command
 * duplicates. Backs everything up under ~/.claude/.rcode-backup/<ts>/
 * before removing. Idempotent — running twice removes nothing the second
 * time.
 *
 * Default is dry-run (prints what WOULD be removed). Pass --yes to execute.
 * `rcode update` also runs this automatically after refreshing files.
 */

const path = require('path');
const { homedir } = require('./lib/homedir.cjs');
const { scanNamespaceDuplication, migrateNamespace } = require('./lib/namespace-migrate.cjs');

function parseArgs(args) {
  return { yes: args.includes('--yes') || args.includes('-y') };
}

function printScanSummary(scan) {
  console.log(`\n🕌 rcode — Namespace Migration\n`);
  if (scan.totalCount === 0) {
    console.log(`   ✓ No legacy rihal-* or duplicate command registrations found.\n`);
    return;
  }
  console.log(`   Found ${scan.totalCount} artifact(s) to migrate:`);
  console.log(`     legacy rihal-* skills:   ${scan.legacySkillCount}`);
  console.log(`     legacy rihal-* commands: ${scan.legacyCommandCount}`);
  console.log(`     legacy rihal-* agents:   ${scan.legacyAgentCount}`);
  console.log(`     unprefixed dupes:        ${scan.unprefixedCount}`);
  console.log(`     cross-scope dupes:       ${scan.crossScopeCount}  (global copy shadowed by project)`);
  console.log(`     legacy Codex commands:   ${scan.legacyCodexCommandCount}  (~/.rcode/slash-commands/)`);
  console.log();
}

module.exports = function migrateNamespaceCommand(args = []) {
  const opts = parseArgs(args);
  const cwd = process.cwd();
  const home = homedir();

  const scan = scanNamespaceDuplication(cwd, home);
  printScanSummary(scan);
  if (scan.totalCount === 0) return;

  if (!opts.yes) {
    console.log(`   [DRY RUN] Nothing removed. Pass --yes to back up and remove these files.\n`);
    return;
  }

  const summary = migrateNamespace(cwd, home);
  const total = Object.values(summary.removed).reduce((a, b) => a + b, 0);
  console.log(`   ✓ Removed ${total} artifact(s):`);
  console.log(`     legacy skills:   ${summary.removed.legacySkills}`);
  console.log(`     legacy commands: ${summary.removed.legacyCommands}`);
  console.log(`     legacy agents:   ${summary.removed.legacyAgents}`);
  console.log(`     unprefixed:      ${summary.removed.unprefixedDupes}`);
  console.log(`     cross-scope:     ${summary.removed.crossScopeDupes}`);
  console.log(`     codex commands:  ${summary.removed.legacyCodexCommands}`);
  if (summary.backupDir) {
    console.log(`   💾 backup: ${path.relative(home, summary.backupDir)} (under ~/.claude/.rcode-backup/)`);
  }
  console.log();
};

module.exports.parseArgs = parseArgs;
