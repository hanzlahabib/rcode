/**
 * Tests for the `pre-compact` subcommand in rcode/bin/rcode-hooks.cjs.
 *
 * pre-compact is a PreCompact hook (#743): it refreshes HANDOFF.json with the
 * active phase/plan pointer so a post-compaction agent can resume. It is a
 * no-op when no phase is active. It must never block compaction.
 *
 * Run: node --test test/precompact-hook.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const HOOK = path.resolve(__dirname, '../rcode/bin/rcode-hooks.cjs');

function makeTempCwd(state) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-precompact-'));
  if (state !== undefined) {
    fs.mkdirSync(path.join(dir, '.rcode'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, '.rcode', 'state.json'),
      JSON.stringify(state, null, 2)
    );
  }
  return dir;
}

function runHook(cwd, payload) {
  return spawnSync(process.execPath, [HOOK, 'pre-compact'], {
    encoding: 'utf8',
    cwd,
    input: JSON.stringify(payload || {}),
  });
}

test('no state.json — exits 0 and writes no HANDOFF.json', () => {
  const dir = makeTempCwd(undefined);
  const result = runHook(dir, { trigger: 'manual' });
  assert.strictEqual(result.status, 0);
  assert.ok(!fs.existsSync(path.join(dir, 'HANDOFF.json')));
});

test('no active phase — exits 0 and writes no HANDOFF.json', () => {
  const dir = makeTempCwd({
    current_phase: null,
    current_plan: 0,
    current_sprint: null,
    phases: [],
  });
  const result = runHook(dir, { trigger: 'auto' });
  assert.strictEqual(result.status, 0);
  assert.ok(!fs.existsSync(path.join(dir, 'HANDOFF.json')));
});

test('active phase — writes HANDOFF.json with phase number and current_plan', () => {
  const dir = makeTempCwd({
    current_phase: 'Audit Gap Closure',
    current_plan: 1,
    current_sprint: '28.1',
    phases: [
      { number: '28', name: 'Audit Gap Closure', status: 'executing' },
    ],
  });
  const result = runHook(dir, { trigger: 'auto' });
  assert.strictEqual(result.status, 0);
  const handoffPath = path.join(dir, 'HANDOFF.json');
  assert.ok(fs.existsSync(handoffPath));
  const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
  assert.strictEqual(handoff.reason, 'pre-compact');
  assert.strictEqual(handoff.current_plan, 1);
  assert.strictEqual(handoff.current_sprint, '28.1');
  assert.ok(String(handoff.phase).includes('28') ||
    String(handoff.phase).includes('Audit'));
  assert.ok(handoff.generated_at);
});
