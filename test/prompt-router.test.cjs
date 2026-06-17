/**
 * Tests for the `prompt-router` subcommand in rcode/bin/rcode-hooks.cjs.
 *
 * prompt-router is a UserPromptSubmit hook (#892): it keyword-matches the
 * user's prompt against an INTENT_TABLE derived from rcode/workflows/do.md
 * and emits a memory-framed advisory via hookSpecificOutput.additionalContext.
 * It must always exit 0 and never block or error on any input.
 *
 * Run: node --test test/prompt-router.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const HOOK = path.resolve(__dirname, '../rcode/bin/rcode-hooks.cjs');

function uniqueSession() {
  return 'test-pr-' + process.pid + '-' + Math.random().toString(36).slice(2);
}

/**
 * Spawn the prompt-router subcommand.
 * cwd defaults to os.tmpdir() to avoid the real repo's .rcode/config.yaml
 * interfering with tests that need a clean environment.
 */
function runRouter(payload, options) {
  const { cwd, env } = options || {};
  return spawnSync(process.execPath, [HOOK, 'prompt-router'], {
    encoding: 'utf8',
    input: typeof payload === 'string' ? payload : JSON.stringify(payload || {}),
    cwd: cwd || os.tmpdir(),
    env: { ...process.env, ...(env || {}) },
  });
}

/** Clean up per-session dedupe files written to os.tmpdir() */
function cleanupDedupe(sessionId) {
  const dedupeFile = path.join(os.tmpdir(), 'rcode-prompt-nudge-' + sessionId + '.json');
  if (fs.existsSync(dedupeFile)) fs.unlinkSync(dedupeFile);
}

/** Create a temp project dir with a .rcode/config.yaml */
function makeTempProject(configContent) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-pr-test-'));
  fs.mkdirSync(path.join(dir, '.rcode'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.rcode', 'config.yaml'), configContent);
  return dir;
}

// ─── 1. Match emits memory-framed advisory ───────────────────────────────────

test('matching prompt emits memory-framed advisory with correct fields', () => {
  const result = runRouter({ prompt: 'explore how the auth flow works', hook_event_name: 'UserPromptSubmit' });

  assert.strictEqual(result.status, 0, 'status must be 0');
  assert.ok(result.stdout.length > 0, 'stdout must not be empty on match');

  const out = JSON.parse(result.stdout);
  const ctx = out.hookSpecificOutput.additionalContext;

  assert.ok(/state\.json/.test(ctx), 'advisory must mention state.json');
  assert.ok(/\/rcode-memory-update/.test(ctx), 'advisory must mention /rcode-memory-update');
  assert.ok(/\/rcode-/.test(ctx), 'advisory must name a /rcode- command');
  assert.strictEqual(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
});

// ─── 2. Audit prompt routes to review/audit ──────────────────────────────────

test('audit prompt routes to /rcode-review or /rcode-audit', () => {
  const result = runRouter({ prompt: 'audit the code for too much complexity' });

  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.length > 0, 'stdout must not be empty on audit match');

  const out = JSON.parse(result.stdout);
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.ok(/\/rcode-review|\/rcode-audit/.test(ctx), 'advisory must route to rcode-review or rcode-audit');
});

// ─── 3. Non-match is silent ───────────────────────────────────────────────────

test('non-matching prompt exits 0 with empty stdout', () => {
  const result = runRouter({ prompt: 'what time is it?' });

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout, '', 'non-match must produce no output');
});

// ─── 4. Leading /rcode- is silent (slash router handles it) ──────────────────

test('prompt starting with /rcode- is silent', () => {
  const result = runRouter({ prompt: '/rcode-plan phase 38' });

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout, '', 'already a command — must produce no output');
});

// ─── 5. Malformed stdin is swallowed ─────────────────────────────────────────

test('malformed stdin is swallowed — exit 0, empty stdout', () => {
  const result = runRouter('garbage input that is not json at all');

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout, '');
});

// ─── 6. Empty stdin is swallowed ─────────────────────────────────────────────

test('empty stdin is swallowed — exit 0, empty stdout', () => {
  const result = runRouter('');

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout, '');
});

// ─── 7. prompt_nudge: off silences output ─────────────────────────────────────

test('prompt_nudge: off produces no output', () => {
  const tmpDir = makeTempProject('prompt_nudge: off\n');
  try {
    const result = runRouter(
      { prompt: 'explore how the auth flow works' },
      { cwd: tmpDir }
    );

    assert.strictEqual(result.status, 0);
    assert.strictEqual(result.stdout, '', 'off mode must produce no output');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── 8. once-per-intent dedupe ────────────────────────────────────────────────

test('once-per-intent: first call emits; second call with same session+intent is silent', () => {
  const session = uniqueSession();
  cleanupDedupe(session);

  const tmpDir = makeTempProject('prompt_nudge: once-per-intent\n');
  const payload = JSON.stringify({ prompt: 'explore how authentication works', session_id: session });

  try {
    // First call — should emit
    const first = runRouter(payload, { cwd: tmpDir });
    assert.strictEqual(first.status, 0);
    assert.ok(first.stdout.length > 0, 'first call must emit advisory');

    // Second call — same session + same intent slug (explore) → silent
    const second = runRouter(payload, { cwd: tmpDir });
    assert.strictEqual(second.status, 0);
    assert.strictEqual(second.stdout, '', 'second call with same intent must be silent');
  } finally {
    cleanupDedupe(session);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── 9. Bonus: hookEventName forwarded from input ────────────────────────────

test('hookEventName from input is forwarded in output', () => {
  const result = runRouter({
    prompt: 'let me brainstorm ideas for the new feature',
    hook_event_name: 'UserPromptSubmit',
  });

  assert.strictEqual(result.status, 0);
  if (result.stdout.length > 0) {
    const out = JSON.parse(result.stdout);
    assert.strictEqual(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  }
});
