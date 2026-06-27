/**
 * Phase-add milestone-health nudge (#942).
 *
 * The "milestone has too many open phases → close it" guidance must be emitted
 * by the CLI itself (not just the add-phase.md workflow prose), so adding phases
 * via `phase add`, the bulk path, or `state insert-phase` can't bypass it.
 *
 * Run: node --test test/phase-add-milestone-nudge.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const TOOLS = path.resolve(__dirname, '../rcode/bin/rcode-tools.cjs');

function makeProject(openPhaseCount) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-nudge-'));
  fs.mkdirSync(path.join(root, '.rcode'), { recursive: true });
  fs.mkdirSync(path.join(root, '.planning', 'phases'), { recursive: true });
  fs.writeFileSync(path.join(root, '.rcode', 'config.yaml'), 'project_name: "nudge-test"\n');
  const phases = [];
  for (let i = 1; i <= openPhaseCount; i++) {
    phases.push({ number: String(i), name: 'p' + i, status: 'planned' });
  }
  fs.writeFileSync(
    path.join(root, '.rcode', 'state.json'),
    JSON.stringify({ version: '1', schema_version: 2, project: 'nudge-test', current_phase: null, phases, milestones: [] }, null, 2),
  );
  fs.writeFileSync(path.join(root, '.planning', 'ROADMAP.md'), '# nudge-test — Roadmap\n\n**Milestone: M1**\n');
  return root;
}

function phaseAdd(root, name, number) {
  const out = execFileSync(process.execPath, [TOOLS, 'phase', 'add', name, '--number', String(number)], {
    env: { ...process.env, RCODE_PROJECT_ROOT: root },
    encoding: 'utf8',
  });
  return JSON.parse(out);
}

test('phase add emits should-close nudge once the milestone has ≥12 open phases', () => {
  const root = makeProject(12); // already at the threshold
  const res = phaseAdd(root, 'thirteenth', 13);
  assert.strictEqual(res.ok, true);
  assert.ok(res.milestone_health, 'expected milestone_health in phase-add output');
  assert.strictEqual(res.milestone_health.recommendation, 'should-close');
  assert.ok(res.nudge && /complete-milestone/.test(res.nudge), 'expected a complete-milestone nudge string');
});

test('phase add stays quiet (no nudge) for a small, healthy milestone', () => {
  const root = makeProject(2);
  const res = phaseAdd(root, 'third', 3);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.milestone_health.recommendation, 'healthy');
  assert.ok(!res.nudge, 'a healthy milestone should not emit a nudge');
});
