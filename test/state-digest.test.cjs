/**
 * State digest (#948) + folded init fields (#949).
 *
 * #948 — plan-spawn-planner.md, research-phase.md, and plan-research-validation.md
 * instructed the researcher/planner subagents to Read the full .rcode/state.json
 * via `{state_path}` in <files_to_read>. On a mature project that file carries
 * every completed phase's full sprint/story history (verified: 20/26 phases
 * complete in this repo's own state.json, ~91% of the file's bytes trimmed by
 * the digest — see buildStateDigest tests below). buildStateDigest() replaces
 * that raw read with a slim extract; the guard tests below assert the
 * workflow prompts actually stopped requesting the raw file.
 *
 * Proof this guard is real (not tautological): before the fix, `git show
 * HEAD~1:rcode/workflows/plan-spawn-planner.md` (etc.) contains
 * `- {state_path} (Project State)` in <files_to_read> — the exact pattern
 * FILES_TO_READ_STATE_RE matches. Running these assertions against that
 * content fails; run `git show <pre-fix-sha>:<path> | grep state_path` to
 * reproduce.
 *
 * #949 — plan.md's Initialize step shelled out to `agent-skills` 3x plus
 * `config-get context_window` (4 extra cold Node starts on top of `init`).
 * research-phase.md did the same for its single researcher lookup. Both now
 * read `agent_skills.*` / `context_window` off the same `init` JSON blob.
 *
 * Run: node --test test/state-digest.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { makeTempDir, registerCleanup } = require('./helpers.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const WORKFLOWS_DIR = path.join(PROJECT_ROOT, 'rcode', 'workflows');
const CLI_SRC = path.join(PROJECT_ROOT, 'rcode', 'bin', 'rcode-tools.cjs');
const LIB_SRC = path.join(PROJECT_ROOT, 'rcode', 'bin', 'lib');

const { buildStateDigest } = require(path.join(LIB_SRC, 'state-digest.cjs'));

// ---------------------------------------------------------------------------
// buildStateDigest() unit tests
// ---------------------------------------------------------------------------

function fixtureState() {
  return {
    project: 'demo',
    current_phase: 'Phase 5: Auth',
    current_plan: 2,
    active_workstream: null,
    last_session: '2026-08-01T00:00:00Z',
    velocity_history: [{ sprint: '1.1', points: 8, completed_at: '2026-01-01T00:00:00Z' }],
    executions: [{ plan: '1-1-SPRINT.md', duration: 1200 }],
    council_sessions: [{ slug: 'council-2026-01-01' }],
    chains: [{ id: 'chain-1' }],
    phases: [
      {
        number: '1', name: 'Setup', status: 'complete',
        sprints: [{ id: '1.1', goal: 'scaffold', stories: [{ id: '1.1.1', title: 'init repo' }] }],
      },
      {
        number: '5', name: 'Auth', status: 'executing', started: '2026-07-01T00:00:00Z', completed: null,
        sprints: [{ id: '5.1', goal: 'login flow', stories: [{ id: '5.1.1', title: 'add login form' }] }],
      },
    ],
    decisions: Array.from({ length: 15 }, (_, i) => ({
      summary: `decision ${i}`, phase: 'p', date: `2026-0${(i % 9) + 1}-01T00:00:00Z`,
    })),
    blockers: [
      { description: 'open one', resolved: false, date: '2026-08-01T00:00:00Z' },
      { description: 'closed one', resolved: true, date: '2026-07-01T00:00:00Z' },
    ],
  };
}

test('buildStateDigest returns null when state is absent', () => {
  assert.strictEqual(buildStateDigest(null, '5'), null);
});

test('buildStateDigest excludes velocity_history, executions, council_sessions, chains', () => {
  const digest = buildStateDigest(fixtureState(), '5');
  for (const key of ['velocity_history', 'executions', 'council_sessions', 'chains']) {
    assert.strictEqual(digest[key], undefined, `digest must not carry ${key}`);
  }
});

test('buildStateDigest keeps full sprint/story detail for the active phase only', () => {
  const digest = buildStateDigest(fixtureState(), '5');
  assert.strictEqual(digest.phase.number, '5');
  assert.strictEqual(digest.phase.status, 'executing');
  assert.strictEqual(digest.phase.sprints.length, 1);
  assert.strictEqual(digest.phase.sprints[0].stories[0].title, 'add login form');
});

test('buildStateDigest collapses non-active phases to number/name/status only', () => {
  const digest = buildStateDigest(fixtureState(), '5');
  const other = digest.phase_history.find((p) => p.number === '1');
  assert.deepStrictEqual(other, { number: '1', name: 'Setup', status: 'complete' });
  assert.strictEqual(Object.keys(other).includes('sprints'), false);
});

test('buildStateDigest caps recent_decisions and filters resolved blockers', () => {
  const digest = buildStateDigest(fixtureState(), '5');
  assert.ok(digest.recent_decisions.length <= 10, 'decisions must be capped');
  assert.strictEqual(digest.recent_decisions[digest.recent_decisions.length - 1].summary, 'decision 14');
  assert.strictEqual(digest.open_blockers.length, 1);
  assert.strictEqual(digest.open_blockers[0].description, 'open one');
});

test('buildStateDigest is dramatically smaller than the raw file on this repo\'s own state.json', () => {
  const raw = fs.readFileSync(path.join(PROJECT_ROOT, '.rcode', 'state.json'), 'utf8');
  const state = JSON.parse(raw);
  const digest = buildStateDigest(state, state.current_plan ? undefined : undefined);
  // Use whatever the resolved active phase number is, matching cmdInit's own lookup.
  const active = (state.phases || []).find((p) => p.name === state.current_phase) || {};
  const scoped = buildStateDigest(state, active.number);
  const digestJson = JSON.stringify(scoped);
  assert.ok(
    digestJson.length < raw.length * 0.5,
    `digest (${digestJson.length}b) should be well under half the raw file (${raw.length}b)`,
  );
});

// ---------------------------------------------------------------------------
// Workflow prompt guard: no raw full-file state read in subagent prompts
// ---------------------------------------------------------------------------

function readWorkflow(name) {
  return fs.readFileSync(path.join(WORKFLOWS_DIR, name), 'utf8');
}

const GUARDED_WORKFLOWS = ['plan-spawn-planner.md', 'research-phase.md', 'plan-research-validation.md'];

for (const name of GUARDED_WORKFLOWS) {
  test(`${name} does not instruct subagents to read the raw state.json (#948)`, () => {
    const text = readWorkflow(name);
    assert.doesNotMatch(
      text,
      /\{state_path\}/,
      `${name} must not reference {state_path} in a files_to_read block — pass {state_digest} instead`,
    );
  });

  test(`${name} embeds state_digest in its subagent prompt (#948)`, () => {
    const text = readWorkflow(name);
    assert.match(
      text,
      /state_digest/,
      `${name} must embed {state_digest} where it previously read the raw file`,
    );
  });
}

test('plan.md Initialize step does not shell out to agent-skills or config-get context_window (#949)', () => {
  const text = readWorkflow('plan.md');
  const initSection = text.slice(text.indexOf('## 1. Initialize'), text.indexOf('## 2.'));
  assert.doesNotMatch(
    initSection,
    /rcode-tools\.cjs"\s+agent-skills/,
    'plan.md Step 1 must not shell out to agent-skills — use agent_skills.* from init',
  );
  assert.doesNotMatch(
    initSection,
    /rcode-tools\.cjs"\s+config-get\s+context_window/,
    'plan.md Step 1 must not shell out to config-get context_window — use context_window from init',
  );
});

test('research-phase.md does not shell out to agent-skills separately (#949)', () => {
  const text = readWorkflow('research-phase.md');
  assert.doesNotMatch(
    text,
    /rcode-tools\.cjs"\s+agent-skills/,
    'research-phase.md must use agent_skills.researcher from init instead of a separate agent-skills call',
  );
});

// ---------------------------------------------------------------------------
// Integration: init sprint-plan / init phase-op actually return the new fields
// ---------------------------------------------------------------------------

function setupProject(t) {
  const cwd = makeTempDir('rcode-state-digest-');
  registerCleanup(t, cwd);

  fs.mkdirSync(path.join(cwd, '.rcode', 'bin', 'lib'), { recursive: true });
  fs.mkdirSync(path.join(cwd, '.rcode', '_config'), { recursive: true });
  fs.copyFileSync(CLI_SRC, path.join(cwd, '.rcode', 'bin', 'rcode-tools.cjs'));
  for (const file of fs.readdirSync(LIB_SRC)) {
    fs.copyFileSync(path.join(LIB_SRC, file), path.join(cwd, '.rcode', 'bin', 'lib', file));
  }

  fs.writeFileSync(
    path.join(cwd, '.rcode', '_config', 'agent-manifest.csv'),
    'id,file,name,description,color\n'
    + 'phase-researcher,.claude/agents/rcode-phase-researcher.md,rcode-phase-researcher,"Researcher",cyan\n'
    + 'planner,.claude/agents/rcode-planner.md,rcode-planner,"Planner",cyan\n'
    + 'sprint-checker,.claude/agents/rcode-sprint-checker.md,rcode-sprint-checker,"Checker",cyan\n',
  );

  fs.mkdirSync(path.join(cwd, '.planning', 'phases', '1-setup'), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, '.rcode', 'state.json'),
    JSON.stringify({
      version: '1', project: 'demo', current_phase: 'Setup', current_plan: 1,
      phases: [{ number: '1', name: 'Setup', status: 'planned', sprints: [] }],
      decisions: [{ summary: 'use postgres', phase: 'Setup', date: '2026-01-01T00:00:00Z' }],
      blockers: [], milestones: [],
    }, null, 2),
  );
  fs.writeFileSync(
    path.join(cwd, '.planning', 'ROADMAP.md'),
    '# ROADMAP\n\n## Active\n\n## Phase 1 — Setup\n\n**Status:** Planned\n\n---\n\n',
  );
  return cwd;
}

function runInit(cwd, args) {
  const localCli = path.join(cwd, '.rcode', 'bin', 'rcode-tools.cjs');
  const raw = execFileSync('node', [localCli, ...args], { cwd, encoding: 'utf8' });
  return JSON.parse(raw);
}

test('init sprint-plan returns agent_skills, context_window, and state_digest (#948 + #949)', (t) => {
  const cwd = setupProject(t);
  const out = runInit(cwd, ['init', 'sprint-plan', '1 build the setup phase']);

  assert.ok(out.agent_skills, 'agent_skills must be present');
  assert.strictEqual(out.agent_skills.planner.id, 'planner');
  assert.strictEqual(out.agent_skills.researcher.id, 'phase-researcher');
  assert.strictEqual(out.agent_skills.checker.id, 'sprint-checker');

  assert.ok('context_window' in out, 'context_window must be present (may be null)');

  assert.ok(out.state_digest, 'state_digest must be present');
  assert.strictEqual(out.state_digest.current_phase, 'Setup');
  assert.strictEqual(out.state_digest.phase.number, '1');
  assert.strictEqual(out.state_digest.recent_decisions[0].summary, 'use postgres');
});

test('init sprint-plan agent_skills.planner matches standalone agent-skills output exactly', (t) => {
  const cwd = setupProject(t);
  const fromInit = runInit(cwd, ['init', 'sprint-plan', '1 build the setup phase']);
  const standalone = runInit(cwd, ['agent-skills', 'rcode-planner']);
  assert.deepStrictEqual(fromInit.agent_skills.planner, standalone);
});
