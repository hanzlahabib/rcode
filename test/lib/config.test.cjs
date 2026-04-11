/**
 * Tests for cli/lib/config.cjs — 3-level cascade, allowlist validation,
 * typo suggestions.
 *
 * HOME is stubbed to a tempdir so tests don't read/write the contributor's
 * real ~/.rihal-code/defaults.json.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  HARDCODED_DEFAULTS,
  VALID_CONFIG_KEYS,
  VALID_MODEL_PROFILES,
  VALID_COMMUNICATION_MODES,
  loadConfig,
  getConfigValue,
  setConfigValue,
  initProjectConfig,
  writeUserDefaults,
  suggestClosest,
} = require('../../cli/lib/config.cjs');
const { makeTempDir, cleanup, initRihalDir } = require('../helpers.cjs');

/**
 * Run a test function with process.env.HOME pointed at a temp home so
 * reads from user-level defaults don't leak into the contributor's real
 * dotfiles.
 */
function withStubbedHome(fn) {
  return (t) => {
    const originalHome = process.env.HOME;
    const stubHome = makeTempDir('rihal-home-');
    process.env.HOME = stubHome;
    t.after(() => {
      process.env.HOME = originalHome;
      cleanup(stubHome);
    });
    return fn(t, stubHome);
  };
}

test(
  'loadConfig returns hardcoded defaults when no files exist',
  withStubbedHome((t) => {
    const cwd = makeTempDir();
    t.after(() => cleanup(cwd));

    const config = loadConfig(cwd);
    assert.strictEqual(config.schema_version, 1);
    assert.strictEqual(config.user_name, 'Team');
    assert.strictEqual(config.communication_language, 'English');
    assert.strictEqual(config.model_profile, 'balanced');
    assert.strictEqual(config.communication_mode, 'guided');
    // project_name defaults to the directory basename
    assert.strictEqual(config.project_name, path.basename(cwd));
  }),
);

test(
  'loadConfig merges user defaults over hardcoded',
  withStubbedHome((t, home) => {
    const cwd = makeTempDir();
    t.after(() => cleanup(cwd));

    fs.mkdirSync(path.join(home, '.rihal-code'), { recursive: true });
    fs.writeFileSync(
      path.join(home, '.rihal-code', 'defaults.json'),
      JSON.stringify({ user_name: 'Hanzla', communication_language: 'Urdu' }),
    );

    const config = loadConfig(cwd);
    assert.strictEqual(config.user_name, 'Hanzla');
    assert.strictEqual(config.communication_language, 'Urdu');
    // unaffected hardcoded default should still be present
    assert.strictEqual(config.model_profile, 'balanced');
  }),
);

test(
  'loadConfig merges project over user over hardcoded',
  withStubbedHome((t, home) => {
    const cwd = makeTempDir();
    t.after(() => cleanup(cwd));
    initRihalDir(cwd);

    fs.mkdirSync(path.join(home, '.rihal-code'), { recursive: true });
    fs.writeFileSync(
      path.join(home, '.rihal-code', 'defaults.json'),
      JSON.stringify({ user_name: 'User', model_profile: 'quality' }),
    );
    fs.writeFileSync(
      path.join(cwd, '.rihal', 'config.json'),
      JSON.stringify({ user_name: 'Project' }),
    );

    const config = loadConfig(cwd);
    // project wins over user
    assert.strictEqual(config.user_name, 'Project');
    // user wins over hardcoded
    assert.strictEqual(config.model_profile, 'quality');
  }),
);

test(
  'getConfigValue returns undefined for unknown keys',
  withStubbedHome((t) => {
    const cwd = makeTempDir();
    t.after(() => cleanup(cwd));
    assert.strictEqual(getConfigValue(cwd, 'bogus_key'), undefined);
  }),
);

test(
  'getConfigValue returns value for known keys',
  withStubbedHome((t) => {
    const cwd = makeTempDir();
    t.after(() => cleanup(cwd));
    assert.strictEqual(getConfigValue(cwd, 'user_name'), 'Team');
    assert.strictEqual(getConfigValue(cwd, 'model_profile'), 'balanced');
  }),
);

test(
  'setConfigValue rejects unknown keys with typo suggestion',
  withStubbedHome((t) => {
    const cwd = makeTempDir();
    t.after(() => cleanup(cwd));
    initRihalDir(cwd);

    const result = setConfigValue(cwd, 'profile', 'balanced');
    assert.strictEqual(result.ok, false);
    assert.match(result.error, /Unknown config key 'profile'/);
    assert.strictEqual(result.suggestion, 'model_profile');
  }),
);

test(
  'setConfigValue validates model_profile enum',
  withStubbedHome((t) => {
    const cwd = makeTempDir();
    t.after(() => cleanup(cwd));
    initRihalDir(cwd);

    const result = setConfigValue(cwd, 'model_profile', 'qality');
    assert.strictEqual(result.ok, false);
    assert.match(result.error, /Invalid model_profile/);
    assert.strictEqual(result.suggestion, 'quality');
  }),
);

test(
  'setConfigValue validates communication_mode enum',
  withStubbedHome((t) => {
    const cwd = makeTempDir();
    t.after(() => cleanup(cwd));
    initRihalDir(cwd);

    const result = setConfigValue(cwd, 'communication_mode', 'guidded');
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.suggestion, 'guided');
  }),
);

test(
  'setConfigValue writes to project-level config.json by default',
  withStubbedHome((t) => {
    const cwd = makeTempDir();
    t.after(() => cleanup(cwd));
    initRihalDir(cwd);

    const result = setConfigValue(cwd, 'user_name', 'Hanzla');
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.scope, 'project');

    const stored = JSON.parse(
      fs.readFileSync(path.join(cwd, '.rihal', 'config.json'), 'utf8'),
    );
    assert.strictEqual(stored.user_name, 'Hanzla');
  }),
);

test(
  'setConfigValue --global writes to user-level defaults',
  withStubbedHome((t, home) => {
    const cwd = makeTempDir();
    t.after(() => cleanup(cwd));
    initRihalDir(cwd);

    const result = setConfigValue(cwd, 'user_name', 'Hanzla', { scope: 'global' });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.scope, 'global');

    const stored = JSON.parse(
      fs.readFileSync(path.join(home, '.rihal-code', 'defaults.json'), 'utf8'),
    );
    assert.strictEqual(stored.user_name, 'Hanzla');
  }),
);

test(
  'initProjectConfig applies wizard overrides over user defaults',
  withStubbedHome((t, home) => {
    const cwd = makeTempDir();
    t.after(() => cleanup(cwd));
    initRihalDir(cwd);

    fs.mkdirSync(path.join(home, '.rihal-code'), { recursive: true });
    fs.writeFileSync(
      path.join(home, '.rihal-code', 'defaults.json'),
      JSON.stringify({ user_name: 'FromUser' }),
    );

    const created = initProjectConfig(cwd, {
      user_name: 'FromWizard',
      installed_version: '1.0.0',
    });
    assert.strictEqual(created, true);

    const stored = JSON.parse(
      fs.readFileSync(path.join(cwd, '.rihal', 'config.json'), 'utf8'),
    );
    assert.strictEqual(stored.user_name, 'FromWizard');
    assert.strictEqual(stored.installed_version, '1.0.0');
  }),
);

test(
  'initProjectConfig is a no-op if config.json already exists',
  withStubbedHome((t) => {
    const cwd = makeTempDir();
    t.after(() => cleanup(cwd));
    initRihalDir(cwd);

    fs.writeFileSync(
      path.join(cwd, '.rihal', 'config.json'),
      JSON.stringify({ user_name: 'Existing' }),
    );

    const created = initProjectConfig(cwd, { user_name: 'Override' });
    assert.strictEqual(created, false);

    const stored = JSON.parse(
      fs.readFileSync(path.join(cwd, '.rihal', 'config.json'), 'utf8'),
    );
    assert.strictEqual(stored.user_name, 'Existing');
  }),
);

test('suggestClosest returns closest candidate under plausibility threshold', () => {
  assert.strictEqual(suggestClosest('qality', ['quality', 'budget', 'balanced']), 'quality');
  assert.strictEqual(suggestClosest('balenced', ['quality', 'budget', 'balanced']), 'balanced');
  assert.strictEqual(suggestClosest('guidded', ['guided', 'yolo']), 'guided');
});

test('suggestClosest returns null for implausible input', () => {
  assert.strictEqual(suggestClosest('zxqv', ['quality', 'budget', 'balanced']), null);
});

test('VALID_CONFIG_KEYS contains the canonical key set', () => {
  const required = [
    'schema_version',
    'installed_version',
    'project_name',
    'user_name',
    'communication_language',
    'document_output_language',
    'output_folder',
    'planning_artifacts',
    'project_knowledge',
    'model_profile',
    'communication_mode',
  ];
  for (const key of required) {
    assert.ok(VALID_CONFIG_KEYS.has(key), `missing key: ${key}`);
  }
});

test('HARDCODED_DEFAULTS has a default for every valid key', () => {
  for (const key of VALID_CONFIG_KEYS) {
    assert.ok(
      key in HARDCODED_DEFAULTS,
      `HARDCODED_DEFAULTS missing key: ${key}`,
    );
  }
});

test('VALID_MODEL_PROFILES contains the four canonical profiles', () => {
  assert.ok(VALID_MODEL_PROFILES.has('quality'));
  assert.ok(VALID_MODEL_PROFILES.has('balanced'));
  assert.ok(VALID_MODEL_PROFILES.has('budget'));
  assert.ok(VALID_MODEL_PROFILES.has('inherit'));
});

test('VALID_COMMUNICATION_MODES contains guided and yolo', () => {
  assert.strictEqual(VALID_COMMUNICATION_MODES.size, 2);
  assert.ok(VALID_COMMUNICATION_MODES.has('guided'));
  assert.ok(VALID_COMMUNICATION_MODES.has('yolo'));
});
