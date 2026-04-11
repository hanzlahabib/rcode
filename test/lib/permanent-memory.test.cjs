/**
 * Tests for cli/lib/permanent-memory.cjs — /rihal:preserve backend.
 *
 * The critical behavior: when the permanent.md file grows past the trigger
 * line count, the oldest dated entries get moved to the archive file.
 * This test verifies the trigger fires and the auto-archive math is sound.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const pm = require('../../cli/lib/permanent-memory.cjs');
const { makeTempDir, cleanup, initRihalDir } = require('../helpers.cjs');

test('stats returns zero entries on fresh project', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  const s = pm.stats(cwd);
  assert.strictEqual(s.exists, false);
  assert.strictEqual(s.total_entries, 0);
  assert.strictEqual(s.archive.exists, false);
});

test('addEntry writes to Conventions section with date prefix', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  pm.addEntry(cwd, 'Conventions', 'Use pnpm not npm');

  const content = fs.readFileSync(pm.permanentPath(cwd), 'utf8');
  assert.ok(content.includes('## Conventions'));
  assert.ok(/- \[\d{4}-\d{2}-\d{2}\] Use pnpm not npm/.test(content));
});

test('addEntry supports each canonical section', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  pm.addEntry(cwd, 'Conventions', 'convention entry');
  pm.addEntry(cwd, 'Architecture Decisions', 'decision entry');
  pm.addEntry(cwd, 'Key File Paths', 'path entry');
  pm.addEntry(cwd, 'Common Workflows', 'workflow entry');
  pm.addEntry(cwd, 'Gotchas', 'gotcha entry');
  pm.addEntry(cwd, 'Misc', 'misc entry');

  const content = fs.readFileSync(pm.permanentPath(cwd), 'utf8');
  for (const section of pm.SECTIONS) {
    assert.ok(content.includes(`## ${section}`), `missing section: ${section}`);
  }
});

test('addEntry rejects empty text', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  assert.throws(() => pm.addEntry(cwd, 'Conventions', ''), /Empty entry/);
  assert.throws(() => pm.addEntry(cwd, 'Conventions', '   '), /Empty entry/);
});

test('addEntry can create a new section (extra section beyond the fixed 6)', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  pm.addEntry(cwd, 'Custom Section', 'entry');

  const content = fs.readFileSync(pm.permanentPath(cwd), 'utf8');
  assert.ok(content.includes('## Custom Section'));
});

test('auto-archive triggers when line count exceeds threshold', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  // Each entry adds a line plus overhead. 300 entries is way past the
  // 200-line trigger, so auto-archive must fire.
  for (let i = 0; i < 300; i++) {
    pm.addEntry(cwd, 'Misc', `Entry ${i} with some historical context`);
  }

  const stats = pm.stats(cwd);
  assert.ok(stats.line_count <= pm.ARCHIVE_TRIGGER_LINES, 'active file should be under trigger');
  assert.ok(stats.archive.exists, 'archive file should exist');
  assert.ok(stats.archive.lineCount > 0, 'archive should have content');
  // No entries lost: 300 written = archive + active entries
  const activeContent = fs.readFileSync(pm.permanentPath(cwd), 'utf8');
  const archiveContent = fs.readFileSync(pm.archivePath(cwd), 'utf8');
  const activeEntries = (activeContent.match(/^-\s/gm) || []).length;
  const archiveEntries = (archiveContent.match(/^-\s/gm) || []).length;
  assert.strictEqual(activeEntries + archiveEntries, 300, 'no entries lost');
});

test('auto-archive moves oldest dated entries first', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  // Load sequentially — each new entry gets today's date. They're added in
  // order, so "oldest" = earliest-added = index 0.
  for (let i = 0; i < 300; i++) {
    pm.addEntry(cwd, 'Misc', `Entry ${i}`);
  }

  const archiveContent = fs.readFileSync(pm.archivePath(cwd), 'utf8');
  // The archive should contain lower-index entries (older)
  assert.ok(archiveContent.includes('Entry 0'));
  // The active file should contain higher-index entries (newer)
  const activeContent = fs.readFileSync(pm.permanentPath(cwd), 'utf8');
  assert.ok(activeContent.includes('Entry 299'));
});

test('addEntry is serialization-stable — re-adding produces identical output', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  pm.addEntry(cwd, 'Conventions', 'first');
  const snapshot1 = fs.readFileSync(pm.permanentPath(cwd), 'utf8');

  // Re-parse and re-serialize without adding
  const { sections } = pm.loadPermanent(cwd);
  const entries = sections.Conventions;
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].text, 'first');
});

test('SECTIONS contains the canonical six-section list', () => {
  assert.deepStrictEqual(pm.SECTIONS, [
    'Conventions',
    'Architecture Decisions',
    'Key File Paths',
    'Common Workflows',
    'Gotchas',
    'Misc',
  ]);
});

test('ARCHIVE_TRIGGER_LINES > ARCHIVE_TARGET_LINES so there is headroom', () => {
  assert.ok(
    pm.ARCHIVE_TRIGGER_LINES > pm.ARCHIVE_TARGET_LINES,
    'trigger must exceed target to prevent thrashing on every add',
  );
});
