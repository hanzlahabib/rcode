/**
 * Tests for the `stop-verify` subcommand in rihal/bin/rihal-hooks.cjs.
 *
 * stop-verify is a Stop hook (#744): on response completion it syntax-checks
 * the files changed during the response and surfaces failures to stderr. It is
 * advisory — it never auto-fixes and never blocks (exit 1 max, never exit 2).
 *
 * Run: node --test test/stop-verify-hook.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const HOOK = path.resolve(__dirname, '../rihal/bin/rihal-hooks.cjs');

function makeTempCwd() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rihal-stopverify-'));
}

function runHook(cwd, payload) {
  return spawnSync(process.execPath, [HOOK, 'stop-verify'], {
    encoding: 'utf8',
    cwd,
    input: JSON.stringify(payload || {}),
  });
}

test('changed .cjs with valid syntax — exits 0', () => {
  const dir = makeTempCwd();
  const file = path.join(dir, 'good.cjs');
  fs.writeFileSync(file, 'module.exports = function () { return 1; };\n');
  const result = runHook(dir, { changed_files: [file] });
  assert.strictEqual(result.status, 0);
});

test('changed .cjs with a syntax error — exits non-zero and names the file', () => {
  const dir = makeTempCwd();
  const file = path.join(dir, 'broken.cjs');
  fs.writeFileSync(file, 'module.exports = function ( { return ;;;\n');
  const result = runHook(dir, { changed_files: [file] });
  assert.notStrictEqual(result.status, 0);
  assert.ok(result.stderr.includes('broken.cjs'));
});

test('empty changed-files list — exits 0', () => {
  const dir = makeTempCwd();
  const result = runHook(dir, { changed_files: [] });
  assert.strictEqual(result.status, 0);
});
