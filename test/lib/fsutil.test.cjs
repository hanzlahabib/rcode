/**
 * Tests for cli/lib/fsutil.cjs — atomic write helpers.
 *
 * These are the most critical tests in the suite because every state
 * file in .rihal/ routes through writeFileAtomic / writeJsonAtomic. If
 * atomicity ever breaks, a Ctrl+C mid-write can corrupt user data.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { writeFileAtomic, writeJsonAtomic, safeRmSync } = require('../../cli/lib/fsutil.cjs');
const { makeTempDir, cleanup } = require('../helpers.cjs');

test('writeFileAtomic writes content to the target path', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));

  const target = path.join(dir, 'out.txt');
  writeFileAtomic(target, 'hello world');

  assert.strictEqual(fs.readFileSync(target, 'utf8'), 'hello world');
});

test('writeFileAtomic creates parent directories if missing', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));

  const target = path.join(dir, 'deeply', 'nested', 'path', 'out.txt');
  writeFileAtomic(target, 'content');

  assert.strictEqual(fs.readFileSync(target, 'utf8'), 'content');
});

test('writeFileAtomic overwrites existing file', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));

  const target = path.join(dir, 'out.txt');
  fs.writeFileSync(target, 'original');
  writeFileAtomic(target, 'replaced');

  assert.strictEqual(fs.readFileSync(target, 'utf8'), 'replaced');
});

test('writeFileAtomic leaves no temp files after successful write', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));

  const target = path.join(dir, 'out.txt');
  writeFileAtomic(target, 'content');

  // Temp filename pattern is .<basename>.tmp-<pid>-<rand>
  const leftovers = fs.readdirSync(dir).filter((n) => n.includes('.tmp-'));
  assert.deepStrictEqual(leftovers, []);
});

test('writeFileAtomic is idempotent — same content produces same result', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));

  const target = path.join(dir, 'out.txt');
  writeFileAtomic(target, 'same');
  writeFileAtomic(target, 'same');

  assert.strictEqual(fs.readFileSync(target, 'utf8'), 'same');
  assert.deepStrictEqual(
    fs.readdirSync(dir).filter((n) => n.includes('.tmp-')),
    [],
  );
});

test('writeJsonAtomic serializes with 2-space indent and trailing newline', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));

  const target = path.join(dir, 'config.json');
  writeJsonAtomic(target, { a: 1, b: { c: 2 } });

  const content = fs.readFileSync(target, 'utf8');
  assert.ok(content.endsWith('\n'), 'should end with newline');
  assert.ok(content.includes('  "a"'), 'should use 2-space indent');
  assert.deepStrictEqual(JSON.parse(content), { a: 1, b: { c: 2 } });
});

test('writeJsonAtomic handles arrays and nested structures', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));

  const target = path.join(dir, 'data.json');
  const obj = {
    stories: [
      { id: 'story-1', status: 'done', commits: ['abc', 'def'] },
      { id: 'story-2', status: 'in_progress' },
    ],
  };
  writeJsonAtomic(target, obj);

  assert.deepStrictEqual(JSON.parse(fs.readFileSync(target, 'utf8')), obj);
});

test('writeFileAtomic accepts custom file mode', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));

  const target = path.join(dir, 'executable.sh');
  writeFileAtomic(target, '#!/bin/sh\necho hi\n', { mode: 0o755 });

  const stat = fs.statSync(target);
  // Mask the mode bits we actually set (permission bits, not type)
  assert.strictEqual(stat.mode & 0o777, 0o755);
});

// safeRmSync — issue #688

test('safeRmSync removes a regular directory inside the project root', (t) => {
  const root = makeTempDir();
  t.after(() => cleanup(root));

  const target = path.join(root, 'kill-me');
  fs.mkdirSync(path.join(target, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(target, 'file.txt'), 'x');

  const result = safeRmSync(target, root);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(fs.existsSync(target), false);
});

test('safeRmSync only unlinks a top-level symlink — never traverses to its target', (t) => {
  const root = makeTempDir();
  const outside = makeTempDir();
  t.after(() => { cleanup(root); cleanup(outside); });

  const precious = path.join(outside, 'precious.txt');
  fs.writeFileSync(precious, 'do not delete');

  const link = path.join(root, 'link-out');
  fs.symlinkSync(outside, link);

  const result = safeRmSync(link, root);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.reason, 'symlink-unlinked');
  assert.strictEqual(fs.existsSync(link), false);            // link gone
  assert.strictEqual(fs.existsSync(precious), true);          // target intact
});

test('safeRmSync refuses paths whose realpath escapes the project root', (t) => {
  const root = makeTempDir();
  t.after(() => cleanup(root));

  const result = safeRmSync('/etc/hosts', root);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.reason, 'outside-root');
  assert.strictEqual(fs.existsSync('/etc/hosts'), true);      // /etc/hosts still there
});

test('safeRmSync returns ok with reason=missing for non-existent paths', (t) => {
  const root = makeTempDir();
  t.after(() => cleanup(root));

  const result = safeRmSync(path.join(root, 'nope'), root);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.reason, 'missing');
});

test('safeRmSync allows nested paths inside the root', (t) => {
  const root = makeTempDir();
  t.after(() => cleanup(root));

  const deep = path.join(root, 'a', 'b', 'c');
  fs.mkdirSync(deep, { recursive: true });
  fs.writeFileSync(path.join(deep, 'file'), 'x');

  const result = safeRmSync(path.join(root, 'a'), root);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(fs.existsSync(deep), false);
});
