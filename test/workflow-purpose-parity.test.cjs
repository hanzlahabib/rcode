/**
 * Workflow files must declare a <purpose> block.
 *
 * The <purpose>...</purpose> XML block is parsed by some downstream
 * tooling (skill stubs, dashboard, agent context loaders) to render
 * a one-paragraph summary. Workflow files that omit it fall back to
 * an empty string in those surfaces.
 *
 * Found 5 omissions on round-9 gap scan; this test locks the gate.
 *
 * Run: node --test test/workflow-purpose-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const WORKFLOWS_DIR = path.join(PROJECT_ROOT, 'rihal', 'workflows');

test('every workflow file declares a <purpose> block', () => {
  if (!fs.existsSync(WORKFLOWS_DIR)) return;
  const missing = [];
  for (const f of fs.readdirSync(WORKFLOWS_DIR)) {
    if (!f.endsWith('.md')) continue;
    const text = fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf8');
    if (!/<purpose>/.test(text)) missing.push(f);
  }
  assert.deepEqual(
    missing.sort(),
    [],
    `Workflows missing <purpose> block:\n  ${missing.join('\n  ')}\n` +
      `Add a <purpose>...</purpose> block at the top describing what the workflow does.`,
  );
});
