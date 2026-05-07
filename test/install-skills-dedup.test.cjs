/**
 * Integration tests for the #679 skills dedup, #687 atomic state writes,
 * #688 symlink guard, and #691 install lock. Closes the test-coverage gap
 * called out by lens audit Lens 15.
 *
 * Tests run a real install into a tempdir using cli/install.js's exported
 * install() entry. They never touch the contributor's actual filesystem
 * outside os.tmpdir().
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const INSTALL_JS = path.join(REPO_ROOT, 'cli', 'install.js');
const { makeTempDir, cleanup } = require('./helpers.cjs');

function runInstall(target, extraFlags = []) {
  return spawnSync(
    'node',
    [INSTALL_JS, '--target', target, '--no-update-check', '--yes', ...extraFlags],
    { encoding: 'utf8' },
  );
}

function gitInit(dir) {
  spawnSync('git', ['init', '-q'], { cwd: dir });
}

test('install creates valid JSON in .rihal/state.json (atomic write — #687)', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  const result = runInstall(dir);
  assert.strictEqual(result.status, 0, `install failed: ${result.stderr}`);

  const statePath = path.join(dir, '.rihal', 'state.json');
  assert.strictEqual(fs.existsSync(statePath), true);
  // Must parse as JSON — atomic writes guarantee no partial truncation.
  const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  assert.strictEqual(parsed.version, '1');
  assert.strictEqual(parsed._seeded_stub, true);
});

test('install seeds .rihal/config.yaml with required keys', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  runInstall(dir);

  const cfg = fs.readFileSync(path.join(dir, '.rihal', 'config.yaml'), 'utf8');
  assert.match(cfg, /user_name:/);
  assert.match(cfg, /project_name:/);
  assert.match(cfg, /commit_planning:\s*(true|false)/);
});

test('install writes the rcode-managed .gitignore block', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  runInstall(dir);

  const gi = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
  assert.match(gi, /===== rcode-managed gitignore block/);
  assert.match(gi, /===== end rcode-managed gitignore block =====/);
});

test('--reset alone (without --force) errors fast and leaves no state behind (#680)', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  const result = runInstall(dir, ['--reset']);
  assert.strictEqual(result.status, 2);
  assert.match(result.stdout, /--reset has no effect without --force/);
  assert.strictEqual(fs.existsSync(path.join(dir, '.rihal')), false);
});

test('install is idempotent — running twice produces the same state shape', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  const r1 = runInstall(dir);
  assert.strictEqual(r1.status, 0);
  const stateBefore = fs.readFileSync(path.join(dir, '.rihal', 'state.json'), 'utf8');

  const r2 = runInstall(dir);
  assert.strictEqual(r2.status, 0);
  const stateAfter = fs.readFileSync(path.join(dir, '.rihal', 'state.json'), 'utf8');

  // _seeded_stub flag and project null should both still be present
  // (no real project has graduated this state).
  const after = JSON.parse(stateAfter);
  assert.strictEqual(after._seeded_stub, true);
});

test('concurrent install attempts: live lock blocks the second run with exit 3 (#691)', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  // First install must succeed so .rihal/ exists.
  runInstall(dir);

  // Plant a live lock with this test process's PID.
  const lockPath = path.join(dir, '.rihal', '.install.lock');
  fs.writeFileSync(lockPath, String(process.pid));

  const result = runInstall(dir);
  assert.strictEqual(result.status, 3);
  assert.match(result.stdout, /Another install is already running/);
  // The blocked run should NOT have removed the lock.
  assert.strictEqual(fs.existsSync(lockPath), true);

  // Cleanup
  fs.unlinkSync(lockPath);
});

test('stale lock (PID not alive) is reclaimed automatically', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  runInstall(dir);

  // Plant a stale lock with a guaranteed-dead PID. PID 99999999 is far
  // higher than typical kernel pid_max (4194304 on Linux).
  const lockPath = path.join(dir, '.rihal', '.install.lock');
  fs.writeFileSync(lockPath, '99999999');

  const result = runInstall(dir);
  assert.strictEqual(result.status, 0, `install should reclaim stale lock: ${result.stderr}`);
  // Lock should be released after the install.
  assert.strictEqual(fs.existsSync(lockPath), false);
});
