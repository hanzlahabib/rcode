/**
 * Unit tests for rcode-tools.cjs subcommands.
 *
 * Covers high-risk paths: state read/write, config-get, next-phase-id,
 * next-plan-id, story add, resolve-id — all previously untested.
 *
 * Run: node --test test/rcode-tools-subcommands.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync, execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { makeTempDir, registerCleanup } = require('./helpers.cjs');

const CLI_SRC = path.resolve(__dirname, '..', 'rcode', 'bin', 'rcode-tools.cjs');

const LIB_SRC = path.resolve(__dirname, '..', 'rcode', 'bin', 'lib');

function setup(t, opts = {}) {
  const cwd = makeTempDir('rcode-tools-test-');
  registerCleanup(t, cwd);

  // Copy CLI and its lib/ into .rcode/bin/ (the source guard requires same path)
  fs.mkdirSync(path.join(cwd, '.rcode', 'bin', 'lib'), { recursive: true });
  fs.copyFileSync(CLI_SRC, path.join(cwd, '.rcode', 'bin', 'rcode-tools.cjs'));
  for (const file of fs.readdirSync(LIB_SRC)) {
    fs.copyFileSync(path.join(LIB_SRC, file), path.join(cwd, '.rcode', 'bin', 'lib', file));
  }
  fs.mkdirSync(path.join(cwd, '.planning', 'phases'), { recursive: true });

  const state = opts.state || {
    phases: [],
    decisions: [],
    blockers: [],
    council_sessions: [],
    executions: [],
  };
  fs.writeFileSync(
    path.join(cwd, '.rcode', 'state.json'),
    JSON.stringify(state, null, 2),
  );

  if (opts.config) {
    fs.writeFileSync(
      path.join(cwd, '.rcode', 'config.yaml'),
      opts.config,
    );
  }

  return cwd;
}

function run(cwd, args) {
  const cli = path.join(cwd, '.rcode', 'bin', 'rcode-tools.cjs');
  return execFileSync('node', [cli, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, RCODE_NO_AUTO_INIT: '1' },
  });
}

function json(cwd, args) {
  return JSON.parse(run(cwd, args));
}

// ─── version ─────────────────────────────────────────────────────────────────

test('version exits cleanly and returns non-empty output', (t) => {
  const cwd = setup(t);
  const out = run(cwd, ['version']).trim();
  assert.ok(out.length > 0, 'version produced no output');
});

// ─── state read / write ───────────────────────────────────────────────────────

test('state read returns valid JSON with expected keys', (t) => {
  const cwd = setup(t);
  const result = json(cwd, ['state', 'read']);
  assert.ok(Array.isArray(result.phases), 'phases array missing');
  assert.ok(Array.isArray(result.decisions), 'decisions array missing');
  assert.ok(Array.isArray(result.blockers), 'blockers array missing');
});

test('state add-decision records a decision', (t) => {
  const cwd = setup(t);
  run(cwd, ['state', 'add-decision', 'Use PostgreSQL over MySQL']);
  const state = json(cwd, ['state', 'read']);
  assert.ok(state.decisions.length > 0, 'no decision recorded');
  assert.ok(
    state.decisions.some(d => d.summary && d.summary.includes('PostgreSQL')),
    'decision text not stored',
  );
});

test('state add-blocker records a blocker', (t) => {
  const cwd = setup(t);
  run(cwd, ['state', 'add-blocker', 'DB migration blocked by ops']);
  const state = json(cwd, ['state', 'read']);
  assert.ok(state.blockers.length > 0, 'no blocker recorded');
  assert.ok(
    state.blockers.some(b => b.description && b.description.includes('blocked')),
    'blocker text not stored',
  );
});

test('state planned-phase adds a phase entry', (t) => {
  const cwd = setup(t);
  run(cwd, ['state', 'planned-phase', '--phase', '3', '--name', 'Auth Module']);
  const state = json(cwd, ['state', 'read']);
  const phase = state.phases.find(p => String(p.number || p.id) === '3');
  assert.ok(phase, 'phase 3 not added');
  assert.strictEqual(phase.status, 'planned');
  assert.strictEqual(phase.name, 'Auth Module');
});

// ─── config-get ───────────────────────────────────────────────────────────────

test('config-get returns empty/false for missing key (does not throw)', (t) => {
  const cwd = setup(t);
  const out = run(cwd, ['config-get', 'workflow.research_by_default']).trim();
  // Missing key must produce an empty string OR the documented schema default
  // ("false" for research_by_default). Anything else — including "undefined",
  // "null", JSON output, or an error stack — is a regression. (Closes #725
  // weak-assertion gap: previous test only asserted `out !== undefined`,
  // which can never be false because `run()` always returns a string.)
  assert.ok(
    out === '' || out === 'false',
    `expected empty or "false" for missing key, got: ${JSON.stringify(out)}`,
  );
});

test('config-get reads nested key from config.yaml', (t) => {
  const cwd = setup(t, {
    config: 'workflow:\n  research_by_default: "true"\n',
  });
  const out = run(cwd, ['config-get', 'workflow.research_by_default']).trim();
  assert.strictEqual(out, 'true');
});

test('config-get key alias — commit_docs resolves git.commit_docs', (t) => {
  const cwd = setup(t, {
    config: 'git:\n  commit_docs: "false"\n',
  });
  // both the dotted and the alias key should work
  const withDot = run(cwd, ['config-get', 'git.commit_docs']).trim();
  const withAlias = run(cwd, ['config-get', 'commit_docs']).trim();
  assert.strictEqual(withDot, 'false');
  assert.strictEqual(withAlias, 'false');
});

test('config-set normalizes shell-preserved outer quotes', (t) => {
  const cwd = setup(t);
  const result = json(cwd, ['config-set', 'project_name', '"codex"']);
  assert.strictEqual(result.value, 'codex');

  const stored = fs.readFileSync(path.join(cwd, '.rcode', 'config.yaml'), 'utf8');
  assert.match(stored, /^project_name: codex$/m);

  const out = run(cwd, ['config-get', 'project_name']).trim();
  assert.strictEqual(out, 'codex');
});

// ─── next-phase-id ────────────────────────────────────────────────────────────

test('next-phase-id returns 1 when no phase dirs exist', (t) => {
  const cwd = setup(t);
  const result = json(cwd, ['state', 'next-phase-id']);
  assert.strictEqual(result.next_phase_id, '1');
});

test('next-phase-id increments beyond highest existing dir', (t) => {
  const cwd = setup(t);
  fs.mkdirSync(path.join(cwd, '.planning', 'phases', '03-something'), { recursive: true });
  fs.mkdirSync(path.join(cwd, '.planning', 'phases', '07-other'), { recursive: true });
  const result = json(cwd, ['state', 'next-phase-id']);
  assert.strictEqual(result.next_phase_id, '8');
});

test('next-phase-id returns unpadded integer (no leading zeros)', (t) => {
  const cwd = setup(t);
  fs.mkdirSync(path.join(cwd, '.planning', 'phases', '05-foo'), { recursive: true });
  const result = json(cwd, ['state', 'next-phase-id']);
  assert.strictEqual(result.next_phase_id, '6', 'should be "6" not "06"');
});

// ─── next-plan-id ─────────────────────────────────────────────────────────────

test('next-plan-id returns 6.1 for phase 6 with no plan dirs', (t) => {
  const cwd = setup(t);
  fs.mkdirSync(path.join(cwd, '.planning', 'phases', '06-my-phase'), { recursive: true });
  const result = json(cwd, ['state', 'next-plan-id', '6']);
  assert.strictEqual(result.next_plan_id, '6.1');
});

test('next-plan-id increments plan number correctly', (t) => {
  const cwd = setup(t);
  const phaseDir = path.join(cwd, '.planning', 'phases', '06-my-phase');
  fs.mkdirSync(path.join(phaseDir, '01-first-sprint'), { recursive: true });
  const result = json(cwd, ['state', 'next-plan-id', '6']);
  assert.strictEqual(result.next_plan_id, '6.2');
});

// ─── resolve-id ───────────────────────────────────────────────────────────────

test('resolve-id identifies a phase by padded dir', (t) => {
  const cwd = setup(t);
  fs.mkdirSync(path.join(cwd, '.planning', 'phases', '06-auth'), { recursive: true });
  const result = json(cwd, ['state', 'resolve-id', '6']);
  assert.strictEqual(result.type, 'phase');
  assert.strictEqual(result.status, 'found');
  assert.ok(result.phase_dir.endsWith('06-auth'), `unexpected phase_dir: ${result.phase_dir}`);
});

test('resolve-id accepts padded input and still finds dir', (t) => {
  const cwd = setup(t);
  fs.mkdirSync(path.join(cwd, '.planning', 'phases', '06-auth'), { recursive: true });
  const result = json(cwd, ['state', 'resolve-id', '06']);
  assert.strictEqual(result.status, 'found');
});

// ─── state sync ───────────────────────────────────────────────────────────────

test('state sync parses workflow SPRINT artifacts and preserves velocity history', (t) => {
  const cwd = setup(t, {
    state: {
      phases: [
        { id: '01', number: '01', name: 'Analytics Dashboard', status: 'active' },
      ],
      sprints: [],
      velocity_history: [
        { sprint: '01.0', points: 8, completed_at: '2026-06-01T00:00:00.000Z' },
      ],
      decisions: [],
      blockers: [],
      council_sessions: [],
      executions: [],
    },
  });
  fs.writeFileSync(
    path.join(cwd, '.planning', 'ROADMAP.md'),
    '## Phase 01 — Analytics Dashboard\n\n**Goal:** Build a dashboard\n',
  );
  const phaseDir = path.join(cwd, '.planning', 'phases', '01-analytics-dashboard');
  fs.mkdirSync(phaseDir, { recursive: true });
  fs.writeFileSync(
    path.join(phaseDir, '01-01-SPRINT.md'),
    '# Sprint 01.1\n\n**Sprint Goal:** Ship the dashboard MVP\n',
  );

  const result = json(cwd, ['state', 'sync', '--from-disk']);
  assert.strictEqual(result.sprints_found, 1);
  assert.strictEqual(result.sprints_upserted, 1);

  const state = json(cwd, ['state', 'read']);
  assert.deepStrictEqual(state.velocity_history, [
    { sprint: '01.0', points: 8, completed_at: '2026-06-01T00:00:00.000Z' },
  ]);
  assert.ok(
    state.sprints.some(s => s.key === '01/1' && s.goal === 'Ship the dashboard MVP'),
    'workflow SPRINT artifact was not synced into state.sprints',
  );
});

// ─── phase status normalization (#955) ────────────────────────────────────────

test('state read normalizes legacy phase status aliases to canonical enum', (t) => {
  const cwd = setup(t, {
    state: {
      phases: [
        { number: '42', name: 'Ambient adoption hooks', status: 'executed' },
        { number: '20', name: 'Dashboard UX', status: 'completed' },
        { number: '37', name: 'Dependency graph', status: 'executing' },
        { number: '21', name: 'Pipeline', status: 'planned' },
      ],
      decisions: [],
      blockers: [],
      council_sessions: [],
      executions: [],
    },
  });
  const state = json(cwd, ['state', 'read']);
  const byNumber = Object.fromEntries(state.phases.map(p => [p.number, p.status]));
  assert.strictEqual(byNumber['42'], 'complete');
  assert.strictEqual(byNumber['20'], 'complete');
  assert.strictEqual(byNumber['37'], 'executing');
  assert.strictEqual(byNumber['21'], 'planned');
});

test('state read normalization is idempotent and persists to disk', (t) => {
  const cwd = setup(t, {
    state: {
      phases: [{ number: '42', name: 'Ambient adoption hooks', status: 'executed' }],
      decisions: [],
      blockers: [],
      council_sessions: [],
      executions: [],
    },
  });
  json(cwd, ['state', 'read']);
  const onDisk = JSON.parse(fs.readFileSync(path.join(cwd, '.rcode', 'state.json'), 'utf8'));
  assert.strictEqual(onDisk.phases[0].status, 'complete', 'legacy status was not persisted as canonical');

  // Second load must be a no-op — no further rewrite needed, same canonical value.
  const again = json(cwd, ['state', 'read']);
  assert.strictEqual(again.phases[0].status, 'complete');
});

test('state read leaves valid canonical statuses untouched', (t) => {
  const cwd = setup(t, {
    state: {
      phases: [{ number: '1', name: 'Setup', status: 'planned' }],
      decisions: [],
      blockers: [],
      council_sessions: [],
      executions: [],
    },
  });
  const state = json(cwd, ['state', 'read']);
  assert.strictEqual(state.phases[0].status, 'planned');
});

// ─── complete-phase stale-executing gate (#955) ───────────────────────────────

test('complete-phase warns and reports stale executing phases with a lower number', (t) => {
  const cwd = setup(t, {
    state: {
      phases: [
        { number: '37', name: 'Dependency graph', status: 'executing' },
        { number: '43', name: 'Ship rcode/data', status: 'planned' },
      ],
      decisions: [],
      blockers: [],
      council_sessions: [],
      executions: [],
    },
  });
  const result = json(cwd, ['state', 'complete-phase', '--phase', '43']);
  assert.strictEqual(result.status, 'complete');
  assert.deepStrictEqual(result.stale_executing_phases, ['37']);
});

test('complete-phase reports no stale phases when nothing earlier is executing', (t) => {
  const cwd = setup(t, {
    state: {
      phases: [
        { number: '37', name: 'Dependency graph', status: 'complete' },
        { number: '43', name: 'Ship rcode/data', status: 'planned' },
      ],
      decisions: [],
      blockers: [],
      council_sessions: [],
      executions: [],
    },
  });
  const result = json(cwd, ['state', 'complete-phase', '--phase', '43']);
  assert.deepStrictEqual(result.stale_executing_phases, []);
});

test('complete-phase ignores later-numbered executing phases (not stale relative to this one)', (t) => {
  const cwd = setup(t, {
    state: {
      phases: [
        { number: '20', name: 'Earlier done', status: 'complete' },
        { number: '43', name: 'Ship rcode/data', status: 'planned' },
        { number: '44', name: 'Future work', status: 'executing' },
      ],
      decisions: [],
      blockers: [],
      council_sessions: [],
      executions: [],
    },
  });
  const result = json(cwd, ['state', 'complete-phase', '--phase', '43']);
  assert.deepStrictEqual(result.stale_executing_phases, []);
});
