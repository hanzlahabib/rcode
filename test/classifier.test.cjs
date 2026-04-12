/**
 * Tests for cmdClassifyQuestion() in rihal/v2/bin/rihal-tools.cjs.
 *
 * We extract the function by patching process.argv so main() exits early,
 * then reaching into the module. Since the file calls main() at the bottom
 * and exits on unknown subcommands, we run it as a child process instead
 * and parse stdout JSON.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const TOOL = path.resolve(__dirname, '../rihal/v2/bin/rihal-tools.cjs');

function classify(question) {
  const result = spawnSync(process.execPath, [TOOL, 'classify-question', question], {
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(`classify failed: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

test('English greenfield question → greenfield', () => {
  const r = classify('I want to start a new project from scratch');
  assert.strictEqual(r.type, 'greenfield');
});

test('English market question → market', () => {
  const r = classify('What are the market opportunities in the UAE for fintech?');
  assert.ok(['market', 'discovery'].includes(r.type), `expected market or discovery, got ${r.type}`);
});

test('Roman Urdu affiliate+dubai question → market (not codebase)', () => {
  const r = classify('yar aik affiliate site bnanai hai research kar kai btao mai dubai ma kar skn');
  assert.notStrictEqual(r.type, 'codebase', 'should not classify as codebase');
  assert.ok(['market', 'greenfield', 'discovery'].includes(r.type), `expected market/greenfield/discovery, got ${r.type}`);
});

test('Roman Urdu affiliate+dubai question → market specifically', () => {
  const r = classify('yar aik affiliate site bnanai hai research kar kai btao mai dubai ma kar skn');
  assert.strictEqual(r.type, 'market');
});

test('Urdu unicode dubai+site → market or greenfield', () => {
  const r = classify('دبئی میں سائٹ بنانا');
  assert.ok(['market', 'greenfield'].includes(r.type), `expected market or greenfield, got ${r.type}`);
});

test('Urdu unicode market keyword دبئی → market', () => {
  const r = classify('دبئی میں کاروبار کیسے کریں');
  assert.strictEqual(r.type, 'market');
});

test('Auth layer question → codebase', () => {
  const r = classify('how do I fix the auth layer in this service?');
  assert.strictEqual(r.type, 'codebase');
});

test('Technical debt question → codebase', () => {
  const r = classify('we have serious tech debt in the payment module');
  assert.strictEqual(r.type, 'codebase');
});

test('Roman Urdu shuru karna (start) → greenfield', () => {
  const r = classify('ek naya project shuru karna hai koi idea do');
  assert.ok(['greenfield', 'discovery'].includes(r.type), `expected greenfield or discovery, got ${r.type}`);
});

test('Ambiguous short question falls back to codebase', () => {
  const r = classify('help me please');
  assert.strictEqual(r.type, 'codebase');
});
