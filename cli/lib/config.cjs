/**
 * Rihal Code configuration loader with 3-level cascade.
 *
 * Priority (lowest to highest — higher overrides lower):
 *   1. Hardcoded defaults baked into this file
 *   2. User-level defaults at ~/.rihal-code/defaults.json
 *   3. Project-level config at {cwd}/.rihal/config.json
 *
 * All get/set operations go through this module so validation, typo
 * suggestions, and atomic writes happen in one place.
 *
 * Why JSON (not YAML): zero deps, already used for state.json and
 * model-profiles.json, safer for programmatic updates, matches GSD.
 *
 * Why dot notation keys: lets us namespace future sections (e.g.
 * "workflow.research", "git.branching_strategy") without restructuring
 * the whole file. Same pattern GSD uses.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { writeJsonAtomic } = require('./fsutil.cjs');

// ---------- Schema ----------

const SCHEMA_VERSION = 1;

/**
 * Hardcoded defaults. Every field the rest of the codebase expects MUST
 * have a default here so workflows never crash on a missing key.
 *
 * Paths are relative to the project root (cwd). Workflows resolve them
 * themselves — this loader just returns the strings.
 */
const HARDCODED_DEFAULTS = {
  schema_version: SCHEMA_VERSION,

  // Identity — overridable at user-level for multi-project convenience
  project_name: null, // set at write-time to cwd basename
  user_name: 'Team',
  communication_language: 'English',
  document_output_language: 'English',

  // Paths
  output_folder: '.rihal',
  planning_artifacts: '.rihal/phases',
  project_knowledge: '.rihal/context',

  // Model profile — matches model-profiles.json names
  model_profile: 'balanced',
};

/**
 * Allowlist of valid config keys. Used by setConfigValue to reject
 * typos with a helpful suggestion instead of silently accepting
 * garbage and then confusing the user later.
 */
const VALID_CONFIG_KEYS = new Set([
  'schema_version',
  'project_name',
  'user_name',
  'communication_language',
  'document_output_language',
  'output_folder',
  'planning_artifacts',
  'project_knowledge',
  'model_profile',
]);

/**
 * Common typos → canonical key. Extend as real users hit new ones.
 */
const CONFIG_KEY_SUGGESTIONS = {
  profile: 'model_profile',
  'model-profile': 'model_profile',
  language: 'communication_language',
  user: 'user_name',
  project: 'project_name',
  output: 'output_folder',
  planning: 'planning_artifacts',
  knowledge: 'project_knowledge',
};

/**
 * Valid values for enum-ish fields. Used for validation on set().
 */
const VALID_MODEL_PROFILES = new Set(['quality', 'balanced', 'budget', 'inherit']);

// ---------- Paths ----------

function userLevelPath() {
  return path.join(os.homedir(), '.rihal-code', 'defaults.json');
}

function projectLevelPath(cwd) {
  return path.join(cwd, '.rihal', 'config.json');
}

// ---------- Loaders ----------

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    // Non-fatal: return null so the cascade falls through. The caller
    // (doctor, or an explicit `config` command) will flag it.
    return null;
  }
}

function loadUserDefaults() {
  return readJsonSafe(userLevelPath()) || {};
}

function loadProjectConfig(cwd) {
  return readJsonSafe(projectLevelPath(cwd)) || {};
}

/**
 * Merge the three cascade levels and return the fully-resolved config.
 * Never returns undefined for a known key.
 *
 * @param {string} cwd project root
 * @returns {object} merged config
 */
function loadConfig(cwd) {
  const defaults = { ...HARDCODED_DEFAULTS };
  if (defaults.project_name === null) {
    // Default project_name to directory basename when not set anywhere.
    defaults.project_name = path.basename(cwd);
  }

  const user = loadUserDefaults();
  const project = loadProjectConfig(cwd);

  // Later sources override earlier ones
  return { ...defaults, ...user, ...project };
}

/**
 * Return a single value by key. Falls back through the cascade.
 * Returns undefined if the key is not in the allowlist.
 */
function getConfigValue(cwd, key) {
  if (!VALID_CONFIG_KEYS.has(key)) return undefined;
  const merged = loadConfig(cwd);
  return merged[key];
}

// ---------- Writers ----------

/**
 * Write the initial project config file during install. Called by
 * init.js on fresh installs. If the file already exists, this is a
 * no-op — respect the user's prior choices.
 *
 * Cascade (highest priority last): HARDCODED_DEFAULTS → user-level
 * defaults → explicit `overrides` (e.g. from install-time wizard).
 *
 * @param {string} cwd
 * @param {object} [overrides] optional key/value map to win over user-level
 * @returns {boolean} true if a new file was written, false if it already existed
 */
function initProjectConfig(cwd, overrides = {}) {
  const target = projectLevelPath(cwd);
  if (fs.existsSync(target)) return false;

  const user = loadUserDefaults();
  const pick = (key) =>
    overrides[key] !== undefined
      ? overrides[key]
      : user[key] !== undefined
      ? user[key]
      : HARDCODED_DEFAULTS[key];

  const initial = {
    schema_version: SCHEMA_VERSION,
    project_name: overrides.project_name || path.basename(cwd),
    user_name: pick('user_name'),
    communication_language: pick('communication_language'),
    document_output_language: pick('document_output_language'),
    output_folder: pick('output_folder'),
    planning_artifacts: pick('planning_artifacts'),
    project_knowledge: pick('project_knowledge'),
    model_profile: pick('model_profile'),
  };

  writeJsonAtomic(target, initial);
  return true;
}

/**
 * Write a full object to the user-level defaults file. Used by the
 * install-time wizard when the user answers "save as global defaults".
 * Merges with existing defaults so unrelated keys aren't clobbered.
 */
function writeUserDefaults(updates) {
  const current = loadUserDefaults();
  const next = { ...current, ...updates };
  writeJsonAtomic(userLevelPath(), next);
}

/**
 * Result shape from setConfigValue.
 *   { ok: true, scope }
 *   { ok: false, error, suggestion? }
 */
function setConfigValue(cwd, key, value, { scope = 'project' } = {}) {
  // Validate key
  if (!VALID_CONFIG_KEYS.has(key)) {
    const suggestion =
      CONFIG_KEY_SUGGESTIONS[key.toLowerCase()] ||
      suggestClosest(key, [...VALID_CONFIG_KEYS]);
    return {
      ok: false,
      error: `Unknown config key '${key}'`,
      suggestion,
    };
  }

  // Validate value for enum fields
  if (key === 'model_profile' && !VALID_MODEL_PROFILES.has(value)) {
    return {
      ok: false,
      error: `Invalid model_profile '${value}' (valid: ${[...VALID_MODEL_PROFILES].join(', ')})`,
      suggestion: suggestClosest(value, [...VALID_MODEL_PROFILES]),
    };
  }

  // Coerce schema_version to number
  if (key === 'schema_version') {
    const num = Number(value);
    if (Number.isNaN(num)) {
      return { ok: false, error: `schema_version must be a number` };
    }
    value = num;
  }

  // Pick target file
  let target;
  let current;
  if (scope === 'global') {
    target = userLevelPath();
    current = loadUserDefaults();
  } else {
    target = projectLevelPath(cwd);
    current = loadProjectConfig(cwd);
  }

  const next = { ...current, [key]: value };
  writeJsonAtomic(target, next);
  return { ok: true, scope, target };
}

// ---------- Typo helpers ----------

/**
 * Return closest candidate under a plausibility threshold, else null.
 * Same shape as the helper in set-profile.js — duplicated here to keep
 * this module self-contained. Tiny function, zero import cost.
 */
function suggestClosest(input, candidates) {
  if (!input) return null;
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
  const threshold = Math.max(1, Math.floor(input.length / 3));
  return bestDistance <= threshold ? best : null;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

module.exports = {
  SCHEMA_VERSION,
  HARDCODED_DEFAULTS,
  VALID_CONFIG_KEYS,
  VALID_MODEL_PROFILES,
  loadConfig,
  getConfigValue,
  setConfigValue,
  initProjectConfig,
  writeUserDefaults,
  loadUserDefaults,
  loadProjectConfig,
  userLevelPath,
  projectLevelPath,
  suggestClosest,
};
