/**
 * Rihal Method — Model Profile Resolution Library
 *
 * Inspired by GSD's model-profiles.cjs. Reads model profiles from
 * rihal/config/model-profiles.json and resolves the right model for
 * each agent at dispatch time.
 *
 * Usage:
 *   const { resolveModelForAgent, getProfile, listProfiles } = require('./model-profiles.cjs');
 *
 *   // Resolve model for a single agent
 *   const model = resolveModelForAgent('waleed', {
 *     profile: 'balanced',             // optional — defaults to config
 *     overrides: { waleed: 'opus' },   // optional — per-agent override
 *   });
 *
 *   // Returns: 'claude-opus-4-6' (or 'inherit' or null for runtime-picked)
 */

const fs = require('fs');
const path = require('path');

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const PROFILES_PATH = path.join(PACKAGE_ROOT, 'rihal/config/model-profiles.json');

let _cached = null;

function loadProfiles() {
  if (_cached) return _cached;
  if (!fs.existsSync(PROFILES_PATH)) {
    throw new Error(`Model profiles not found at ${PROFILES_PATH}`);
  }
  _cached = JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8'));
  return _cached;
}

function listProfiles() {
  const data = loadProfiles();
  return Object.keys(data.profiles);
}

function getProfile(profileName) {
  const data = loadProfiles();
  const profile = data.profiles[profileName];
  if (!profile) {
    throw new Error(
      `Unknown profile '${profileName}'. Valid: ${listProfiles().join(', ')}`,
    );
  }
  return profile;
}

function getDefaultProfile() {
  return loadProfiles().default_profile;
}

function getModelAliases() {
  return loadProfiles().model_aliases;
}

/**
 * Resolve the concrete model ID for an agent.
 *
 * Resolution order:
 *   1. explicit `overrides[agent]` wins
 *   2. otherwise look up the agent in the named profile
 *   3. if the result is a tier alias (opus/sonnet/haiku), map via model_aliases
 *   4. if the result is "inherit", return null (runtime picks)
 *   5. otherwise pass through as a fully-qualified model ID
 *
 * @param {string} agent - Agent name (e.g., "waleed")
 * @param {object} opts
 * @param {string} [opts.profile] - Profile name. Defaults to default_profile from config.
 * @param {object} [opts.overrides] - Per-agent overrides `{agent: model}`.
 * @returns {string|null} The concrete model ID, or null for "inherit"
 */
function resolveModelForAgent(agent, opts = {}) {
  const { profile: profileName = getDefaultProfile(), overrides = {} } = opts;

  // Step 1: explicit override wins
  if (overrides[agent]) {
    return resolveValue(overrides[agent]);
  }

  // Step 2: look up agent in profile
  const profile = getProfile(profileName);
  const value = profile.agents[agent];
  if (!value) {
    throw new Error(
      `Agent '${agent}' not mapped in profile '${profileName}'. Check rihal/config/model-profiles.json.`,
    );
  }

  return resolveValue(value);
}

/**
 * Resolve a raw value (alias, "inherit", or full model ID) to a concrete model ID.
 */
function resolveValue(value) {
  if (value === 'inherit') return null; // runtime picks
  const aliases = getModelAliases();
  if (aliases[value] !== undefined) return aliases[value];
  return value; // pass through — assume it's already a full model ID
}

/**
 * Get the full agent→model map for a profile (after alias resolution).
 */
function getResolvedMapForProfile(profileName) {
  const profile = getProfile(profileName);
  const map = {};
  for (const agent of Object.keys(profile.agents)) {
    map[agent] = resolveModelForAgent(agent, { profile: profileName });
  }
  return map;
}

/**
 * Format an agent→model map as a table for CLI output.
 */
function formatMapAsTable(map) {
  const agents = Object.keys(map);
  if (agents.length === 0) return '(empty)';
  const agentWidth = Math.max('Agent'.length, ...agents.map((a) => a.length));
  const modelWidth = Math.max(
    'Model'.length,
    ...Object.values(map).map((m) => (m ?? 'inherit').length),
  );
  const sep = '─'.repeat(agentWidth + 2) + '┼' + '─'.repeat(modelWidth + 2);
  let out = ' ' + 'Agent'.padEnd(agentWidth) + ' │ ' + 'Model'.padEnd(modelWidth) + '\n';
  out += sep + '\n';
  for (const [agent, model] of Object.entries(map)) {
    out += ' ' + agent.padEnd(agentWidth) + ' │ ' + (model ?? 'inherit').padEnd(modelWidth) + '\n';
  }
  return out;
}

/**
 * Read the project's current profile from .rihal/config.json (if present).
 * Falls back to the default profile from the package config.
 */
function getProjectProfile(projectDir = process.cwd()) {
  const projectConfigPath = path.join(projectDir, '.rihal', 'config.json');
  if (fs.existsSync(projectConfigPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
      return {
        profile: cfg.model_profile || getDefaultProfile(),
        overrides: cfg.model_overrides || {},
      };
    } catch (e) {
      console.warn(`Warning: .rihal/config.json is invalid JSON. Using defaults.`);
    }
  }
  return { profile: getDefaultProfile(), overrides: {} };
}

module.exports = {
  loadProfiles,
  listProfiles,
  getProfile,
  getDefaultProfile,
  getModelAliases,
  resolveModelForAgent,
  getResolvedMapForProfile,
  formatMapAsTable,
  getProjectProfile,
};
