/**
 * Tests for the `cost-track` subcommand in rcode/bin/rcode-hooks.cjs.
 *
 * cost-track is a Stop hook (#745): on response completion it appends one
 * usage record to .rcode/telemetry/cost.jsonl so session-report can report
 * measured token totals. It must never block (exit 0 on success).
 *
 * Run: node --test test/cost-track-hook.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const HOOK = path.resolve(__dirname, '../rcode/bin/rcode-hooks.cjs');

function makeTempCwd() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-costtrack-'));
}

function runHook(cwd, payload) {
  return spawnSync(process.execPath, [HOOK, 'cost-track'], {
    encoding: 'utf8',
    cwd,
    input: JSON.stringify(payload || {}),
  });
}

function costLogPath(dir) {
  return path.join(dir, '.rcode', 'telemetry', 'cost.jsonl');
}

const SAMPLE = { usage: { input_tokens: 1200, output_tokens: 340 } };

test('Stop payload with usage — appends exactly one line', () => {
  const dir = makeTempCwd();
  const result = runHook(dir, SAMPLE);
  assert.strictEqual(result.status, 0);
  const lines = fs.readFileSync(costLogPath(dir), 'utf8')
    .split('\n').filter(Boolean);
  assert.strictEqual(lines.length, 1);
});

test('two invocations — appends two lines', () => {
  const dir = makeTempCwd();
  runHook(dir, SAMPLE);
  runHook(dir, SAMPLE);
  const lines = fs.readFileSync(costLogPath(dir), 'utf8')
    .split('\n').filter(Boolean);
  assert.strictEqual(lines.length, 2);
});

test('each line parses as JSON with ts, input_tokens, output_tokens', () => {
  const dir = makeTempCwd();
  runHook(dir, SAMPLE);
  const line = fs.readFileSync(costLogPath(dir), 'utf8')
    .split('\n').filter(Boolean)[0];
  const record = JSON.parse(line);
  assert.ok(record.ts);
  assert.strictEqual(record.input_tokens, 1200);
  assert.strictEqual(record.output_tokens, 340);
});

test('no usage block — exits 0 and writes nothing', () => {
  const dir = makeTempCwd();
  const result = runHook(dir, { trigger: 'stop' });
  assert.strictEqual(result.status, 0);
  assert.ok(!fs.existsSync(costLogPath(dir)));
});
