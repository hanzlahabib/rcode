/**
 * Tests for cli/lib/milestones.cjs — top-level organizing concept with
 * frontmatter-based linkage and computed linked-items resolution.
 *
 * Critical invariants under test:
 *   1. Milestone state.json holds ONLY metadata (no child arrays)
 *   2. Linked phases/sprints/stories are computed from frontmatter
 *   3. Resolution walk: story → sprint plan → phase brief → active marker
 *   4. Close appends to MILESTONES.md history without losing linkage
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const m = require('../../cli/lib/milestones.cjs');
const ss = require('../../cli/lib/sprint-state.cjs');
const { makeTempDir, cleanup, initRihalDir, seedPhase } = require('../helpers.cjs');

function setup() {
  const cwd = makeTempDir();
  initRihalDir(cwd);
  seedPhase(cwd, 'phase-01');
  return cwd;
}

test('initMilestone creates state.json with only metadata fields', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  const state = m.initMilestone(cwd, 'm-0.2.0', {
    name: 'v0.2.0',
    goal: 'Ship context tools',
    target_date: '2026-05-01',
  });

  assert.strictEqual(state.id, 'm-0.2.0');
  assert.strictEqual(state.name, 'v0.2.0');
  assert.strictEqual(state.goal, 'Ship context tools');
  assert.strictEqual(state.status, 'planned');
  assert.strictEqual(state.target_date, '2026-05-01');

  // CRITICAL: no child arrays
  assert.strictEqual('phases' in state, false);
  assert.strictEqual('sprints' in state, false);
  assert.strictEqual('stories' in state, false);
});

test('initMilestone rejects invalid id format', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  assert.throws(() => m.initMilestone(cwd, 'foo'), /Invalid milestone id/);
  assert.throws(() => m.initMilestone(cwd, 'M-0.2.0'), /Invalid milestone id/);
  assert.throws(() => m.initMilestone(cwd, ''), /Invalid milestone id/);
});

test('initMilestone is idempotent', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  m.initMilestone(cwd, 'm-0.2.0', { name: 'First' });
  const second = m.initMilestone(cwd, 'm-0.2.0', { name: 'Second' });
  assert.strictEqual(second.name, 'First');
});

test('setActiveMilestone refuses unknown id', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  assert.throws(
    () => m.setActiveMilestone(cwd, 'm-nonexistent'),
    /state\.json not found/,
  );
});

test('getActiveMilestone + setActiveMilestone round-trip', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  m.initMilestone(cwd, 'm-0.2.0', {});
  assert.strictEqual(m.getActiveMilestone(cwd), null);

  m.setActiveMilestone(cwd, 'm-0.2.0');
  assert.strictEqual(m.getActiveMilestone(cwd), 'm-0.2.0');
});

test('linkPhaseToMilestone writes milestone: field to brief.md frontmatter', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  m.initMilestone(cwd, 'm-0.2.0', {});
  m.linkPhaseToMilestone(cwd, 'phase-01', 'm-0.2.0');

  const brief = fs.readFileSync(
    path.join(cwd, '.rihal/phases/phase-01/brief.md'),
    'utf8',
  );
  assert.ok(brief.includes('milestone: m-0.2.0'));
  assert.ok(brief.startsWith('---'));
});

test('linkPhaseToMilestone refuses unknown milestone id', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  assert.throws(
    () => m.linkPhaseToMilestone(cwd, 'phase-01', 'm-nonexistent'),
    /not found/,
  );
});

test('unlinkPhaseFromMilestone removes the frontmatter field', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  m.initMilestone(cwd, 'm-0.2.0', {});
  m.linkPhaseToMilestone(cwd, 'phase-01', 'm-0.2.0');
  m.unlinkPhaseFromMilestone(cwd, 'phase-01');

  const brief = fs.readFileSync(
    path.join(cwd, '.rihal/phases/phase-01/brief.md'),
    'utf8',
  );
  assert.ok(!brief.includes('milestone:'));
});

test('resolveMilestoneForPhase reads frontmatter directly', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  m.initMilestone(cwd, 'm-0.2.0', {});
  m.linkPhaseToMilestone(cwd, 'phase-01', 'm-0.2.0');

  assert.strictEqual(m.resolveMilestoneForPhase(cwd, 'phase-01'), 'm-0.2.0');
});

test('resolveMilestoneForPhase falls back to active marker', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  m.initMilestone(cwd, 'm-0.2.0', {});
  m.setActiveMilestone(cwd, 'm-0.2.0');
  // No frontmatter link — should fall back to active

  assert.strictEqual(m.resolveMilestoneForPhase(cwd, 'phase-01'), 'm-0.2.0');
});

test('resolveMilestoneForSprint inherits from phase when sprint plan has no override', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  m.initMilestone(cwd, 'm-0.2.0', {});
  m.linkPhaseToMilestone(cwd, 'phase-01', 'm-0.2.0');
  ss.initSprint(cwd, 'phase-01', 'sprint-01', {});

  assert.strictEqual(
    m.resolveMilestoneForSprint(cwd, 'phase-01', 'sprint-01'),
    'm-0.2.0',
  );
});

test('linkedPhases returns phases whose frontmatter points to the milestone', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));
  seedPhase(cwd, 'phase-02');

  m.initMilestone(cwd, 'm-0.2.0', {});
  m.linkPhaseToMilestone(cwd, 'phase-01', 'm-0.2.0');
  m.linkPhaseToMilestone(cwd, 'phase-02', 'm-0.2.0');

  const linked = m.linkedPhases(cwd, 'm-0.2.0');
  assert.deepStrictEqual(linked.sort(), ['phase-01', 'phase-02']);
});

test('linkedStories inherits from phase via frontmatter walk', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  m.initMilestone(cwd, 'm-0.2.0', {});
  m.linkPhaseToMilestone(cwd, 'phase-01', 'm-0.2.0');
  ss.initSprint(cwd, 'phase-01', 'sprint-01', {});
  ss.addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-1' });
  ss.addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-2' });
  ss.updateStoryStatus(cwd, 'phase-01', 'sprint-01', 'story-1-1', { status: 'done' });

  const stories = m.linkedStories(cwd, 'm-0.2.0');
  assert.strictEqual(stories.length, 2);
  const done = stories.find((s) => s.story_id === 'story-1-1');
  assert.strictEqual(done.status, 'done');
});

test('countLinkedItems returns aggregate with status breakdown', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  m.initMilestone(cwd, 'm-0.2.0', {});
  m.linkPhaseToMilestone(cwd, 'phase-01', 'm-0.2.0');
  ss.initSprint(cwd, 'phase-01', 'sprint-01', {});
  ss.addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-1' });
  ss.addStoryToSprint(cwd, 'phase-01', 'sprint-01', { id: 'story-1-2' });
  ss.updateStoryStatus(cwd, 'phase-01', 'sprint-01', 'story-1-1', { status: 'done' });

  const counts = m.countLinkedItems(cwd, 'm-0.2.0');
  assert.strictEqual(counts.phases, 1);
  assert.strictEqual(counts.sprints, 1);
  assert.strictEqual(counts.stories, 2);
  assert.strictEqual(counts.stories_by_status.done, 1);
  assert.strictEqual(counts.stories_by_status.ready, 1);
});

test('listMilestones includes active flag', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  m.initMilestone(cwd, 'm-0.2.0', { name: 'v0.2.0' });
  m.initMilestone(cwd, 'm-0.3.0', { name: 'v0.3.0' });
  m.setActiveMilestone(cwd, 'm-0.2.0');

  const list = m.listMilestones(cwd);
  assert.strictEqual(list.length, 2);
  const active = list.find((x) => x.active);
  assert.strictEqual(active.id, 'm-0.2.0');
});

test('closeMilestone flips status to completed and clears active marker', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  m.initMilestone(cwd, 'm-0.2.0', { name: 'v0.2.0' });
  m.setActiveMilestone(cwd, 'm-0.2.0');

  m.closeMilestone(cwd, 'm-0.2.0');

  const state = m.readMilestone(cwd, 'm-0.2.0');
  assert.strictEqual(state.status, 'completed');
  assert.ok('completed_at' in state);
  assert.strictEqual(m.getActiveMilestone(cwd), null);
});

test('closeMilestone appends entry to .rihal/MILESTONES.md', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  m.initMilestone(cwd, 'm-0.2.0', { name: 'v0.2.0', goal: 'Ship it' });
  m.closeMilestone(cwd, 'm-0.2.0');

  const history = fs.readFileSync(path.join(cwd, '.rihal', 'MILESTONES.md'), 'utf8');
  assert.ok(history.startsWith('# Milestones'));
  assert.ok(history.includes('## m-0.2.0'));
  assert.ok(history.includes('v0.2.0'));
  assert.ok(history.includes('Ship it'));
});

test('closeMilestone history entries are reverse chronological', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  m.initMilestone(cwd, 'm-0.2.0', { name: 'older' });
  m.closeMilestone(cwd, 'm-0.2.0');
  m.initMilestone(cwd, 'm-0.3.0', { name: 'newer' });
  m.closeMilestone(cwd, 'm-0.3.0');

  const history = fs.readFileSync(path.join(cwd, '.rihal', 'MILESTONES.md'), 'utf8');
  const newerIdx = history.indexOf('m-0.3.0');
  const olderIdx = history.indexOf('m-0.2.0');
  assert.ok(newerIdx > -1 && olderIdx > -1);
  assert.ok(newerIdx < olderIdx, 'newer entry should appear first');
});

test('readMilestoneField + writeMilestoneField preserve other frontmatter fields', (t) => {
  const cwd = setup();
  t.after(() => cleanup(cwd));

  const briefPath = path.join(cwd, '.rihal/phases/phase-01/brief.md');
  fs.writeFileSync(
    briefPath,
    `---
title: Phase One
author: Team
---
# Phase brief
`,
  );

  m.writeMilestoneField(briefPath, 'm-0.2.0');

  const updated = fs.readFileSync(briefPath, 'utf8');
  assert.ok(updated.includes('title: Phase One'));
  assert.ok(updated.includes('author: Team'));
  assert.ok(updated.includes('milestone: m-0.2.0'));
});

test('MILESTONE_STATUS_VALUES contains expected enum', () => {
  const expected = ['planned', 'in_progress', 'completed', 'abandoned'];
  for (const v of expected) {
    assert.ok(m.MILESTONE_STATUS_VALUES.has(v), `missing: ${v}`);
  }
});
