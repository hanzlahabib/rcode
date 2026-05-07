/**
 * Unit tests for cli/update.js (Wave 3 W3.4 — issue #694 follow-up).
 *
 * Pure functions only — parseArgs and detectInstalledEditors. The full
 * update flow exercises install.js + child processes which is heavy
 * to integration-test; we cover the safety-critical inputs here.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const update = require('../cli/update.js');
const { makeTempDir, cleanup } = require('./helpers.cjs');

// ---- parseArgs ----

test('parseArgs: --yes sets yes=true', () => {
  assert.deepStrictEqual(update.parseArgs(['--yes']), { yes: true });
});

test('parseArgs: -y short flag is equivalent to --yes', () => {
  assert.deepStrictEqual(update.parseArgs(['-y']), { yes: true });
});

test('parseArgs: empty args returns defaults', () => {
  assert.deepStrictEqual(update.parseArgs([]), { yes: false });
});

test('parseArgs: unknown args are silently ignored (does not throw)', () => {
  // Documents lenient behavior — update never errors on stray flags so
  // users running `rcode update --debug` get the same default behavior.
  assert.deepStrictEqual(update.parseArgs(['--unknown', 'positional']), { yes: false });
});

test('parseArgs: --yes can appear anywhere in the arg list', () => {
  assert.deepStrictEqual(update.parseArgs(['arg1', '--yes', 'arg2']), { yes: true });
});

// ---- detectInstalledEditors ----

test('detectInstalledEditors: empty cwd returns []', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  assert.deepStrictEqual(update.detectInstalledEditors(dir), []);
});

test('detectInstalledEditors: detects claude when .claude/skills/rihal-* exists', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  fs.mkdirSync(path.join(dir, '.claude/skills/rihal-do'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude/skills/rihal-do/SKILL.md'), '# do\n');
  const editors = update.detectInstalledEditors(dir);
  assert.ok(editors.includes('claude'), 'claude should be detected');
});

test('detectInstalledEditors: ignores .claude/skills without rihal- prefix', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  fs.mkdirSync(path.join(dir, '.claude/skills/some-other-skill'), { recursive: true });
  const editors = update.detectInstalledEditors(dir);
  assert.ok(!editors.includes('claude'), 'claude should NOT be detected without rihal- prefix');
});

test('detectInstalledEditors: detects cursor only with rihal-*.mdc files', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));

  // Wrong extension → not detected
  fs.mkdirSync(path.join(dir, '.cursor/rules'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.cursor/rules/rihal-foo.md'), 'x');
  assert.ok(!update.detectInstalledEditors(dir).includes('cursor'));

  // Correct extension → detected
  fs.writeFileSync(path.join(dir, '.cursor/rules/rihal-foo.mdc'), 'x');
  assert.ok(update.detectInstalledEditors(dir).includes('cursor'));
});

test('detectInstalledEditors: detects windsurf only with rihal-*.mdc', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  fs.mkdirSync(path.join(dir, '.windsurf/rules'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.windsurf/rules/rihal-x.mdc'), 'x');
  assert.ok(update.detectInstalledEditors(dir).includes('windsurf'));
});

test('detectInstalledEditors: detects antigravity', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  fs.mkdirSync(path.join(dir, '.antigravity/agents/rihal-x'), { recursive: true });
  assert.ok(update.detectInstalledEditors(dir).includes('antigravity'));
});

test('detectInstalledEditors: returns multiple editors when multiple are installed', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  fs.mkdirSync(path.join(dir, '.claude/skills/rihal-do'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.cursor/rules'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.cursor/rules/rihal-x.mdc'), 'x');
  const editors = update.detectInstalledEditors(dir);
  assert.ok(editors.includes('claude'));
  assert.ok(editors.includes('cursor'));
});
