/**
 * Tests for the milestone-discipline subcommands (issue #718 / Wave 7).
 *
 * Pins three rihal-tools subcommands:
 *   - validate-phase-id: pure check on a single ID
 *   - validate-roadmap:  scan ROADMAP.md for offenders
 *   - milestone-health:  open vs done phase count + recommendation
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const TOOLS = path.join(REPO_ROOT, 'rihal', 'bin', 'rihal-tools.cjs');
const { makeTempDir, cleanup } = require('./helpers.cjs');

function run(args, opts = {}) {
  // When opts.cwd is set, ALSO point RIHAL_PROJECT_ROOT at it so the tool
  // reads from the tempdir instead of the rcode repo it loaded from.
  // Without this, PROJECT_ROOT stays at the script's location (rihal-tools
  // resolves __dirname/../..) and validate-roadmap / milestone-health read
  // the wrong files. See #718.
  const env = { ...process.env, NODE_DISABLE_COLORS: '1' };
  if (opts.cwd) env.RIHAL_PROJECT_ROOT = opts.cwd;
  const r = spawnSync('node', [TOOLS, ...args], {
    encoding: 'utf8',
    cwd: opts.cwd || REPO_ROOT,
    env,
  });
  let json = null;
  try { json = JSON.parse(r.stdout.trim()); } catch { /* leave null */ }
  return { ...r, json };
}

// ────────────────────────────────────────────────────────────────────────
// validate-phase-id
// ────────────────────────────────────────────────────────────────────────

test('validate-phase-id: accepts integer phase ids', () => {
  for (const id of ['1', '19', '22', '103', '9999']) {
    const r = run(['validate-phase-id', id]);
    assert.strictEqual(r.json && r.json.valid, true, `expected ${id} valid`);
    assert.strictEqual(r.json.kind, 'integer');
  }
});

test('validate-phase-id: accepts decimal sub-phase ids', () => {
  for (const id of ['19.1', '22.3', '1.1', '103.99']) {
    const r = run(['validate-phase-id', id]);
    assert.strictEqual(r.json && r.json.valid, true, `expected ${id} valid`);
    assert.strictEqual(r.json.kind, 'decimal');
  }
});

test('validate-phase-id: rejects letter-prefix shapes (A1, B5, etc.)', () => {
  for (const id of ['A1', 'B5', 'a1', 'audit-1', 'phase-x']) {
    const r = run(['validate-phase-id', id]);
    assert.strictEqual(r.json && r.json.valid, false, `expected ${id} rejected`);
    assert.match(r.json.error, /does not match integer or decimal/);
  }
});

test('validate-phase-id: rejects leading zeros with a clear hint', () => {
  const r = run(['validate-phase-id', '06']);
  assert.strictEqual(r.json && r.json.valid, false);
  assert.match(r.json.error, /leading zeros not allowed.*use 6/);
});

test('validate-phase-id: rejects empty / missing input', () => {
  const r = run(['validate-phase-id', '']);
  assert.strictEqual(r.json && r.json.valid, false);
});

test('validate-phase-id: rejects negative numbers and floats with leading dot', () => {
  for (const id of ['-1', '.5', '1.', '1.0.0']) {
    const r = run(['validate-phase-id', id]);
    assert.strictEqual(r.json && r.json.valid, false, `expected ${id} rejected`);
  }
});

// ────────────────────────────────────────────────────────────────────────
// validate-roadmap
// ────────────────────────────────────────────────────────────────────────

test('validate-roadmap: returns valid=true on a fresh project with no roadmap', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  const r = run(['validate-roadmap'], { cwd: dir });
  assert.strictEqual(r.json && r.json.valid, true);
});

test('validate-roadmap: catches A1/B5-style offenders', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.planning', 'ROADMAP.md'),
    [
      '# Roadmap',
      '',
      '## Phase 19 — real',
      '',
      '## Phase A1 — freestyled',
      '',
      '## Phase B5 — also freestyled',
      '',
      '## Phase 22.3 — sub-phase',
      '',
      '## Phase 06 — leading zero',
      '',
    ].join('\n'),
  );

  const r = run(['validate-roadmap'], { cwd: dir });
  assert.strictEqual(r.json.valid, false);
  assert.strictEqual(r.json.offenders.length, 3);

  const ids = r.json.offenders.map(o => o.id);
  assert.ok(ids.includes('A1'));
  assert.ok(ids.includes('B5'));
  assert.ok(ids.includes('06'));
  assert.ok(!ids.includes('19'));
  assert.ok(!ids.includes('22.3'));
});

test('validate-roadmap: reports line numbers so callers can fix in place', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.planning', 'ROADMAP.md'),
    '# Roadmap\n\n## Phase 19\n\n## Phase A1\n',
  );
  const r = run(['validate-roadmap'], { cwd: dir });
  const offender = r.json.offenders.find(o => o.id === 'A1');
  assert.ok(offender);
  assert.strictEqual(offender.line, 5);
});

// ────────────────────────────────────────────────────────────────────────
// milestone-health
// ────────────────────────────────────────────────────────────────────────

function writeState(dir, state) {
  fs.mkdirSync(path.join(dir, '.rihal'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.rihal', 'state.json'), JSON.stringify(state));
}

test('milestone-health: healthy when ≤7 open phases', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  writeState(dir, {
    milestone: 'M1',
    phases: [
      { id: '1', status: 'completed' },
      { id: '2', status: 'completed' },
      { id: '3', status: 'in_progress' },
      { id: '4', status: 'planned' },
    ],
  });
  const r = run(['milestone-health'], { cwd: dir });
  assert.strictEqual(r.json.recommendation, 'healthy');
  assert.strictEqual(r.json.open_phases, 2);
  assert.strictEqual(r.json.completed_phases, 2);
});

test('milestone-health: consider-closing when 8-11 open phases', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  const phases = [];
  for (let i = 1; i <= 9; i++) phases.push({ id: String(i), status: 'planned' });
  writeState(dir, { milestone: 'M1', phases });
  const r = run(['milestone-health'], { cwd: dir });
  assert.strictEqual(r.json.recommendation, 'consider-closing');
});

test('milestone-health: should-close when ≥12 open phases', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  const phases = [];
  for (let i = 1; i <= 15; i++) phases.push({ id: String(i), status: 'planned' });
  writeState(dir, { milestone: 'M1', phases });
  const r = run(['milestone-health'], { cwd: dir });
  assert.strictEqual(r.json.recommendation, 'should-close');
  assert.strictEqual(r.json.open_phases, 15);
});

test('milestone-health: treats verified + shipped as done (not open)', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  writeState(dir, {
    milestone: 'M1',
    phases: [
      { id: '1', status: 'completed' },
      { id: '2', status: 'verified' },
      { id: '3', status: 'shipped' },
      { id: '4', status: 'planned' },
    ],
  });
  const r = run(['milestone-health'], { cwd: dir });
  assert.strictEqual(r.json.completed_phases, 3);
  assert.strictEqual(r.json.open_phases, 1);
  assert.strictEqual(r.json.recommendation, 'healthy');
});

test('milestone-health: returns gracefully when no state.json', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  const r = run(['milestone-health'], { cwd: dir });
  assert.strictEqual(r.json.ok, true);
  assert.strictEqual(r.json.milestone, null);
});
