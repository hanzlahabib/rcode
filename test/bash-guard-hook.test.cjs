/**
 * Tests for the `bash-guard` subcommand in rihal/bin/rihal-hooks.cjs.
 *
 * bash-guard is a PreToolUse:Bash hook: exit 2 blocks the command,
 * exit 0 allows it. Covers issue #742 — enforcing AGENTS.md rules
 * (no unapproved git push, never --force, no --no-verify, no unscoped
 * destructive git/rm) as a hard gate rather than prose.
 *
 * Run: node --test test/bash-guard-hook.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const HOOK = path.resolve(__dirname, '../rihal/bin/rihal-hooks.cjs');

function runGuard(command) {
  const result = spawnSync(process.execPath, [HOOK, 'bash-guard'], {
    encoding: 'utf8',
    input: JSON.stringify({ tool_input: { command } }),
  });
  return result.status;
}

const BLOCKED = 2;
const ALLOWED = 0;

test('plain git push is blocked', () => {
  assert.strictEqual(runGuard('git push'), BLOCKED);
  assert.strictEqual(runGuard('git push origin main'), BLOCKED);
});

test('git push with RIHAL_PUSH_OK token is allowed', () => {
  assert.strictEqual(runGuard('RIHAL_PUSH_OK=1 git push origin main'), ALLOWED);
});

test('git push --force is blocked even with the token', () => {
  assert.strictEqual(runGuard('RIHAL_PUSH_OK=1 git push --force'), BLOCKED);
  assert.strictEqual(runGuard('RIHAL_PUSH_OK=1 git push --force-with-lease'), BLOCKED);
  assert.strictEqual(runGuard('RIHAL_PUSH_OK=1 git push -f origin main'), BLOCKED);
});

test('--no-verify is blocked', () => {
  assert.strictEqual(runGuard('git commit -m "x" --no-verify'), BLOCKED);
});

test('destructive git commands are blocked', () => {
  assert.strictEqual(runGuard('git reset --hard HEAD~1'), BLOCKED);
  assert.strictEqual(runGuard('git clean -fd'), BLOCKED);
});

test('rm -rf outside the allowlist is blocked', () => {
  assert.strictEqual(runGuard('rm -rf /'), BLOCKED);
  assert.strictEqual(runGuard('rm -rf src'), BLOCKED);
  assert.strictEqual(runGuard('rm -rf ../sibling'), BLOCKED);
  assert.strictEqual(runGuard('rm -rf ~/Documents'), BLOCKED);
});

test('rm -rf against safe build/cache paths is allowed', () => {
  assert.strictEqual(runGuard('rm -rf node_modules'), ALLOWED);
  assert.strictEqual(runGuard('rm -rf dist'), ALLOWED);
  assert.strictEqual(runGuard('rm -rf /tmp/scratch'), ALLOWED);
});

test('ordinary commands are allowed', () => {
  assert.strictEqual(runGuard('git status'), ALLOWED);
  assert.strictEqual(runGuard('ls -la'), ALLOWED);
  assert.strictEqual(runGuard('npm test'), ALLOWED);
});

test('empty command is allowed', () => {
  assert.strictEqual(runGuard(''), ALLOWED);
});

test('substring RIHAL_PUSH_OK does not un-gate a push', () => {
  assert.strictEqual(runGuard('echo RIHAL_PUSH_OK; git push'), BLOCKED);
  assert.strictEqual(runGuard('git push # RIHAL_PUSH_OK'), BLOCKED);
});

test('+-prefixed refspec force-push is blocked', () => {
  assert.strictEqual(runGuard('git push origin +main'), BLOCKED);
  assert.strictEqual(runGuard('RIHAL_PUSH_OK=1 git push origin +main'), BLOCKED);
  assert.strictEqual(
    runGuard('git push origin +HEAD:refs/heads/main'),
    BLOCKED
  );
});

test('genuine authorized push still works', () => {
  assert.strictEqual(runGuard('RIHAL_PUSH_OK=1 git push origin main'), ALLOWED);
});
