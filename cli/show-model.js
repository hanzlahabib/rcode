/**
 * rihal-code show-model — print the resolved model for an agent (or all agents)
 *
 * Usage:
 *   npx @hanzlahabib/rihal-code show-model              # all agents in current profile
 *   npx @hanzlahabib/rihal-code show-model waleed       # single agent
 *   npx @hanzlahabib/rihal-code show-model --profile=quality   # different profile
 */

const {
  listProfiles,
  getProfile,
  resolveModelForAgent,
  getResolvedMapForProfile,
  formatMapAsTable,
  getProjectProfile,
} = require('./lib/model-profiles.cjs');

function parseArgs(args) {
  const result = { agent: null, profile: null };
  for (const arg of args) {
    if (arg.startsWith('--profile=')) {
      result.profile = arg.slice('--profile='.length);
    } else if (arg.startsWith('--agent=')) {
      result.agent = arg.slice('--agent='.length);
    } else if (!arg.startsWith('--')) {
      result.agent = arg;
    }
  }
  return result;
}

module.exports = function showModel(args) {
  const parsed = parseArgs(args);
  const project = getProjectProfile();
  const profile = parsed.profile || project.profile;

  if (!listProfiles().includes(profile)) {
    console.error(`❌ Unknown profile '${profile}'`);
    console.error(`   Available: ${listProfiles().join(', ')}`);
    process.exit(1);
  }

  const profileDef = getProfile(profile);

  if (parsed.agent) {
    // Single agent
    try {
      const model = resolveModelForAgent(parsed.agent, {
        profile,
        overrides: parsed.profile ? {} : project.overrides,
      });
      console.log(`${parsed.agent} (profile: ${profile}) → ${model ?? 'inherit (runtime picks)'}`);
    } catch (e) {
      console.error(`❌ ${e.message}`);
      process.exit(1);
    }
    return;
  }

  // All agents
  console.log(`\n🕌 Profile: ${profile}`);
  console.log(`   ${profileDef.description}\n`);

  const map = getResolvedMapForProfile(profile);

  // Apply project overrides if we're showing the current project profile
  if (!parsed.profile && Object.keys(project.overrides).length > 0) {
    console.log(`   Overrides applied:`);
    for (const [agent, rawModel] of Object.entries(project.overrides)) {
      const resolved = resolveModelForAgent(agent, {
        profile,
        overrides: project.overrides,
      });
      map[agent] = resolved;
      console.log(`     ${agent} → ${rawModel} (resolved: ${resolved ?? 'inherit'})`);
    }
    console.log();
  }

  console.log(formatMapAsTable(map));
};
