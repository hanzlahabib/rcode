/**
 * cli/lib/install-profile.cjs — install profiles (minimal | full).
 *
 * A profile decides which of the three always-listed surfaces land in the
 * target: slash commands, user-invocable skills and subagents. Workflows,
 * references, bin, data, templates and internal skills are never filtered, so
 * no @-include can dangle in a minimal install.
 *
 * The manifest of record is rcode/profiles.yaml; the chosen profile is
 * persisted as `profile:` in .rcode/_config/manifest.yaml. An install whose
 * manifest has no `profile:` key predates profiles and is treated as `full`,
 * which is what keeps `update` and `--force` sweeps from shrinking it.
 */

const fs = require('fs');
const path = require('path');
const { SOURCE_ROOT } = require('./install-shared.cjs');

const PROFILE_NAMES = ['minimal', 'full'];
// New project installs start small: the always-listed surfaces cost tokens on
// every turn, and the core loop does not need the other ~75 commands.
const DEFAULT_NEW_PROFILE = 'minimal';
// --global is one user-level copy shared by all projects, so it keeps the
// complete toolset.
const DEFAULT_GLOBAL_PROFILE = 'full';
// Existing installs without a `profile:` key were full installs.
const LEGACY_PROFILE = 'full';

const SURFACES = ['commands', 'skills', 'agents'];

function parseInlineList(raw) {
  return raw
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

/**
 * Parse rcode/profiles.yaml (two-level, inline lists, `extends:`) into
 * { name: { commands, skills, agents, extends } }. Hand-rolled to match the
 * other manifest readers: the package ships zero YAML dependencies.
 */
function parseProfilesYaml(text) {
  const profiles = {};
  let current = null;
  // The `purposes:` section is parsed by install-purpose.cjs; its nested
  // `commands:`/`skills:` lines must not leak into a profile entry.
  const body = text.split(/^purposes:\s*$/m)[0];
  for (const raw of body.split('\n')) {
    const line = raw.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;
    const top = line.match(/^(\w[\w-]*):\s*$/);
    if (top) {
      current = { commands: [], skills: [], agents: [], extends: null };
      profiles[top[1]] = current;
      continue;
    }
    const kv = line.match(/^\s+(\w+):\s*(.*)$/);
    if (!kv || !current) continue;
    if (kv[1] === 'extends') current.extends = kv[2].trim();
    else if (SURFACES.includes(kv[1])) current[kv[1]] = parseInlineList(kv[2]);
  }
  return profiles;
}

/**
 * Load profiles and flatten `extends`. `full` (anything with an extends chain
 * reaching it) is returned as `{ all: true }` because it means "everything",
 * not "base plus an explicit list".
 */
function loadProfiles(sourceRoot = SOURCE_ROOT) {
  const file = path.join(sourceRoot, 'profiles.yaml');
  if (!fs.existsSync(file)) throw new Error(`install profiles manifest not found: ${file}`);
  const raw = parseProfilesYaml(fs.readFileSync(file, 'utf8'));
  const resolved = {};
  for (const [name, def] of Object.entries(raw)) {
    if (def.extends) {
      resolved[name] = { all: true };
    } else {
      resolved[name] = {
        all: false,
        commands: new Set(def.commands),
        skills: new Set(def.skills),
        agents: new Set(def.agents),
      };
    }
  }
  return resolved;
}

/**
 * The profile persisted by a previous install, or null when the target has no
 * install at all. A manifest without a `profile:` line is LEGACY_PROFILE.
 */
function readPersistedProfile(target) {
  const manifest = path.join(target, '.rcode', '_config', 'manifest.yaml');
  if (fs.existsSync(manifest)) {
    const m = fs.readFileSync(manifest, 'utf8').match(/^profile:\s*(\S+)\s*$/m);
    return m && PROFILE_NAMES.includes(m[1]) ? m[1] : LEGACY_PROFILE;
  }
  // Installs older than manifest.yaml still left a files manifest behind.
  if (fs.existsSync(path.join(target, '.rcode', '_config', 'files-manifest.csv'))) return LEGACY_PROFILE;
  return null;
}

/**
 * Decide the profile for this run.
 *   explicit --profile  >  persisted profile  >  default (minimal; full for --global)
 * Returns { profile, persisted, requested, isSwitch }.
 */
function resolveProfile(opts) {
  const persisted = readPersistedProfile(opts.target);
  const requested = opts.profile || null;
  if (requested && !PROFILE_NAMES.includes(requested)) {
    throw new Error(`Unknown profile "${requested}". Available profiles: ${PROFILE_NAMES.join(', ')}`);
  }
  const fallback = opts.global ? DEFAULT_GLOBAL_PROFILE : DEFAULT_NEW_PROFILE;
  const profile = requested || persisted || fallback;
  return { profile, persisted, requested, isSwitch: persisted !== null && persisted !== profile };
}

/**
 * Keep only the plan entries a profile allows. Entries are matched by their
 * source file so the filter is IDE-agnostic (claude/cursor/gemini name the
 * destinations differently). Everything that is not a command or agent
 * definition passes through untouched.
 */
function filterPlanByProfile(plan, profile, profiles = loadProfiles()) {
  const def = profiles[profile];
  if (!def) throw new Error(`Unknown profile "${profile}"`);
  if (def.all) return plan;
  const commandsDir = path.join(SOURCE_ROOT, 'commands') + path.sep;
  const agentsDir = path.join(SOURCE_ROOT, 'agents') + path.sep;
  const rulesDir = path.join(SOURCE_ROOT, 'agents', 'rules') + path.sep;
  return plan.filter((entry) => {
    const src = entry.src || '';
    if (src.startsWith(commandsDir)) return def.commands.has(path.basename(src, '.md'));
    if (src.startsWith(agentsDir) && !src.startsWith(rulesDir)) {
      return def.agents.has(path.basename(src, '.md'));
    }
    return true;
  });
}

/**
 * Predicate over skill destination names (always `rcode-*`), or null when the
 * profile does not restrict skills.
 */
function skillAllowList(profile, profiles = loadProfiles()) {
  const def = profiles[profile];
  if (!def) throw new Error(`Unknown profile "${profile}"`);
  return def.all ? null : def.skills;
}

/**
 * Relative paths a switch to `profile` would delete. Given the stale list the
 * sweep already computes, drop what is reinstalled anyway (internal skills and
 * skills the profile keeps) so the user is shown the real removals.
 */
function removalsForSwitch(staleRels, profile, profiles = loadProfiles()) {
  const allowed = skillAllowList(profile, profiles);
  return staleRels.filter((raw) => {
    const rel = raw.split(path.sep).join('/'); // tracked paths are POSIX, sweep input may be native
    if (rel.startsWith('.rcode/skills/')) return false;
    const skill = rel.match(/^\.claude\/skills\/([^/]+)\//);
    if (skill && (!allowed || allowed.has(skill[1]))) return false;
    return true;
  });
}

module.exports = {
  parseInlineList,
  PROFILE_NAMES,
  DEFAULT_NEW_PROFILE,
  DEFAULT_GLOBAL_PROFILE,
  LEGACY_PROFILE,
  parseProfilesYaml,
  loadProfiles,
  readPersistedProfile,
  resolveProfile,
  filterPlanByProfile,
  skillAllowList,
  removalsForSwitch,
};
