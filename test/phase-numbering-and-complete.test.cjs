/**
 * Phase auto-numbering guard (#944) + phase-complete milestone nudge (#943).
 *
 * #944 — the auto-number guard must allow an intentional high-base scheme
 *        (phases tracked as 1031, 1032, …) but still reject a phantom high
 *        entry that lives only in ROADMAP/dir, not state.json.
 * #943 — `phase complete` emits a milestone-complete nudge when no open phases
 *        remain.
 *
 * Run: node --test test/phase-numbering-and-complete.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const TOOLS = path.resolve(__dirname, '../rcode/bin/rcode-tools.cjs');

function makeProject(phases, roadmapExtra = '') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-num-'));
  fs.mkdirSync(path.join(root, '.rcode'), { recursive: true });
  fs.mkdirSync(path.join(root, '.planning', 'phases'), { recursive: true });
  fs.writeFileSync(path.join(root, '.rcode', 'config.yaml'), 'project_name: "num-test"\n');
  fs.writeFileSync(
    path.join(root, '.rcode', 'state.json'),
    JSON.stringify({ version: '1', schema_version: 2, project: 'num-test', current_phase: null, phases, milestones: [] }, null, 2),
  );
  fs.writeFileSync(path.join(root, '.planning', 'ROADMAP.md'), '# num-test — Roadmap\n\n**Milestone: M1**\n' + roadmapExtra);
  return root;
}

function run(root, args) {
  const out = execFileSync(process.execPath, [TOOLS, ...args], {
    env: { ...process.env, RCODE_PROJECT_ROOT: root }, encoding: 'utf8',
  });
  return JSON.parse(out);
}

test('#944 auto-number allows an intentional high-base scheme (1031 → 1032)', () => {
  const phases = [];
  for (let i = 1031; i <= 1033; i++) phases.push({ number: String(i), name: 'p' + i, status: 'planned' });
  const root = makeProject(phases);
  const res = run(root, ['phase', 'add', 'next high phase']); // no --number → auto
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.phase_number, '1034', `expected contiguous 1034, got ${res.phase_number}`);
});

test('#944 auto-number still rejects a phantom ROADMAP entry far above tracked', () => {
  const phases = [{ number: '1', name: 'p1', status: 'planned' }];
  // ROADMAP has a stale phantom "Phase 9000" that state.json never saw.
  const root = makeProject(phases, '\n## Phase 9000 — phantom\n');
  assert.throws(
    () => run(root, ['phase', 'add', 'should abort']),
    /non-tracked entry|stale high-number/,
  );
});

test('#943 phase complete emits a milestone-complete nudge when no open phases remain', () => {
  const phases = [
    { number: '1', name: 'p1', status: 'complete' },
    { number: '2', name: 'p2', status: 'planned' },
  ];
  const root = makeProject(phases);
  const res = run(root, ['phase', 'complete', '2']);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.open_phases_remaining, 0);
  assert.ok(res.nudge && /complete-milestone/.test(res.nudge), 'expected milestone-complete nudge');
});

test('#943 phase complete stays quiet when open phases remain', () => {
  const phases = [
    { number: '1', name: 'p1', status: 'planned' },
    { number: '2', name: 'p2', status: 'planned' },
  ];
  const root = makeProject(phases);
  const res = run(root, ['phase', 'complete', '1']);
  assert.strictEqual(res.ok, true);
  assert.ok(res.open_phases_remaining >= 1);
  assert.ok(!res.nudge, 'no nudge while phases remain open');
});
