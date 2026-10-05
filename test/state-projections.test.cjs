/**
 * State projections (#1104): `state brief|get <path>|field|phase-status` return
 * a slice of state.json instead of the full dump. `state read` must be unchanged.
 *
 * Run: node --test test/state-projections.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { makeTempDir, registerCleanup } = require('./helpers.cjs');

const BIN_SRC = path.resolve(__dirname, '..', 'rcode', 'bin');
const CHARS_PER_TOKEN = 4;

function setup(t, state) {
  const cwd = makeTempDir('rcode-state-proj-');
  registerCleanup(t, cwd);
  fs.mkdirSync(path.join(cwd, '.rcode'), { recursive: true });
  fs.cpSync(BIN_SRC, path.join(cwd, '.rcode', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.rcode', 'config.yaml'), 'project_name: demo\n');
  fs.writeFileSync(path.join(cwd, '.rcode', 'state.json'), JSON.stringify(state, null, 2));
  return cwd;
}

function run(cwd, ...args) {
  return execFileSync('node', [path.join(cwd, '.rcode', 'bin', 'rcode-tools.cjs'), 'state', ...args], {
    cwd, encoding: 'utf8',
  }).trim();
}

const tokens = (s) => Math.ceil(s.length / CHARS_PER_TOKEN);

function matureState() {
  const stories = (n) => Array.from({ length: 12 }, (_, i) => ({
    id: `${n}.1.${i + 1}`, title: `Story ${i + 1} of phase ${n}`, status: 'done', points: 3,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(8),
  }));
  const phases = Array.from({ length: 25 }, (_, i) => {
    const n = String(i + 1);
    return {
      number: n, name: `Phase ${n}`, status: i < 24 ? 'complete' : 'in_progress', goal: `Goal ${n}`,
      sprints: [{ id: `${n}.1`, status: 'complete', stories: stories(n) }, { id: `${n}.2`, status: 'complete', stories: stories(n) }],
    };
  });
  return {
    version: '1', project: 'big', current_phase: '25', current_plan: 2, milestone: 'v1',
    phases,
    decisions: Array.from({ length: 40 }, (_, i) => ({ summary: `decision ${i}`, phase: '1', date: '2026-01-01' })),
    blockers: [{ description: 'open one' }, { description: 'old one', resolved: true }],
    executions: [{ id: 'e1' }], council_sessions: [{ id: 'c1' }],
  };
}

test('fresh state: brief, get, field, phase-status', (t) => {
  const cwd = setup(t, {
    version: '1', project: 'demo', current_phase: '1', current_plan: 1,
    phases: [{ number: '1', name: 'Setup', status: 'planned', sprints: [] }],
    decisions: [], blockers: [],
  });
  const brief = JSON.parse(run(cwd, 'brief'));
  assert.strictEqual(brief.project, 'demo');
  assert.strictEqual(brief.phase.name, 'Setup');
  assert.deepStrictEqual(JSON.parse(run(cwd, 'get', 'current_phase', 'nope')), { current_phase: '1', nope: null });
  assert.strictEqual(run(cwd, 'field', 'project'), 'demo');
  assert.strictEqual(run(cwd, 'field', 'missing'), '');
  assert.deepStrictEqual(JSON.parse(run(cwd, 'phase-status', '1')), { number: '1', name: 'Setup', status: 'planned' });
  assert.strictEqual(run(cwd, 'phase-status', '9'), 'null');
});

test('state read and bare state get are still the full dump', (t) => {
  const cwd = setup(t, matureState());
  assert.strictEqual(JSON.parse(run(cwd, 'read')).phases[0].sprints.length, 2);
  assert.strictEqual(JSON.parse(run(cwd, 'get')).phases[0].sprints.length, 2);
});

test('mature state: brief is far smaller than read and drops story bodies', (t) => {
  const cwd = setup(t, matureState());
  const full = tokens(run(cwd, 'read'));
  const brief = run(cwd, 'brief');
  assert.ok(tokens(brief) < 4000, `brief is ${tokens(brief)} tokens`);
  assert.ok(tokens(brief) * 10 < full, `expected >=10x reduction, got ${full} -> ${tokens(brief)}`);
  const parsed = JSON.parse(brief);
  assert.strictEqual(parsed.phase.number, '25');
  assert.strictEqual(parsed.phase_history.length, 25);
  assert.strictEqual(parsed.open_blockers.length, 1);
  assert.ok(!('executions' in parsed));
  assert.ok(!brief.includes('Story 1 of phase 1"'), 'completed-phase story bodies must not appear');
  const hist = JSON.parse(run(cwd, 'brief', '--full-history'));
  assert.strictEqual(hist.executions.length, 1);
  assert.strictEqual(hist.council_sessions.length, 1);
  assert.strictEqual(JSON.parse(run(cwd, 'brief', '--phase', '3')).phase.number, '3');
});

test('state get phases returns the compact status list, dot-paths reach nested fields', (t) => {
  const cwd = setup(t, matureState());
  const out = JSON.parse(run(cwd, 'get', 'phases'));
  assert.deepStrictEqual(Object.keys(out.phases[0]), ['number', 'name', 'status']);
  assert.strictEqual(run(cwd, 'field', 'phases.24.status'), 'in_progress');
});

test('brief falls back to the in_progress phase when current_phase is a title', (t) => {
  const s = matureState();
  s.current_phase = 'Some free text title';
  const cwd = setup(t, s);
  assert.strictEqual(JSON.parse(run(cwd, 'brief')).phase.number, '25');
});
