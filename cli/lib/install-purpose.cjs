/**
 * cli/lib/install-purpose.cjs — purpose bundles on top of the minimal profile.
 *
 * A purpose (frontend, seo, strategy, audits) is an additive set of commands,
 * user-invocable skills and agents declared under `purposes:` in
 * rcode/profiles.yaml. The effective install is `minimal` (the core loop, always
 * present) plus the chosen purposes; `full` ignores purposes because it already
 * contains everything. Chosen purposes persist as `purposes: [a, b]` in
 * .rcode/_config/manifest.yaml so `update` re-applies them.
 *
 * Selection precedence (resolveSelection):
 *   1. `--profile full` or `--purpose full`  -> full (other purposes are moot)
 *   2. `--profile minimal --purpose a,b`     -> exactly {a, b}   (replaces)
 *   3. `--purpose a,b` alone                 -> persisted purposes + {a, b}
 *   4. no flag                               -> persisted purposes (or none)
 */

const fs = require('fs');
const path = require('path');
const pc = require('picocolors');
const clack = require('@clack/prompts');
const { SOURCE_ROOT, info } = require('./install-shared.cjs');
const {
  LEGACY_PROFILE, loadProfiles, readPersistedProfile, resolveProfile, removalsForSwitch, parseInlineList,
} = require('./install-profile.cjs');
const { listStaleInstalledFiles } = require('./install-manifest.cjs');
const { createInstallBackup } = require('./install-backup.cjs');

// `--purpose full` is a spelling of `--profile full`, not a bundle of its own.
const FULL_ALIAS = 'full';
// How many removals to print when a shrinking change is refused.
const REMOVAL_PREVIEW = 15;
const SURFACES = ['commands', 'skills', 'agents'];

/** Parse the `purposes:` section of profiles.yaml into { name: { description, commands, skills, agents } }. */
function parsePurposesYaml(text) {
  const section = text.split(/^purposes:\s*$/m)[1];
  const purposes = {};
  if (!section) return purposes;
  let current = null;
  for (const raw of section.split('\n')) {
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    const name = raw.match(/^ {2}(\w[\w-]*):\s*$/);
    if (name) {
      current = { description: '', commands: [], skills: [], agents: [] };
      purposes[name[1]] = current;
      continue;
    }
    const kv = raw.match(/^ {4}(\w+):\s*(.*)$/);
    if (!kv || !current) continue;
    if (kv[1] === 'description') current.description = kv[2].trim();
    else if (SURFACES.includes(kv[1])) current[kv[1]] = parseInlineList(kv[2]);
  }
  return purposes;
}

function loadPurposes(sourceRoot = SOURCE_ROOT) {
  const file = path.join(sourceRoot, 'profiles.yaml');
  if (!fs.existsSync(file)) throw new Error(`install profiles manifest not found: ${file}`);
  return parsePurposesYaml(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
}

/**
 * Validate a comma list (or array) of purpose names. Returns a de-duplicated
 * array in the order given, or null when nothing was requested.
 */
function parsePurposeFlag(raw, purposes = loadPurposes()) {
  if (raw === null || raw === undefined) return null;
  const list = (Array.isArray(raw) ? raw : String(raw).split(','))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const valid = Object.keys(purposes);
  const unknown = list.filter((p) => p !== FULL_ALIAS && !valid.includes(p));
  if (list.length === 0 || unknown.length) {
    const bad = unknown.length ? `Unknown purpose "${unknown.join('", "')}". ` : 'Empty --purpose list. ';
    throw new Error(`${bad}Available purposes: ${[...valid, FULL_ALIAS].join(', ')}`);
  }
  return [...new Set(list)];
}

/** Purposes persisted by a previous install ([] when none or no manifest). */
function readPersistedPurposes(target) {
  const manifest = path.join(target, '.rcode', '_config', 'manifest.yaml');
  if (!fs.existsSync(manifest)) return [];
  const m = fs.readFileSync(manifest, 'utf8').match(/^purposes:\s*\[(.*)\]\s*$/m);
  return m ? parseInlineList(m[1]) : [];
}

/**
 * The profiles map with `minimal` widened by the given purposes. Callers keep
 * using the plain profile name ('minimal'/'full') against this map, so the
 * existing filters need no purpose-specific branch.
 */
function effectiveProfiles(purposes = [], sourceRoot = SOURCE_ROOT) {
  const profiles = loadProfiles(sourceRoot);
  if (!purposes.length || !profiles.minimal) return profiles;
  const defs = loadPurposes(sourceRoot);
  const merged = {
    all: false,
    commands: new Set(profiles.minimal.commands),
    skills: new Set(profiles.minimal.skills),
    agents: new Set(profiles.minimal.agents),
  };
  for (const name of purposes) {
    const def = defs[name];
    if (!def) throw new Error(`Unknown purpose "${name}"`);
    for (const surface of SURFACES) for (const item of def[surface]) merged[surface].add(item);
  }
  return { ...profiles, minimal: merged };
}

/**
 * Decide profile + purposes for this run. Returns the resolveProfile shape plus
 * { purposes, persistedPurposes, removedPurposes }.
 */
function resolveSelection(opts) {
  const defs = loadPurposes();
  let requested = parsePurposeFlag(opts.purpose, defs);
  let profileFlag = opts.profile || null;
  if (requested && requested.includes(FULL_ALIAS)) {
    if (profileFlag && profileFlag !== 'full') {
      throw new Error(`--purpose full conflicts with --profile ${profileFlag}`);
    }
    profileFlag = 'full';
    requested = requested.filter((p) => p !== FULL_ALIAS);
  }

  // `--purpose` on a fresh or minimal install means "minimal plus these", even
  // for --global whose bare default is full. A legacy/full install stays full.
  const impliedProfile = profileFlag || (requested && readPersistedProfile(opts.target) !== LEGACY_PROFILE ? 'minimal' : null);
  const profileState = resolveProfile({ ...opts, profile: impliedProfile });

  const persistedPurposes = profileState.persisted === 'minimal' ? readPersistedPurposes(opts.target) : [];
  let purposes = [];
  if (profileState.profile === 'minimal') {
    const replace = profileFlag === 'minimal';
    purposes = replace ? (requested || []) : [...new Set([...persistedPurposes, ...(requested || [])])];
  }
  const removedPurposes = persistedPurposes.filter((p) => !purposes.includes(p));
  return { ...profileState, purposes, persistedPurposes, removedPurposes, purposeRequested: requested };
}

/** Counts of what a purpose adds, for the picker hint and the summary. */
function describeCounts(def) {
  return `+${def.commands.length} commands, ${def.skills.length} skills, ${def.agents.length} agents`;
}

/** Default prompt: @clack/prompts multiselect, the same library the wizard uses. */
async function askWithClack(options) {
  const picked = await clack.multiselect({
    message: 'What will you use rcode for? (the core plan/build/verify loop is always included)',
    options,
    required: false,
  });
  if (clack.isCancel(picked)) {
    clack.cancel('Install cancelled.');
    process.exit(0);
  }
  return picked;
}

/** Picker choices: one per purpose, then "everything". */
function pickerOptions(defs = loadPurposes()) {
  return [
    ...Object.entries(defs).map(([value, def]) => ({
      value, label: def.description, hint: describeCounts(def),
    })),
    { value: FULL_ALIAS, label: 'Everything (full)', hint: 'every command, skill and agent' },
  ];
}

/**
 * Only a fresh interactive project install is asked. Flags, --yes, CI, non-TTY,
 * --global, the postinstall auto-run and existing installs keep today's
 * behavior, so nothing can hang waiting for input.
 */
function shouldPromptForPurpose(opts, persisted, { isTTY, env }) {
  return Boolean(isTTY)
    && !env.CI
    && !opts.yes && !opts.noPrompt && !opts.silent && !opts.global
    && !opts.profile && !opts.purpose
    && persisted === null;
}

/**
 * Fill opts.purpose from the picker when it applies. `io` injects isTTY/env/ask
 * so the interactive path is testable without a terminal.
 */
async function resolvePurposeChoice(opts, io = {}) {
  const isTTY = io.isTTY ?? process.stdin.isTTY;
  const env = io.env ?? process.env;
  const ask = io.ask ?? askWithClack;
  let persisted = null;
  try { persisted = resolveProfile({ ...opts, profile: null }).persisted; } catch { persisted = null; }
  if (!shouldPromptForPurpose(opts, persisted, { isTTY, env })) return;
  const picked = await ask(pickerOptions());
  if (picked.length) opts.purpose = picked.join(',');
}

/** One-line profile + purposes status, including the documented ways to change it. */
function reportSelection(sel) {
  const { profile, persisted, requested, purposes } = sel;
  const other = profile === 'minimal' ? 'full' : 'minimal';
  const label = purposes.length ? `${profile} + ${purposes.join(', ')}` : profile;
  if (persisted === null) {
    const hint = profile === 'minimal'
      ? 'core loop; add more with: rcode install --purpose <name> (frontend, seo, strategy, audits) or --profile full'
      : 'every command, skill and agent';
    console.log('  ' + info(`Profile: ${label} (${hint})`));
  } else if (persisted === profile && !sel.removedPurposes.length && !sel.purposeRequested) {
    console.log('  ' + info(`Profile: ${label} (unchanged). Switch with --profile ${other}`));
  } else if (requested === 'full') {
    console.log('  ' + info(`Profile: ${persisted} → full (adding missing files, nothing is overwritten)`));
  } else if (persisted === profile) {
    console.log('  ' + info(`Profile: ${label}`));
  } else {
    console.log('  ' + info(`Profile: ${persisted} → ${label}`));
  }
  if (sel.purposeRequested && profile === 'full') {
    console.log('  ' + info('Already full: every purpose is included, nothing to add.'));
  }
}

/** Final "what you got and how to add more" line. */
function printSelectionSummary(opts, profiles) {
  const def = profiles[opts.profile];
  if (!def) return;
  const what = def.all
    ? 'everything'
    : `${def.commands.size} commands, ${def.skills.size} skills, ${def.agents.size} agents`;
  const label = opts.purposes.length ? `${opts.profile} + ${opts.purposes.join(', ')}` : opts.profile;
  console.log('  ' + info(`Installed profile: ${pc.bold(label)} (${what})`));
  if (opts.profile === 'minimal') {
    const rest = Object.keys(loadPurposes()).filter((p) => !opts.purposes.includes(p));
    if (rest.length) console.log('  ' + pc.dim(`  Add more later: rcode install --purpose ${rest[0]}   (options: ${rest.join(', ')}, full)`));
  }
}

/**
 * Refuse (or back up) any change that would delete installed files: full ->
 * minimal, or dropping a recorded purpose. Returns an exit code, or null to
 * continue.
 */
function enforceShrinkGate(opts, sel, plan, profiles) {
  const fullToMinimal = sel.isSwitch && sel.persisted === 'full' && opts.profile === 'minimal';
  if (!fullToMinimal && !sel.removedPurposes.length) return null;
  const removals = removalsForSwitch(listStaleInstalledFiles(opts.target, plan), opts.profile, profiles);
  if (!fullToMinimal && removals.length === 0) return null;
  if (!opts.force) {
    const n = removals.length;
    console.error('');
    console.error(fullToMinimal
      ? `✖ --profile minimal would remove ${n} installed file${n === 1 ? '' : 's'} from this full install:`
      : `✖ Dropping purpose ${sel.removedPurposes.join(', ')} would remove ${n} installed file${n === 1 ? '' : 's'}:`);
    for (const rel of removals.slice(0, REMOVAL_PREVIEW)) console.error(`    - ${rel}`);
    if (n > REMOVAL_PREVIEW) console.error(`    … and ${n - REMOVAL_PREVIEW} more`);
    console.error('  Re-run with --force to apply (a backup tarball is created first).');
    console.error('');
    return 1;
  }
  if (!opts.noBackup) {
    const backup = createInstallBackup(opts.target, plan, removals);
    if (backup.ok) {
      console.log('  ' + info(`profile switch backup: ${pc.cyan(backup.path)} ${pc.dim('(restore with: tar -xzf ' + backup.path + ')')}`));
    } else if (backup.fileCount > 0) {
      console.error(`✖ Could not create backup: ${backup.warning}`);
      console.error('  Refusing to remove files without a backup. Pass --no-backup to override.');
      return 1;
    }
  }
  return null;
}

module.exports = {
  FULL_ALIAS,
  parsePurposesYaml,
  loadPurposes,
  parsePurposeFlag,
  readPersistedPurposes,
  effectiveProfiles,
  resolveSelection,
  pickerOptions,
  shouldPromptForPurpose,
  resolvePurposeChoice,
  reportSelection,
  printSelectionSummary,
  enforceShrinkGate,
};
