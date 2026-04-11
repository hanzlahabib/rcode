/**
 * Tests for cli/lib/sprint-state.cjs — per-sprint state machine.
 *
 * Covers CRUD, story status transitions with auto-timestamp, sprint-level
 * status auto-bump, bug intake, and cross-sprint interrupted-story search.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  initSprint,
  readSprintState,
  writeSprintState,
  addStoryToSprint,
  updateStoryStatus,
  addBugToSprint,
  resolveBugInSprint,
  getActiveSprint,
  setActiveSprint,
  listSprints,
  findInterruptedStories,
  getInProgressStories,
  getNextReadyStory,
  STORY_STATUS_VALUES,
} = require('../../cli/lib/sprint-state.cjs');
const { makeTempDir, cleanup, initRihalDir, seedPhase } = require('../helpers.cjs');

function setupSprintEnv() {
  const cwd = makeTempDir();
  initRihalDir(cwd);
  seedPhase(cwd, 'phase-01');
  return cwd;
}

test('initSprint creates state.json with default shape', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  const state = initSprint(cwd, 'phase-01', 'sprint-01', { goal: 'Auth' });
  assert.strictEqual(state.sprint_id, 'sprint-01');
  assert.strictEqual(state.phase, 'phase-01');
  assert.strictEqual(state.goal, 'Auth');
  assert.strictEqual(state.status, 'planned');
  assert.deepStrictEqual(state.stories, []);
  assert.deepStrictEqual(state.bugs_raised, []);

  // Verify file on disk
  const onDisk = JSON.parse(
    fs.readFileSync(
      path.join(cwd, '.rihal/phases/phase-01/sprints/sprint-01/state.json'),
      'utf8',
    ),
  );
  assert.strictEqual(onDisk.sprint_id, 'sprint-01');
});

test('initSprint is idempotent — re-running returns existing state', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  initSprint(cwd, 'phase-01', 'sprint-01', { goal: 'First' });
  const second = initSprint(cwd, 'phase-01', 'sprint-01', { goal: 'Second' });
  assert.strictEqual(second.goal, 'First');
});

test('addStoryToSprint appends a new story with defaults', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  initSprint(cwd, 'phase-01', 'sprint-01', { goal: 'Auth' });
  addStoryToSprint(cwd, 'phase-01', 'sprint-01', {
    id: 'story-1-1-login',
    title: 'Login',
    points: 5,
  });

  const state = readSprintState(cwd, 'phase-01', 'sprint-01');
  assert.strictEqual(state.stories.length, 1);
  assert.strictEqual(state.stories[0].id, 'story-1-1-login');
  assert.strictEqual(state.stories[0].status, 'ready');
});

test('addStoryToSprint refuses to add duplicate story id', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  initSprint(cwd, 'phase-01', 'sprint-01', {});
  addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-1', title: 'a' });

  assert.throws(
    () => addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-1', title: 'dup' }),
    /already exists/,
  );
});

test('updateStoryStatus validates the target status against the enum', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  initSprint(cwd, 'phase-01', 'sprint-01', {});
  addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-1' });

  assert.throws(
    () =>
      updateStoryStatus(cwd, 'phase-01', 'sprint-01', 'story-1-1', {
        status: 'bogus',
      }),
    /Invalid story status/,
  );
});

test('updateStoryStatus sets started_at when status becomes in_progress', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  initSprint(cwd, 'phase-01', 'sprint-01', {});
  addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-1' });

  const before = readSprintState(cwd, 'phase-01', 'sprint-01');
  assert.strictEqual(before.stories[0].started_at, null);

  updateStoryStatus(cwd, 'phase-01', 'sprint-01', 'story-1-1', {
    status: 'in_progress',
  });

  const after = readSprintState(cwd, 'phase-01', 'sprint-01');
  assert.ok(typeof after.stories[0].started_at === 'string');
});

test('updateStoryStatus sets completed_at when status becomes done', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  initSprint(cwd, 'phase-01', 'sprint-01', {});
  addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-1' });

  updateStoryStatus(cwd, 'phase-01', 'sprint-01', 'story-1-1', {
    status: 'done',
  });

  const state = readSprintState(cwd, 'phase-01', 'sprint-01');
  assert.ok(typeof state.stories[0].completed_at === 'string');
});

test('sprint auto-bumps to in_progress when first story goes in_progress', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  initSprint(cwd, 'phase-01', 'sprint-01', {});
  addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-1' });

  let state = readSprintState(cwd, 'phase-01', 'sprint-01');
  assert.strictEqual(state.status, 'planned');

  updateStoryStatus(cwd, 'phase-01', 'sprint-01', 'story-1-1', {
    status: 'in_progress',
  });

  state = readSprintState(cwd, 'phase-01', 'sprint-01');
  assert.strictEqual(state.status, 'in_progress');
  assert.ok(typeof state.started_at === 'string');
});

test('sprint auto-bumps to completed when all stories are done', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  initSprint(cwd, 'phase-01', 'sprint-01', {});
  addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-1' });
  addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-2' });

  updateStoryStatus(cwd, 'phase-01', 'sprint-01', 'story-1-1', { status: 'done' });
  let state = readSprintState(cwd, 'phase-01', 'sprint-01');
  assert.notStrictEqual(state.status, 'completed');

  updateStoryStatus(cwd, 'phase-01', 'sprint-01', 'story-1-2', { status: 'done' });
  state = readSprintState(cwd, 'phase-01', 'sprint-01');
  assert.strictEqual(state.status, 'completed');
});

test('addBugToSprint appends a bug entry with timestamp', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  initSprint(cwd, 'phase-01', 'sprint-01', {});
  addBugToSprint(cwd, 'phase-01', 'sprint-01', {
    id: 'bug-001',
    title: 'login button',
    severity: 'high',
    area: 'frontend',
  });

  const state = readSprintState(cwd, 'phase-01', 'sprint-01');
  assert.strictEqual(state.bugs_raised.length, 1);
  assert.strictEqual(state.bugs_raised[0].id, 'bug-001');
  assert.strictEqual(state.bugs_raised[0].resolved, false);
  assert.ok(typeof state.bugs_raised[0].raised_at === 'string');
});

test('resolveBugInSprint flips resolved flag and sets resolved_at', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  initSprint(cwd, 'phase-01', 'sprint-01', {});
  addBugToSprint(cwd, 'phase-01', 'sprint-01', { id: 'bug-001', title: 'a' });

  const resolved = resolveBugInSprint(cwd, 'phase-01', 'sprint-01', 'bug-001');
  assert.strictEqual(resolved.resolved, true);
  assert.ok(typeof resolved.resolved_at === 'string');

  const state = readSprintState(cwd, 'phase-01', 'sprint-01');
  assert.strictEqual(state.bugs_raised[0].resolved, true);
});

test('getActiveSprint / setActiveSprint round-trip', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  initSprint(cwd, 'phase-01', 'sprint-01', {});
  assert.strictEqual(getActiveSprint(cwd, 'phase-01'), null);

  setActiveSprint(cwd, 'phase-01', 'sprint-01');
  assert.strictEqual(getActiveSprint(cwd, 'phase-01'), 'sprint-01');
});

test('setActiveSprint refuses unknown sprint id', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  assert.throws(
    () => setActiveSprint(cwd, 'phase-01', 'sprint-nonexistent'),
    /state\.json does not exist/,
  );
});

test('listSprints returns summary with counts', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));

  initSprint(cwd, 'phase-01', 'sprint-01', { goal: 'Auth' });
  initSprint(cwd, 'phase-01', 'sprint-02', { goal: 'Profile' });
  addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-1' });
  addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-2' });
  updateStoryStatus(cwd, 'phase-01', 'sprint-01', 'story-1-1', { status: 'done' });

  const list = listSprints(cwd, 'phase-01');
  assert.strictEqual(list.length, 2);
  const first = list.find((s) => s.sprint_id === 'sprint-01');
  assert.strictEqual(first.total_stories, 2);
  assert.strictEqual(first.counts.done, 1);
  assert.strictEqual(first.counts.ready, 1);
});

test('findInterruptedStories returns in_progress and blocked across all sprints', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));
  seedPhase(cwd, 'phase-02');

  initSprint(cwd, 'phase-01', 'sprint-01', {});
  initSprint(cwd, 'phase-02', 'sprint-01', {});

  addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-1' });
  addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-2' });
  addStoryToSprint(cwd, 'phase-02', 'sprint-01', { id: 'story-2-1' });

  updateStoryStatus(cwd, 'phase-01', 'sprint-01', 'story-1-1', { status: 'in_progress' });
  updateStoryStatus(cwd, 'phase-02', 'sprint-01', 'story-2-1', { status: 'blocked' });

  const interrupted = findInterruptedStories(cwd);
  assert.strictEqual(interrupted.length, 2);
  const ids = interrupted.map((i) => i.story.id).sort();
  assert.deepStrictEqual(ids, ['story-1-1', 'story-2-1']);
});

test('getNextReadyStory picks first ready story in active sprint', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));
  fs.writeFileSync(
    path.join(cwd, '.rihal/state.json'),
    JSON.stringify({ current_phase: 'phase-01' }),
  );

  initSprint(cwd, 'phase-01', 'sprint-01', {});
  addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-1' });
  addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-2' });
  updateStoryStatus(cwd, 'phase-01', 'sprint-01', 'story-1-1', { status: 'done' });
  setActiveSprint(cwd, 'phase-01', 'sprint-01');

  const next = getNextReadyStory(cwd);
  assert.ok(next);
  assert.strictEqual(next.id, 'story-1-2');
});

test('getNextReadyStory returns null when nothing ready', (t) => {
  const cwd = setupSprintEnv();
  t.after(() => cleanup(cwd));
  fs.writeFileSync(
    path.join(cwd, '.rihal/state.json'),
    JSON.stringify({ current_phase: 'phase-01' }),
  );

  initSprint(cwd, 'phase-01', 'sprint-01', {});
  setActiveSprint(cwd, 'phase-01', 'sprint-01');

  assert.strictEqual(getNextReadyStory(cwd), null);
});

test('STORY_STATUS_VALUES contains expected enum members', () => {
  for (const expected of ['ready', 'in_progress', 'blocked', 'review', 'done', 'abandoned']) {
    assert.ok(STORY_STATUS_VALUES.has(expected), `missing status: ${expected}`);
  }
});
