/**
 * Unit tests for cli/doctor.js checks added for #954:
 *   a) missing .rcode/data/intent-table.json
 *   b) namespace duplication (covered end-to-end in namespace-migrate.test.cjs;
 *      here we only check runPreflight wires it in)
 *   c) stale state: phase stuck 'executing' while a later phase is complete
 *   d) .rcode/memory/INDEX.md staleness (> 30 days)
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const doctor = require('../cli/doctor.js');
const { makeTempDir, cleanup } = require('./helpers.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');

// ---- findStuckExecutingPhases ----

test('findStuckExecutingPhases: flags executing phase behind a later complete phase', () => {
  const state = {
    phases: [
      { number: '5', status: 'executing' },
      { number: '6', status: 'complete' },
    ],
  };
  const stuck = doctor.findStuckExecutingPhases(state);
  assert.strictEqual(stuck.length, 1);
  assert.strictEqual(stuck[0].number, '5');
});

test('findStuckExecutingPhases: does not flag when executing phase is the latest', () => {
  const state = {
    phases: [
      { number: '5', status: 'complete' },
      { number: '6', status: 'executing' },
    ],
  };
  assert.deepStrictEqual(doctor.findStuckExecutingPhases(state), []);
});

test('findStuckExecutingPhases: empty phases array returns []', () => {
  assert.deepStrictEqual(doctor.findStuckExecutingPhases({ phases: [] }), []);
});

test('findStuckExecutingPhases: missing phases field returns [] (does not throw)', () => {
  assert.deepStrictEqual(doctor.findStuckExecutingPhases({}), []);
});

test('findStuckExecutingPhases: no complete phases at all returns [] (nothing to compare against)', () => {
  const state = { phases: [{ number: '1', status: 'executing' }] };
  assert.deepStrictEqual(doctor.findStuckExecutingPhases(state), []);
});

// ---- runPreflight integration: intent-table.json + Phase state + Memory INDEX.md ----

function setupRcodeProject(dir) {
  fs.mkdirSync(path.join(dir, '.rcode'), { recursive: true });
}

test('runPreflight: warns when .rcode/data/intent-table.json is missing', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  setupRcodeProject(dir);

  const checks = doctor.runPreflight(dir, REPO_ROOT);
  const check = checks.find((c) => c.label === 'intent-table.json');
  assert.ok(check, 'expected an intent-table.json check');
  assert.strictEqual(check.status, 'warn');
  assert.match(check.message, /missing/);
});

test('runPreflight: ok when .rcode/data/intent-table.json is present', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  setupRcodeProject(dir);
  fs.mkdirSync(path.join(dir, '.rcode', 'data'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.rcode', 'data', 'intent-table.json'), '[]');

  const checks = doctor.runPreflight(dir, REPO_ROOT);
  const check = checks.find((c) => c.label === 'intent-table.json');
  assert.strictEqual(check.status, 'ok');
});

test('runPreflight: flags stuck-executing phase state via state.json', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  setupRcodeProject(dir);
  fs.writeFileSync(
    path.join(dir, '.rcode', 'state.json'),
    JSON.stringify({
      phases: [
        { number: '3', status: 'executing' },
        { number: '4', status: 'complete' },
      ],
    }),
  );

  const checks = doctor.runPreflight(dir, REPO_ROOT);
  const check = checks.find((c) => c.label === 'Phase state');
  assert.ok(check);
  assert.strictEqual(check.status, 'warn');
  assert.match(check.message, /stuck 'executing'/);
});

test('runPreflight: Phase state ok when nothing stuck', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  setupRcodeProject(dir);
  fs.writeFileSync(
    path.join(dir, '.rcode', 'state.json'),
    JSON.stringify({ phases: [{ number: '1', status: 'complete' }] }),
  );

  const checks = doctor.runPreflight(dir, REPO_ROOT);
  const check = checks.find((c) => c.label === 'Phase state');
  assert.strictEqual(check.status, 'ok');
});

test('runPreflight: warns when .rcode/memory/INDEX.md is older than 30 days', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  setupRcodeProject(dir);
  fs.mkdirSync(path.join(dir, '.rcode', 'memory'), { recursive: true });
  const indexPath = path.join(dir, '.rcode', 'memory', 'INDEX.md');
  fs.writeFileSync(indexPath, '# index\n');
  const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
  fs.utimesSync(indexPath, old, old);

  const checks = doctor.runPreflight(dir, REPO_ROOT);
  const check = checks.find((c) => c.label === 'Memory INDEX.md');
  assert.ok(check);
  assert.strictEqual(check.status, 'warn');
  assert.match(check.message, /STALE/);
});

test('runPreflight: Memory INDEX.md ok when fresh', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  setupRcodeProject(dir);
  fs.mkdirSync(path.join(dir, '.rcode', 'memory'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.rcode', 'memory', 'INDEX.md'), '# index\n');

  const checks = doctor.runPreflight(dir, REPO_ROOT);
  const check = checks.find((c) => c.label === 'Memory INDEX.md');
  assert.strictEqual(check.status, 'ok');
});

test('runPreflight: Namespace duplication check is present and ok on a clean project', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));

  const checks = doctor.runPreflight(dir, REPO_ROOT);
  const check = checks.find((c) => c.label === 'Namespace duplication');
  assert.ok(check, 'expected a Namespace duplication check even without .rcode/ initialized');
});
