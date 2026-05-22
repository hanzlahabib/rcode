/**
 * rcode set-profile — change the model profile for the current project
 *
 * Usage:
 *   npx @hanzlaa/rcode set-profile balanced
 *   npx @hanzlaa/rcode set-profile quality
 *   npx @hanzlaa/rcode set-profile budget
 *   npx @hanzlaa/rcode set-profile inherit
 *   npx @hanzlaa/rcode set-profile                  # show current
 *
 * This is a thin wrapper over `rcode config model_profile <name>`.
 * All config read/write goes through cli/lib/config.cjs, which handles
 * atomic writes, allowlist validation, and typo suggestions.
 */

const fs = require('fs');
const path = require('path');
const {
  listProfiles,
  getProfile,
  getResolvedMapForProfile,
  formatMapAsTable,
  getProjectProfile,
} = require('./lib/model-profiles.cjs');
const { setConfigValue, getConfigValue } = require('./lib/config.cjs');

module.exports = function setProfile(args) {
  const cwd = process.cwd();
  const rcodeDir = path.join(cwd, '.rcode');

  if (!fs.existsSync(rcodeDir)) {
    console.error(`❌ No .rcode/ directory found in ${cwd}`);
    console.error(`   Run 'rcode install' first.`);
    process.exit(1);
  }

  const requested = args[0];
  const available = listProfiles();

  if (!requested) {
    // Show current profile + available options
    const current = getProjectProfile(cwd);
    console.log(`\n🕌 Current profile: ${current.profile}\n`);
    if (Object.keys(current.overrides).length > 0) {
      console.log(`   Overrides:`);
      for (const [agent, model] of Object.entries(current.overrides)) {
        console.log(`     ${agent} → ${model}`);
      }
      console.log();
    }
    console.log(`Available profiles:`);
    for (const name of available) {
      const p = getProfile(name);
      const marker = name === current.profile ? ' ← current' : '';
      console.log(`  • ${name}${marker}`);
      console.log(`    ${p.description}`);
    }
    console.log(`\nUsage: rcode set-profile <name>`);
    return;
  }

  const previous = getConfigValue(cwd, 'model_profile') || '(default)';

  const result = setConfigValue(cwd, 'model_profile', requested);
  if (!result.ok) {
    console.error(`❌ ${result.error}`);
    if (result.suggestion) {
      console.error(`   Did you mean '${result.suggestion}'?`);
    }
    console.error(`   Available: ${available.join(', ')}`);
    process.exit(1);
  }

  console.log(`\n✅ Profile changed: ${previous} → ${requested}\n`);

  // Show the new resolved map
  const map = getResolvedMapForProfile(requested);
  console.log(formatMapAsTable(map));
  console.log();
};
