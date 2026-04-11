/**
 * Tests for cli/lib/session-log.cjs — searchable session log writer +
 * topic search used by /rihal:save-session and /rihal:continue.
 *
 * Covers write, list (fast metadata-only scan), search by topic, and
 * full-file read.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  writeSessionLog,
  listSessionLogs,
  searchSessionLogs,
  readSessionLog,
  parseFrontmatter,
  slugify,
} = require('../../cli/lib/session-log.cjs');
const { makeTempDir, cleanup, initRihalDir } = require('../helpers.cjs');

test('slugify normalizes input to filesystem-safe kebab case', () => {
  assert.strictEqual(slugify('Auth Flow Fix!'), 'auth-flow-fix');
  assert.strictEqual(slugify('Payment — Stripe WebHook'), 'payment-stripe-webhook');
  assert.strictEqual(slugify(''), 'session');
  assert.strictEqual(slugify(null), 'session');
});

test('writeSessionLog creates a markdown file with frontmatter', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  const result = writeSessionLog(cwd, {
    title: 'Auth flow debugging',
    topics: ['authentication', 'jwt'],
    sprint: 'sprint-01',
    outcome: 'fixed edge case',
  });

  assert.ok(result.path.startsWith('.rihal/progress/session-'));
  assert.ok(result.filename.endsWith('.md'));

  const content = fs.readFileSync(path.join(cwd, result.path), 'utf8');
  assert.ok(content.startsWith('---'));
  assert.ok(content.includes('topics: [authentication, jwt]'));
  assert.ok(content.includes('sprint: sprint-01'));
  assert.ok(content.includes('outcome: fixed edge case'));
});

test('writeSessionLog auto-numbers filenames on collision', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  const r1 = writeSessionLog(cwd, { title: 'same slug', topics: [], date: '2026-04-11' });
  const r2 = writeSessionLog(cwd, { title: 'same slug', topics: [], date: '2026-04-11' });
  const r3 = writeSessionLog(cwd, { title: 'same slug', topics: [], date: '2026-04-11' });

  assert.notStrictEqual(r1.filename, r2.filename);
  assert.notStrictEqual(r2.filename, r3.filename);
  assert.ok(r2.filename.includes('-2') || r2.filename.includes('-02'));
});

test('writeSessionLog renders bullet sections for each populated field', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  const result = writeSessionLog(cwd, {
    title: 'Feature work',
    topics: ['a'],
    decisions: ['use jwt', 'refresh on 403'],
    learnings: ['api quirk'],
    pending: ['add tests'],
    filesModified: ['src/auth/login.ts'],
  });

  const content = fs.readFileSync(path.join(cwd, result.path), 'utf8');
  assert.ok(content.includes('## Decisions Made'));
  assert.ok(content.includes('- use jwt'));
  assert.ok(content.includes('## Key Learnings'));
  assert.ok(content.includes('## Pending Tasks'));
  assert.ok(content.includes('- [ ] add tests'));
  assert.ok(content.includes('## Files Modified'));
  assert.ok(content.includes('src/auth/login.ts'));
});

test('listSessionLogs returns metadata-only, newest first', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  writeSessionLog(cwd, { title: 'Older', topics: ['a'], date: '2026-04-09' });
  writeSessionLog(cwd, { title: 'Newest', topics: ['b'], date: '2026-04-11' });
  writeSessionLog(cwd, { title: 'Middle', topics: ['c'], date: '2026-04-10' });

  const logs = listSessionLogs(cwd);
  assert.strictEqual(logs.length, 3);
  assert.strictEqual(logs[0].date, '2026-04-11');
  assert.strictEqual(logs[2].date, '2026-04-09');
});

test('listSessionLogs respects limit option', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  for (let i = 0; i < 5; i++) {
    writeSessionLog(cwd, { title: `session ${i}`, topics: [], date: `2026-04-${10 + i}` });
  }

  const logs = listSessionLogs(cwd, { limit: 3 });
  assert.strictEqual(logs.length, 3);
});

test('searchSessionLogs matches by topic', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  writeSessionLog(cwd, { title: 'auth work', topics: ['authentication', 'jwt'] });
  writeSessionLog(cwd, { title: 'payment', topics: ['stripe', 'webhooks'] });
  writeSessionLog(cwd, { title: 'auth state', topics: ['authentication', 'zustand'] });

  const hits = searchSessionLogs(cwd, 'auth');
  assert.strictEqual(hits.length, 2);
});

test('searchSessionLogs matches by title and outcome', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  writeSessionLog(cwd, { title: 'Stripe webhook fix', topics: [] });
  writeSessionLog(cwd, { title: 'Unrelated', outcome: 'resolved stripe bug', topics: [] });
  writeSessionLog(cwd, { title: 'Also unrelated', topics: [] });

  const hits = searchSessionLogs(cwd, 'stripe');
  assert.strictEqual(hits.length, 2);
});

test('searchSessionLogs returns empty array for no matches', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  writeSessionLog(cwd, { title: 'unrelated', topics: ['other'] });
  assert.deepStrictEqual(searchSessionLogs(cwd, 'nothing'), []);
  assert.deepStrictEqual(searchSessionLogs(cwd, ''), []);
});

test('searchSessionLogs limits results', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  for (let i = 0; i < 10; i++) {
    writeSessionLog(cwd, { title: `auth ${i}`, topics: ['authentication'], date: `2026-04-${10 + i}` });
  }

  const hits = searchSessionLogs(cwd, 'auth', { limit: 3 });
  assert.strictEqual(hits.length, 3);
});

test('readSessionLog returns frontmatter + body for a specific file', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  const result = writeSessionLog(cwd, {
    title: 'test',
    topics: ['a', 'b'],
    decisions: ['do X'],
  });

  const read = readSessionLog(cwd, result.filename);
  assert.ok(read);
  assert.deepStrictEqual(read.frontmatter.topics, ['a', 'b']);
  assert.ok(read.body.includes('## Decisions Made'));
});

test('readSessionLog returns null for missing file', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));
  initRihalDir(cwd);

  assert.strictEqual(readSessionLog(cwd, 'does-not-exist.md'), null);
});

test('parseFrontmatter handles empty frontmatter block', () => {
  const { frontmatter, body } = parseFrontmatter('# no frontmatter here');
  assert.deepStrictEqual(frontmatter, {});
  assert.strictEqual(body, '# no frontmatter here');
});

test('parseFrontmatter parses arrays and strings', () => {
  const input = `---
title: "Quoted title"
topics: [a, b, c]
count: 42
---
body content
`;
  const { frontmatter, body } = parseFrontmatter(input);
  assert.strictEqual(frontmatter.title, 'Quoted title');
  assert.deepStrictEqual(frontmatter.topics, ['a', 'b', 'c']);
  assert.strictEqual(frontmatter.count, '42');
  assert.ok(body.includes('body content'));
});
