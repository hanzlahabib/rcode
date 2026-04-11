/**
 * Tests for cli/lib/handoff.cjs — pause/resume state file.
 *
 * Covers singleton semantics (only one handoff at a time), atomic
 * writes, summarization, and the .continue-here.md side file.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  readHandoff,
  hasHandoff,
  writeHandoff,
  clearHandoff,
  summarizeHandoff,
  defaultHandoff,
} = require('../../cli/lib/handoff.cjs');
const { makeTempDir, cleanup, initRihalDir } = require('../helpers.cjs');

test('readHandoff returns null when no handoff exists', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  assert.strictEqual(readHandoff(cwd), null);
  assert.strictEqual(hasHandoff(cwd), false);
});

test('writeHandoff + readHandoff round-trip preserves all fields', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  const result = writeHandoff(cwd, {
    phase: 'phase-01',
    sprint_id: 'sprint-01',
    story_id: 'story-1-2-signup',
    current_task: 3,
    total_tasks: 7,
    last_command: '/rihal:feature',
    blockers: ['waiting on api key'],
    uncommitted_files: ['src/auth/login.ts'],
    next_action: 'finish form validation',
  });
  assert.strictEqual(result.written, true);

  const read = readHandoff(cwd);
  assert.strictEqual(read.phase, 'phase-01');
  assert.strictEqual(read.story_id, 'story-1-2-signup');
  assert.strictEqual(read.current_task, 3);
  assert.deepStrictEqual(read.blockers, ['waiting on api key']);
});

test('writeHandoff refuses to overwrite an existing handoff', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  writeHandoff(cwd, { phase: 'phase-01', sprint_id: 'sprint-01' });
  const second = writeHandoff(cwd, { phase: 'phase-02', sprint_id: 'sprint-01' });

  assert.strictEqual(second.written, false);
  assert.strictEqual(second.reason, 'exists');

  // Original is untouched
  const read = readHandoff(cwd);
  assert.strictEqual(read.phase, 'phase-01');
});

test('writeHandoff { force: true } overwrites an existing handoff', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  writeHandoff(cwd, { phase: 'phase-01', sprint_id: 'sprint-01' });
  const second = writeHandoff(
    cwd,
    { phase: 'phase-02', sprint_id: 'sprint-02' },
    { force: true },
  );
  assert.strictEqual(second.written, true);

  const read = readHandoff(cwd);
  assert.strictEqual(read.phase, 'phase-02');
  assert.strictEqual(read.sprint_id, 'sprint-02');
});

test('writeHandoff creates .continue-here.md alongside when phase+sprint known', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  writeHandoff(cwd, {
    phase: 'phase-01',
    sprint_id: 'sprint-01',
    story_id: 'story-1-2',
    next_action: 'finish tests',
  });

  const continuePath = path.join(
    cwd,
    '.rihal/phases/phase-01/sprints/sprint-01/.continue-here.md',
  );
  assert.ok(fs.existsSync(continuePath), '.continue-here.md should exist');
  const content = fs.readFileSync(continuePath, 'utf8');
  assert.ok(content.includes('phase-01'));
  assert.ok(content.includes('sprint-01'));
  assert.ok(content.includes('finish tests'));
});

test('clearHandoff deletes HANDOFF.json but keeps .continue-here.md', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  writeHandoff(cwd, { phase: 'phase-01', sprint_id: 'sprint-01', story_id: 'story-1-1' });

  const continuePath = path.join(
    cwd,
    '.rihal/phases/phase-01/sprints/sprint-01/.continue-here.md',
  );
  assert.ok(fs.existsSync(continuePath));

  const result = clearHandoff(cwd);
  assert.strictEqual(result.cleared, true);
  assert.strictEqual(readHandoff(cwd), null);

  // .continue-here.md is the history trail — never auto-deleted
  assert.ok(fs.existsSync(continuePath), '.continue-here.md should survive clear');
});

test('clearHandoff is a no-op when no handoff exists', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  const result = clearHandoff(cwd);
  assert.strictEqual(result.cleared, false);
});

test('summarizeHandoff produces a one-line string with key fields', () => {
  const summary = summarizeHandoff({
    paused_at: '2026-04-11T14:30:00Z',
    phase: 'phase-01',
    sprint_id: 'sprint-01',
    story_id: 'story-1-2-signup',
    current_task: 3,
    total_tasks: 7,
  });
  assert.ok(summary.includes('2026-04-11'));
  assert.ok(summary.includes('sprint-01'));
  assert.ok(summary.includes('story-1-2-signup'));
  assert.ok(summary.includes('3/7'));
});

test('summarizeHandoff handles null input', () => {
  assert.strictEqual(summarizeHandoff(null), '(no handoff)');
});

test('defaultHandoff returns a stable shape', () => {
  const d = defaultHandoff();
  assert.ok('schema_version' in d);
  assert.ok('paused_at' in d);
  assert.strictEqual(d.phase, null);
  assert.deepStrictEqual(d.blockers, []);
  assert.deepStrictEqual(d.uncommitted_files, []);
});
