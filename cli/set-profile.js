/**
 * rihal-code set-profile — change the model profile for the current project
 *
 * Usage:
 *   npx @hanzlahabib/rihal-code set-profile balanced
 *   npx @hanzlahabib/rihal-code set-profile quality
 *   npx @hanzlahabib/rihal-code set-profile budget
 *   npx @hanzlahabib/rihal-code set-profile inherit
 *   npx @hanzlahabib/rihal-code set-profile                  # interactive
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
const { writeJsonAtomic } = require('./lib/fsutil.cjs');

/**
 * Return the closest candidate to `input` from `candidates` when the edit
 * distance is small enough to likely be a typo. Returns null otherwise.
 * Small inline Levenshtein — zero deps, good enough for a 4-entry list.
 */
function suggestClosest(input, candidates) {
  const lower = input.toLowerCase();
  let best = null;
  let bestDistance = Infinity;
  for (const c of candidates) {
    const d = levenshtein(lower, c.toLowerCase());
    if (d < bestDistance) {
      bestDistance = d;
      best = c;
    }
  }
  // Only suggest if the typo is plausible (threshold scales with word length)
  const threshold = Math.max(1, Math.floor(input.length / 3));
  return bestDistance <= threshold ? best : null;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,      // insertion
        prev[j] + 1,          // deletion
        prev[j - 1] + cost,   // substitution
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

module.exports = function setProfile(args) {
  const cwd = process.cwd();
  const rihalDir = path.join(cwd, '.rihal');
  const configPath = path.join(rihalDir, 'config.json');

  if (!fs.existsSync(rihalDir)) {
    console.error(`❌ No .rihal/ directory found in ${cwd}`);
    console.error(`   Run 'npx @hanzlahabib/rihal-code init' first.`);
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
    console.log(`\nUsage: npx @hanzlahabib/rihal-code set-profile <name>`);
    return;
  }

  if (!available.includes(requested)) {
    console.error(`❌ Unknown profile '${requested}'`);
    const suggestion = suggestClosest(requested, available);
    if (suggestion) {
      console.error(`   Did you mean '${suggestion}'?`);
    }
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
  writeJsonAtomic(configPath, config);

  console.log(`\n✅ Profile changed: ${previous} → ${requested}\n`);

  // Show the new resolved map
  const map = getResolvedMapForProfile(requested);
  console.log(formatMapAsTable(map));
  console.log();
};
