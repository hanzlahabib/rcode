/**
 * Shared agent core (#1104): one small always-loaded include replaces
 * response-style + karpathy-guidelines for agents; the persona rules split into
 * a slim always-loaded file and an on-demand extended file.
 *
 * Run: node --test test/agent-core.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REFS = path.resolve(__dirname, '..', 'rcode', 'references');
const CHARS_PER_TOKEN = 4;
const AGENT_CORE_MAX_TOKENS = 1500;
const SHARED_RULES_MAX_CHARS = 3072;
const read = (f) => fs.readFileSync(path.join(REFS, f), 'utf8');

test('agent-core.md stays under the token budget and carries P1-P4', () => {
  const core = read('agent-core.md');
  assert.ok(core.length / CHARS_PER_TOKEN <= AGENT_CORE_MAX_TOKENS, `${core.length / CHARS_PER_TOKEN} tokens`);
  for (const p of ['Think first', 'Simplicity', 'Surgical', 'Goal-driven']) assert.ok(core.includes(p), p);
  assert.ok(/No theoretical suggestions/.test(core));
  assert.ok(/git push/.test(core));
});

test('agent-shared-rules.md is the slim floor; detail lives in the extended file', () => {
  assert.ok(read('agent-shared-rules.md').length <= SHARED_RULES_MAX_CHARS);
  assert.match(read('agent-shared-rules.md'), /agent-shared-rules-extended\.md/);
  assert.match(read('agent-shared-rules-extended.md'), /Elicitation is not authoring/);
  assert.match(read('agent-shared-rules.md'), /Calibration/);
});

test('planner-playbook does not @-include its example execution_context', () => {
  assert.ok(!/^@\.rcode\//m.test(read('planner-playbook.md')));
});
