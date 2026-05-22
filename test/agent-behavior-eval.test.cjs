/**
 * Tests for the agent-behavior regression harness (issue #746).
 *
 * Spawns `node test/eval/run-eval.cjs` (no --bless) and asserts exit 0, so any
 * structural drift in a tracked SKILL.md / agent .md fails the standard
 * `node --test` run. Also confirms a committed baseline file exists and parses
 * as JSON.
 *
 * Run: node --test test/agent-behavior-eval.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const RUN_EVAL = path.join(ROOT, 'test', 'eval', 'run-eval.cjs');
const BASELINE_DIR = path.join(ROOT, 'test', 'eval', 'baselines');

test('run-eval.cjs reports no behavior drift against committed baselines', () => {
  const result = spawnSync(process.execPath, [RUN_EVAL], { encoding: 'utf8' });
  assert.strictEqual(
    result.status,
    0,
    `agent-behavior drift detected — review the diff and, if intentional, ` +
      `re-bless with \`node test/eval/run-eval.cjs --bless\`:\n${result.stdout}\n${result.stderr}`
  );
});

test('a known baseline file exists and parses as JSON', () => {
  const baselineFiles = fs
    .readdirSync(BASELINE_DIR)
    .filter((f) => f.endsWith('.json'));
  assert.ok(baselineFiles.length >= 5, 'at least 5 baseline files exist');

  const sample = path.join(BASELINE_DIR, 'rihal__agents__rcode-planner.json');
  assert.ok(fs.existsSync(sample), `expected baseline ${sample}`);
  const parsed = JSON.parse(fs.readFileSync(sample, 'utf8'));
  assert.strictEqual(parsed.artifact, 'rcode/agents/rcode-planner.md');
  assert.ok(Array.isArray(parsed.tools), 'baseline has a tools array');
});
