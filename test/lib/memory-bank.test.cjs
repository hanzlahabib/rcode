/**
 * Tests for cli/lib/memory-bank.cjs — project fingerprint and staleness
 * detection for .rihal/context/ memory bank files.
 *
 * Fingerprint comparison is deterministic for file hashes but depends on
 * real git for SHA lookups. Tests that need git init the tempdir as a
 * git repo; tests that don't care about git verify the non-git fields.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  computeFingerprint,
  writeFingerprint,
  readFingerprint,
  checkStaleness,
  STALE_THRESHOLDS,
} = require('../../cli/lib/memory-bank.cjs');
const { makeTempDir, cleanup, initRihalDir } = require('../helpers.cjs');

function gitInit(cwd) {
  spawnSync('git', ['init', '-q'], { cwd });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd });
  spawnSync('git', ['config', 'user.name', 'Tester'], { cwd });
}

function gitCommit(cwd, msg = 'commit') {
  spawnSync('git', ['add', '.'], { cwd });
  spawnSync('git', ['commit', '-q', '--allow-empty', '-m', msg], { cwd });
}

test('computeFingerprint returns stable shape with timestamp', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));

  const fp = computeFingerprint(cwd);
  assert.ok(typeof fp.timestamp === 'string');
  assert.ok('git_head' in fp);
  assert.ok('manifest_hash' in fp);
  assert.ok('structure_hash' in fp);
  assert.ok(Array.isArray(fp.structure_dirs));
});

test('computeFingerprint hashes package.json when present', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));

  fs.writeFileSync(path.join(cwd, 'package.json'), '{"name":"test"}');
  const fp = computeFingerprint(cwd);
  assert.strictEqual(fp.manifest_name, 'package.json');
  assert.ok(typeof fp.manifest_hash === 'string');
  assert.ok(fp.manifest_hash.length === 16);
});

test('computeFingerprint returns null manifest when no supported file exists', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));

  const fp = computeFingerprint(cwd);
  assert.strictEqual(fp.manifest_name, null);
  assert.strictEqual(fp.manifest_hash, null);
});

test('computeFingerprint excludes dot directories, node_modules, dist, build', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));

  for (const name of ['src', '.git', 'node_modules', 'dist', 'build', 'tests']) {
    fs.mkdirSync(path.join(cwd, name));
  }

  const fp = computeFingerprint(cwd);
  assert.deepStrictEqual(fp.structure_dirs, ['src', 'tests']);
});

test('writeFingerprint + readFingerprint round-trip', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  const written = writeFingerprint(cwd);
  const read = readFingerprint(cwd);

  assert.deepStrictEqual(read.structure_dirs, written.structure_dirs);
  assert.strictEqual(read.structure_hash, written.structure_hash);
  assert.strictEqual(read.timestamp, written.timestamp);
});

test('checkStaleness returns "never" when context files dont exist', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  const result = checkStaleness(cwd);
  assert.strictEqual(result.status, 'never');
  assert.ok(result.reasons.length > 0);
});

test('checkStaleness returns "stale" when only one context file exists', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);
  fs.mkdirSync(path.join(cwd, '.rihal', 'context'));
  fs.writeFileSync(path.join(cwd, '.rihal', 'context', 'active.md'), '# active');

  const result = checkStaleness(cwd);
  assert.strictEqual(result.status, 'stale');
  assert.ok(result.reasons.some((r) => r.includes('incomplete')));
});

test('checkStaleness returns "fresh" when both files exist and fingerprint matches', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  fs.mkdirSync(path.join(cwd, '.rihal', 'context'));
  fs.writeFileSync(path.join(cwd, '.rihal', 'context', 'active.md'), '# active');
  fs.writeFileSync(path.join(cwd, '.rihal', 'context', 'project-brief.md'), '# brief');

  writeFingerprint(cwd);

  const result = checkStaleness(cwd);
  assert.strictEqual(result.status, 'fresh');
  assert.deepStrictEqual(result.reasons, []);
});

test('checkStaleness detects manifest hash change', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);
  fs.mkdirSync(path.join(cwd, '.rihal', 'context'));
  fs.writeFileSync(path.join(cwd, '.rihal', 'context', 'active.md'), '# active');
  fs.writeFileSync(path.join(cwd, '.rihal', 'context', 'project-brief.md'), '# brief');
  fs.writeFileSync(path.join(cwd, 'package.json'), '{"name":"v1"}');

  writeFingerprint(cwd);

  // Change the manifest
  fs.writeFileSync(path.join(cwd, 'package.json'), '{"name":"v2"}');

  const result = checkStaleness(cwd);
  assert.strictEqual(result.status, 'stale');
  assert.ok(
    result.reasons.some((r) => r.includes('package.json')),
    `expected manifest-change reason, got: ${JSON.stringify(result.reasons)}`,
  );
});

test('checkStaleness detects structure change (new top-level dir)', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);
  fs.mkdirSync(path.join(cwd, '.rihal', 'context'));
  fs.writeFileSync(path.join(cwd, '.rihal', 'context', 'active.md'), '# active');
  fs.writeFileSync(path.join(cwd, '.rihal', 'context', 'project-brief.md'), '# brief');
  fs.mkdirSync(path.join(cwd, 'src'));

  writeFingerprint(cwd);

  fs.mkdirSync(path.join(cwd, 'new-feature'));

  const result = checkStaleness(cwd);
  assert.strictEqual(result.status, 'stale');
  assert.ok(
    result.reasons.some((r) => r.includes('structure')),
    `expected structure-change reason, got: ${JSON.stringify(result.reasons)}`,
  );
});

test('STALE_THRESHOLDS are exported and sensible', () => {
  assert.ok(STALE_THRESHOLDS.commitsSinceInit > 0);
  assert.ok(STALE_THRESHOLDS.daysSinceInit > 0);
});
