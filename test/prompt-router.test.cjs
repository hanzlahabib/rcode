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

  assert.ok(/\/rcode-memory-update/.test(ctx), 'advisory must mention /rcode-memory-update');
  assert.ok(/\/rcode-/.test(ctx), 'advisory must name a /rcode- command');
  assert.strictEqual(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
});

// ─── 2. Audit prompts route to the right entry point ────────────────────────
// #956: "audit"/"code review" (generic) must land on the disambiguating
// /rcode-audit router, not the karpathy lens. Karpathy-specific phrasing
// ("too complex", "complexity", "karpathy") routes to the real karpathy
// entry point, /rcode-karpathy-audit — review.md has no --karpathy flag.

test('bare "audit" prompt routes to /rcode-audit', () => {
  const result = runRouter({ prompt: 'can you audit this for me' });

  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.length > 0, 'stdout must not be empty on audit match');

  const out = JSON.parse(result.stdout);
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.ok(/\/rcode-audit\b/.test(ctx), 'advisory must route to /rcode-audit');
});

test('karpathy-flavored prompt routes to /rcode-karpathy-audit', () => {
  const result = runRouter({ prompt: 'this diff is too complex, check for karpathy violations' });

  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.length > 0, 'stdout must not be empty on karpathy match');

  const out = JSON.parse(result.stdout);
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.ok(/\/rcode-karpathy-audit\b/.test(ctx), 'advisory must route to /rcode-karpathy-audit');
});

// ─── 2b. Roman-Urdu / Arabic prompts match too (#957) ────────────────────────

test('Roman-Urdu debug prompt routes to /rcode-debug', () => {
  const result = runRouter({ prompt: 'yar yeh kaam nahi kar raha, fix karo', session_id: uniqueSession() });

  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.length > 0, 'stdout must not be empty on Roman-Urdu match');

  const out = JSON.parse(result.stdout);
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.ok(/\/rcode-debug\b/.test(ctx), 'advisory must route to /rcode-debug');
});

test('Arabic debug prompt routes to /rcode-debug', () => {
  const result = runRouter({ prompt: 'هذا الكود لا يعمل، من فضلك أصلح الخطأ', session_id: uniqueSession() });

  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.length > 0, 'stdout must not be empty on Arabic match');

  const out = JSON.parse(result.stdout);
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.ok(/\/rcode-debug\b/.test(ctx), 'advisory must route to /rcode-debug');
});

// ─── 3. Non-match is silent ───────────────────────────────────────────────────

test('non-matching prompt exits 0 with empty stdout', () => {
  const result = runRouter({ prompt: 'what time is it?' });

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout, '', 'non-match must produce no output');
});

// ─── 3b. Tightened keywords — previously-broad matches must NOT nudge ────────

test('"what does this error message mean" must not nudge (M3: error narrowed)', () => {
  // Bare 'error' was too broad; now only multi-word debug phrases match.
  const result = runRouter({ prompt: 'what does this error message mean?' });

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout, '', '"error" in a question must not trigger debug nudge');
});

test('"I did research on this topic" must not nudge (M3: research narrowed)', () => {
  // Past-tense reference to research is not navigation intent.
  const result = runRouter({ prompt: 'I did research on this topic already' });

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout, '', 'past-tense "research" reference must not trigger explore nudge');
});

test('"how do I format a string in JS?" must not nudge (M3: how-do removed)', () => {
  // Factual "how do" questions are not research-phase navigation intent.
  const result = runRouter({ prompt: 'how do I format a string in JS?' });

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout, '', '"how do" factual question must not trigger explore nudge');
});

test('"getting an error when I deploy" must nudge to /rcode-debug (M3: multi-word match)', () => {
  // Multi-word debug phrase should still route correctly.
  const result = runRouter({ prompt: 'I am getting an error when I deploy the service', session_id: uniqueSession() });

  assert.strictEqual(result.status, 0);
  assert.ok(result.stdout.length > 0, '"getting an error" must still emit debug nudge');
  const out = JSON.parse(result.stdout);
  assert.ok(/rcode-debug/.test(out.hookSpecificOutput.additionalContext));
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

// ─── 10. Missing data file warns once instead of a silent permanent no-op (#952) ──
//
// Runs the hook against a standalone copy of rcode-hooks.cjs (+ its lib/
// dependency) in a scratch directory with NO rcode/data/intent-table.json,
// instead of renaming the real repo file — mutating the shared data file
// in-place would race with every other test file that also spawns this hook.

function makeHookCopyWithoutDataFile() {
  const scratchRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-hook-nodata-'));
  const binDir = path.join(scratchRoot, 'bin');
  fs.mkdirSync(path.join(binDir, 'lib'), { recursive: true });
  fs.copyFileSync(HOOK, path.join(binDir, 'rcode-hooks.cjs'));
  for (const lib of ['state-reader.cjs', 'memory-select.cjs', 'config.cjs']) {
    fs.copyFileSync(
      path.resolve(__dirname, '../rcode/bin/lib/', lib),
      path.join(binDir, 'lib', lib)
    );
  }
  // scratchRoot/data/ intentionally does not exist — simulates a consumer
  // install missing rcode/data/ (#952).
  return { scratchRoot, hookCopy: path.join(binDir, 'rcode-hooks.cjs') };
}

test('missing intent-table.json warns once, then goes silent', () => {
  const { scratchRoot, hookCopy } = makeHookCopyWithoutDataFile();
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-pr-missing-data-'));
  const warnKey = projectDir.replace(/[^a-zA-Z0-9]/g, '_');
  const warnFile = path.join(os.tmpdir(), 'rcode-intent-table-missing-warned-' + warnKey);

  function runCopy(payload) {
    return spawnSync(process.execPath, [hookCopy, 'prompt-router'], {
      encoding: 'utf8',
      input: JSON.stringify(payload),
      cwd: projectDir,
      env: process.env,
    });
  }

  try {
    fs.rmSync(warnFile, { force: true });

    // First call — data file missing → warn once
    const first = runCopy({ prompt: 'hello there' });
    assert.strictEqual(first.status, 0);
    assert.ok(first.stdout.length > 0, 'first call must emit the missing-data-file warning');
    const out = JSON.parse(first.stdout);
    assert.match(
      out.hookSpecificOutput.additionalContext,
      /npx @hanzlaa\/rcode update/,
      'warning must tell the user how to fix the missing install'
    );

    // Second call, same project — already warned → silent
    const second = runCopy({ prompt: 'hello again' });
    assert.strictEqual(second.status, 0);
    assert.strictEqual(second.stdout, '', 'second call must not repeat the warning');
  } finally {
    fs.rmSync(warnFile, { force: true });
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  }
});
