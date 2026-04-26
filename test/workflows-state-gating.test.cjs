/**
 * Workflow state-gate scan.
 *
 * Catches regressions of #443 / #448 — workflows that mark a phase
 * `status: complete` without first verifying a passing VERIFICATION.md.
 *
 * Heuristic: if a workflow file calls `phase complete` (the rihal-tools
 * subcommand that flips state.json), there should be a check for
 * VERIFICATION.md or `verify-work` *before* that call.
 *
 * Run: node --test test/workflows-state-gating.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const WORKFLOWS_DIR = path.join(PROJECT_ROOT, 'rihal', 'workflows');

function readWorkflow(name) {
  const p = path.join(WORKFLOWS_DIR, name);
  return { path: p, text: fs.readFileSync(p, 'utf8') };
}

test('workflows-state-gating: execute.md gates phase complete on VERIFICATION.md', () => {
  const wf = readWorkflow('execute.md');
  // The actual CLI call (not prose mentions of "phase complete")
  const completeCallRe = /rihal-tools\.cjs"\s+phase\s+complete/;
  const hasCompleteCall = completeCallRe.test(wf.text);
  assert.ok(hasCompleteCall, 'execute.md must call rihal-tools phase complete somewhere');

  // The UAT gate must exist before that call
  const completeIdx = wf.text.search(completeCallRe);
  const beforeComplete = wf.text.slice(0, completeIdx);

  const hasUatGate =
    /VERIFICATION_STATUS|uat_gate|UAT gate/i.test(beforeComplete);

  assert.ok(
    hasUatGate,
    'execute.md must include a UAT gate (VERIFICATION.md check) BEFORE the phase-complete CLI call. See #443 / #448.',
  );
});

test('workflows-state-gating: plan.md has sprint-checker malfunction guard', () => {
  const wf = readWorkflow('plan.md');
  const hasGuard =
    /malfunction|evidence.*tool.*use|verified_files|YAML\s+issues:\s+block/i.test(wf.text);
  assert.ok(
    hasGuard,
    'plan.md must include sprint-checker malfunction detection (evidence markers). See #440.',
  );
});

test('workflows-state-gating: plan.md has wave-overlap check', () => {
  const wf = readWorkflow('plan.md');
  const hasCheck = /check-wave-overlaps|wave.*overlap|conflicting_files/i.test(wf.text);
  assert.ok(
    hasCheck,
    'plan.md must include a wave parallelism file-overlap check. See #442.',
  );
});
