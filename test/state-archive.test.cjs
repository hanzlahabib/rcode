/**
 * state archive-phases / restore-phase (#1104): finished-phase sprint bodies move
 * to .rcode/state-archive/ and come back losslessly. Explicit opt-in; `state read`
 * is untouched until the user runs it.
 *
 * Run: node --test test/state-archive.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { makeTempDir, registerCleanup } = require('./helpers.cjs');

const BIN_SRC = path.resolve(__dirname, '..', 'rcode', 'bin');

function state() {
  const phases = Array.from({ length: 6 }, (_, i) => {
    const n = String(i + 1);
    return {
      number: n, name: `Phase ${n}`, status: i < 5 ? 'complete' : 'in_progress', goal: `Goal ${n}`,
      sprints: [{ id: `${n}.1`, status: 'completed', stories: [{ id: `${n}.1.1`, title: 'a' }, { id: `${n}.1.2`, title: 'b' }] }],
    };
  });
  return { version: '1', project: 'p', current_phase: '6', current_plan: 1, phases, decisions: [], blockers: [] };
}

function setup(t) {
  const cwd = makeTempDir('rcode-state-archive-');
  registerCleanup(t, cwd);
  fs.mkdirSync(path.join(cwd, '.rcode'), { recursive: true });
  fs.cpSync(BIN_SRC, path.join(cwd, '.rcode', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.rcode', 'config.yaml'), 'project_name: p\n');
  fs.writeFileSync(path.join(cwd, '.rcode', 'state.json'), JSON.stringify(state(), null, 2));
  return cwd;
}

function run(cwd, ...args) {
  return JSON.parse(execFileSync('node', [path.join(cwd, '.rcode', 'bin', 'rcode-tools.cjs'), 'state', ...args], { cwd, encoding: 'utf8' }));
}

test('dry-run lists what would move and writes nothing', (t) => {
  const cwd = setup(t);
  const r = run(cwd, 'archive-phases', '--dry-run');
  assert.deepStrictEqual(r.archived.map((a) => a.number), ['1', '2', '3']); // 5 finished, keep last 2
  assert.strictEqual(r.archived[0].stories, 2);
  assert.ok(!fs.existsSync(path.join(cwd, '.rcode', 'state-archive')));
  assert.strictEqual(run(cwd, 'read').phases[0].sprints.length, 1);
});

test('archive keeps recent + current phases inline and stubs the rest', (t) => {
  const cwd = setup(t);
  run(cwd, 'archive-phases');
  const s = run(cwd, 'read');
  assert.deepStrictEqual(s.phases.map((p) => p.sprints.length), [0, 0, 0, 1, 1, 1]);
  assert.strictEqual(s.phases[0].status, 'complete');
  assert.strictEqual(s.phases[0].archived.story_count, 2);
  assert.ok(fs.existsSync(path.join(cwd, s.phases[0].archived.path)));
  // idempotent
  assert.deepStrictEqual(run(cwd, 'archive-phases').archived, []);
  // projections still work
  assert.deepStrictEqual(Object.keys(run(cwd, 'get', 'phases').phases[0]), ['number', 'name', 'status']);
});

test('--keep 0 archives every finished phase except the current one', (t) => {
  const cwd = setup(t);
  assert.strictEqual(run(cwd, 'archive-phases', '--keep', '0').archived.length, 5);
  assert.strictEqual(run(cwd, 'read').phases[5].sprints.length, 1);
  assert.strictEqual(run(cwd, 'archive-phases', '--keep', 'x').ok, false);
});

test('restore-phase is lossless', (t) => {
  const cwd = setup(t);
  const before = run(cwd, 'read').phases[0].sprints;
  run(cwd, 'archive-phases');
  const r = run(cwd, 'restore-phase', '1');
  assert.strictEqual(r.ok, true);
  const p = run(cwd, 'read').phases[0];
  assert.deepStrictEqual(p.sprints, before);
  assert.ok(!('archived' in p));
  assert.strictEqual(run(cwd, 'restore-phase', '1').ok, false);
  assert.strictEqual(run(cwd, 'restore-phase', '99').ok, false);
});
