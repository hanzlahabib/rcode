/**
 * Tests for the `compact-nudge` subcommand in rcode/bin/rcode-hooks.cjs.
 *
 * compact-nudge is a PreToolUse:Edit|Write hook (#749): it counts Edit/Write
 * calls per session and, once the count crosses a threshold, prints an
 * advisory suggesting /rcode-trim or /clear. It is purely advisory — it must
 * always exit 0 and never block a tool call.
 *
 * Run: node --test test/compact-nudge-hook.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const HOOK = path.resolve(__dirname, '../rcode/bin/rcode-hooks.cjs');

function uniqueSession() {
  return 'test-' + process.pid + '-' + Math.random().toString(36).slice(2);
}

function runHook(payload, env) {
  return spawnSync(process.execPath, [HOOK, 'compact-nudge'], {
    encoding: 'utf8',
    input: JSON.stringify(payload || {}),
    env: { ...process.env, ...(env || {}) },
  });
}

function cleanup(sessionId) {
  const counter = path.join(os.tmpdir(), 'rcode-nudge-' + sessionId + '.count');
  if (fs.existsSync(counter)) fs.unlinkSync(counter);
}

test('below threshold — exits 0 and prints nothing', () => {
  const session = uniqueSession();
  cleanup(session);
  const result = runHook({ session_id: session }, {
    RCODE_NUDGE_THRESHOLD: '5',
  });
  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stderr.trim(), '');
  cleanup(session);
});

test('crossing the threshold — exits 0 and prints an advisory', () => {
  const session = uniqueSession();
  cleanup(session);
  let result;
  for (let i = 0; i < 3; i++) {
    result = runHook({ session_id: session }, {
      RCODE_NUDGE_THRESHOLD: '3',
    });
  }
  assert.strictEqual(result.status, 0);
  assert.ok(/\/rcode-trim|\/clear/.test(result.stderr));
  cleanup(session);
});

test('threshold honors RCODE_NUDGE_THRESHOLD env var', () => {
  const session = uniqueSession();
  cleanup(session);
  // With threshold 1, the very first call should already nudge.
  const result = runHook({ session_id: session }, {
    RCODE_NUDGE_THRESHOLD: '1',
  });
  assert.strictEqual(result.status, 0);
  assert.ok(/\/rcode-trim|\/clear/.test(result.stderr));
  cleanup(session);
});
