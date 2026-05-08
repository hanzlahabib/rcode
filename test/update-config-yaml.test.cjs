/**
 * Regression tests for #701 — `rcode update` was broken end-to-end on every
 * real install because it read .rihal/config.json and JSON.parse'd it, but
 * the installer writes .rihal/config.yaml.
 *
 * These tests pin three properties:
 *   1. Update succeeds against a config.yaml-only install (the canonical
 *      shape since v3.x).
 *   2. The version key is written back as YAML, preserving every other
 *      field including nested keys and comments.
 *   3. detectInstalledEditors falls back to ~/.claude/skills/ when the
 *      project skills dir is empty (post-#679 dedup) — without this fallback,
 *      update reports "no editor install detected" on a normal install.
 *
 * Failure of any one of these tests means `rcode update` is broken on the
 * dominant install layout. Treat as P0.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const INSTALL_JS = path.join(REPO_ROOT, 'cli', 'install.js');
const { makeTempDir, cleanup } = require('./helpers.cjs');

function gitInit(dir) {
  spawnSync('git', ['init', '-q'], { cwd: dir });
}

function runInstall(target, extra = []) {
  return spawnSync('node', [INSTALL_JS, '--target', target, '--no-update-check', '--yes', ...extra], {
    encoding: 'utf8',
  });
}

/**
 * Run cli/update.js inline (so we don't need a published rcode bin).
 * Mirrors how cli/index.js dispatches the command — passes packageRoot and
 * packageJson so readPackageManifest works.
 */
async function runUpdate(cwd, packageVersion = '99.99.99', extra = []) {
  const update = require('../cli/update.js');
  const originalCwd = process.cwd();
  process.chdir(cwd);
  try {
    return await update(['--yes', ...extra], {
      packageRoot: REPO_ROOT,
      packageJson: { version: packageVersion },
    });
  } finally {
    process.chdir(originalCwd);
  }
}

test('#701 — update against a YAML config writes installed_version without crashing', async (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  const r = runInstall(dir);
  assert.strictEqual(r.status, 0, `install failed: ${r.stderr}`);

  const configPath = path.join(dir, '.rihal', 'config.yaml');
  assert.strictEqual(fs.existsSync(configPath), true, 'install must produce config.yaml');

  // Initial config has no installed_version — update should add it.
  const before = fs.readFileSync(configPath, 'utf8');
  assert.doesNotMatch(before, /installed_version:/, 'fresh install should not have installed_version');

  await runUpdate(dir, '99.99.99');

  const after = fs.readFileSync(configPath, 'utf8');
  assert.match(after, /installed_version:\s*"99\.99\.99"/, 'update must write installed_version');
});

test('#701 — update preserves YAML comments + nested keys + key ordering', async (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);
  runInstall(dir);

  const configPath = path.join(dir, '.rihal', 'config.yaml');
  const before = fs.readFileSync(configPath, 'utf8');

  // Sanity: install writes the comment header + nested workflow:/git: blocks
  assert.match(before, /# Rihal v2 project config/);
  assert.match(before, /workflow:/);
  assert.match(before, /git:/);

  await runUpdate(dir, '88.77.66');

  const after = fs.readFileSync(configPath, 'utf8');
  // Comment header preserved
  assert.match(after, /# Rihal v2 project config/);
  // Nested keys preserved (this used to be the foot-gun — JSON.parse would
  // have thrown on these, then a JSON.stringify rewrite would have flattened them)
  assert.match(after, /workflow:/);
  assert.match(after, /  research_by_default:/);
  assert.match(after, /git:/);
  assert.match(after, /  branching_strategy:/);
  // Top-level fields preserved
  assert.match(after, /user_name:/);
  assert.match(after, /project_name:/);
  // The new key landed
  assert.match(after, /installed_version:\s*"88\.77\.66"/);
});

test('#701 — update repeated bumps replace the existing installed_version exactly once', async (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);
  runInstall(dir);

  await runUpdate(dir, '1.0.0');
  await runUpdate(dir, '2.0.0');
  await runUpdate(dir, '3.0.0');

  const after = fs.readFileSync(path.join(dir, '.rihal', 'config.yaml'), 'utf8');
  // Exactly one installed_version line — the latest value.
  const matches = after.match(/^installed_version:.*$/gm) || [];
  assert.strictEqual(matches.length, 1, `expected 1 installed_version line, got ${matches.length}`);
  assert.match(after, /installed_version:\s*"3\.0\.0"/);
});

test('#701 — detectInstalledEditors finds claude when project .claude/ is empty but globals exist', () => {
  // The post-#679 dedup leaves .claude/skills/ empty when ~/.claude/skills/
  // already has the rihal-* set. detectInstalledEditors must fall back.
  const update = require('../cli/update.js');
  const dir = makeTempDir();

  try {
    // Seed: empty project .claude/ + presence of .rihal/config.yaml.
    fs.mkdirSync(path.join(dir, '.rihal'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.rihal', 'config.yaml'), 'user_name: "test"\n');

    // Don't create any rihal-* files in project. Only globals exist.
    const editors = update.detectInstalledEditors(dir);

    // If the contributor's ~/.claude/skills/ has no rihal-* entries (CI),
    // skip — we can't drive the fallback path from a tempdir alone. The
    // explicit project-claude check (no fallback) is covered separately.
    const os = require('os');
    const homeSkills = path.join(os.homedir(), '.claude/skills');
    const globalHasRihal = fs.existsSync(homeSkills) &&
      fs.readdirSync(homeSkills).some(n => n.startsWith('rihal-'));

    if (globalHasRihal) {
      assert.ok(
        editors.includes('claude'),
        'with globals + .rihal/config.yaml, claude must be detected even if project .claude/ is empty',
      );
    } else {
      // No globals → claude should NOT be detected (config alone isn't enough).
      assert.ok(!editors.includes('claude'), 'no globals + no project files → claude should not be detected');
    }
  } finally {
    cleanup(dir);
  }
});

test('#701 — update on a project with neither config.yaml nor config.json exits with error', async (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));

  // No install. Try update — should bail.
  const update = require('../cli/update.js');
  const originalCwd = process.cwd();
  const originalExit = process.exit;
  let exitCode = null;
  process.exit = (code) => { exitCode = code; throw new Error(`__test_exit_${code}__`); };
  process.chdir(dir);
  try {
    await update(['--yes'], { packageRoot: REPO_ROOT, packageJson: { version: '1.0.0' } });
    assert.fail('update should have exited');
  } catch (err) {
    if (!String(err.message).startsWith('__test_exit_')) throw err;
    assert.strictEqual(exitCode, 1, 'update should exit 1 when no config exists');
  } finally {
    process.exit = originalExit;
    process.chdir(originalCwd);
  }
});
