/**
 * Behavioral workflow tests.
 *
 * Verifies that key decision points, gates, and delegation contracts
 * are expressed in workflow files. Catches regressions in:
 *   - execute.md wave logic and record-execution call
 *   - plan.md existing-plans gate and phase_status contract
 *   - council.md dynamic agent list (no hardcoded fallback)
 *   - execute-sprint.md task completion precedence table
 *
 * Run: node --test test/workflow-behavioral.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WF = path.join(ROOT, 'rcode', 'workflows');

function wf(name) {
  return fs.readFileSync(path.join(WF, name), 'utf8');
}

// ─── execute.md ───────────────────────────────────────────────────────────────

test('execute.md calls record-execution after phase complete', () => {
  const text = wf('execute.md');
  const completeIdx = text.search(/rcode-tools\.cjs"\s+phase\s+complete/);
  assert.ok(completeIdx > -1, 'execute.md must call phase complete');
  const after = text.slice(completeIdx);
  assert.ok(
    /record-execution/.test(after),
    'record-execution call must appear AFTER phase complete in execute.md (issue #350)',
  );
});

test('execute.md has snapshot tag creation before execution', () => {
  const text = wf('execute.md');
  assert.ok(
    /rcode\/snapshot\/phase/.test(text),
    'execute.md must create a pre-execution snapshot git tag',
  );
});

test('execute.md spawns rcode-executor (not general-purpose)', () => {
  const text = wf('execute.md');
  assert.ok(
    /subagent_type.*rcode-executor/.test(text),
    'execute.md must spawn rcode-executor, not general-purpose',
  );
  assert.ok(
    !/subagent_type.*general-purpose/.test(text),
    'execute.md must not fall back to general-purpose agent',
  );
});

// ─── execute-sprint.md ────────────────────────────────────────────────────────

test('execute-sprint.md defines task completion precedence table', () => {
  const text = wf('execute-sprint.md');
  assert.ok(
    /verify.*automated.*Highest authority|Highest authority.*verify.*automated/i.test(text),
    'execute-sprint.md must declare <verify><automated> as highest completion authority (issue #535)',
  );
});

test('execute-sprint.md has acceptance_criteria as lowest authority', () => {
  const text = wf('execute-sprint.md');
  assert.ok(
    /acceptance_criteria.*[Ll]owest|[Ll]owest.*acceptance_criteria/i.test(text),
    'execute-sprint.md must declare <acceptance_criteria> as lowest authority (issue #535)',
  );
});

// ─── plan.md ──────────────────────────────────────────────────────────────────

test('plan.md includes phase_status in its INIT field list', () => {
  const text = wf('plan.md');
  assert.ok(
    /phase_status/.test(text),
    'plan.md must parse phase_status from INIT JSON (issue #552 / personalization fix)',
  );
});

test('plan.md guards against robotic "as per the workflow" phrasing', () => {
  const text = wf('plan.md');
  // The file should contain a prohibition against this phrase, not a prompt to say it
  assert.ok(
    /do NOT say.*as per the workflow|never say.*as per the workflow/i.test(text),
    'plan.md must explicitly prohibit "as per the workflow" agent language (personalization fix)',
  );
});

test('plan.md Step 6 offers 3 options for existing plans', () => {
  const text = wf('plan.md');
  assert.ok(
    /Add more plans/.test(text) && /View existing/.test(text) && /Replan from scratch/.test(text),
    'plan.md Step 6 must offer Add/View/Replan options for existing plans',
  );
});

// ─── council.md ───────────────────────────────────────────────────────────────

test('council.md does not hardcode a static agent list', () => {
  const text = wf('council.md');
  // The old hardcoded block listed exactly these 5 agents as "always available"
  assert.ok(
    !/Currently registered council agents.*always available/i.test(text),
    'council.md must not hardcode a static "currently registered" agent list (issue #552)',
  );
});

test('council.md references installed_agents from INIT_JSON', () => {
  const text = wf('council.md');
  assert.ok(
    /installed_agents/.test(text),
    'council.md must use installed_agents from INIT_JSON, not a static list',
  );
});

// ─── health.md ────────────────────────────────────────────────────────────────

test('health.md runs 9 checks (not 6)', () => {
  const text = wf('health.md');
  assert.ok(
    /9\/9|9 checks/.test(text),
    'health.md must reference 9 checks (expanded from 6 in issue #561)',
  );
});

// ─── dashboard.md ─────────────────────────────────────────────────────────────

test('dashboard.md resolves local npm package installs', () => {
  const text = wf('dashboard.md');
  assert.ok(
    /node_modules\/@hanzlaa\/rcode\/server\/dashboard\.js/.test(text),
    'dashboard.md must check local node_modules before global install fallbacks',
  );
});
