/**
 * rihal-method set-profile — change the model profile for the current project
 *
 * Usage:
 *   npx @hanzlahabib/rihal-method set-profile balanced
 *   npx @hanzlahabib/rihal-method set-profile quality
 *   npx @hanzlahabib/rihal-method set-profile budget
 *   npx @hanzlahabib/rihal-method set-profile inherit
 *   npx @hanzlahabib/rihal-method set-profile                  # interactive
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

module.exports = function setProfile(args) {
  const cwd = process.cwd();
  const rihalDir = path.join(cwd, '.rihal');
  const configPath = path.join(rihalDir, 'config.json');

  if (!fs.existsSync(rihalDir)) {
    console.error(`❌ No .rihal/ directory found in ${cwd}`);
    console.error(`   Run 'npx @hanzlahabib/rihal-method init' first.`);
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
    console.log(`\nUsage: npx @hanzlahabib/rihal-method set-profile <name>`);
    return;
  }

  if (!available.includes(requested)) {
    console.error(`❌ Unknown profile '${requested}'`);
    console.error(`   Available: ${available.join(', ')}`);
    process.exit(1);
  }

  // Load or create project config
  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.error(`⚠️  .rihal/config.json is invalid. Overwriting.`);
    }
  }

  const previous = config.model_profile || '(default)';
  config.model_profile = requested;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

  console.log(`\n✅ Profile changed: ${previous} → ${requested}\n`);

  // Show the new resolved map
  const map = getResolvedMapForProfile(requested);
  console.log(formatMapAsTable(map));
  console.log();
};
