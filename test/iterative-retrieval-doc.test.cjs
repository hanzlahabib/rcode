/**
 * Iterative-retrieval loop doc-parity test.
 *
 * The bounded iterative-retrieval loop (#748) is workflow prose: a contract
 * reference (`iterative-retrieval.md`) `@`-included by the two research-
 * spawning workflows. There is no runtime function to exercise — this test
 * locks the wiring so a future edit that removes the loop fails CI.
 *
 * Asserts:
 *   - the loop-contract reference exists and states the 3-cycle cap + the
 *     executor out-of-scope rule.
 *   - both research workflows @-include the reference, and the @-ref resolves.
 *   - each research workflow carries the sufficiency/cycle keyword.
 *
 * Run: node --test test/iterative-retrieval-doc.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REF = path.join(ROOT, '.rihal', 'references', 'iterative-retrieval.md');
const RESEARCH_WORKFLOWS = ['research-phase.md', 'new-project-research.md'];

function wf(name) {
  return fs.readFileSync(path.join(ROOT, 'rihal', 'workflows', name), 'utf8');
}

test('iterative-retrieval.md reference exists', () => {
  assert.ok(fs.existsSync(REF), 'iterative-retrieval.md must exist');
});

test('iterative-retrieval.md states the 3-cycle cap', () => {
  const text = fs.readFileSync(REF, 'utf8');
  assert.ok(/3 cycle/i.test(text), 'reference must state the 3-cycle cap');
});

test('iterative-retrieval.md states the executor out-of-scope rule', () => {
  const text = fs.readFileSync(REF, 'utf8');
  assert.ok(
    /executor/i.test(text),
    'reference must state the loop does not apply to executor subagents',
  );
});

for (const name of RESEARCH_WORKFLOWS) {
  test(`${name} @-includes iterative-retrieval.md and the ref resolves`, () => {
    const text = wf(name);
    const m = text.match(/@((?:\.rihal|rihal)\/references\/iterative-retrieval\.md)/);
    assert.ok(m, `${name} must @-include iterative-retrieval.md`);
    assert.ok(
      fs.existsSync(path.join(ROOT, m[1])),
      `${name}'s @-ref ${m[1]} must resolve to an existing file`,
    );
  });

  test(`${name} carries the sufficiency/cycle keyword`, () => {
    const text = wf(name);
    assert.ok(/cycle/i.test(text), `${name} must mention the bounded cycle`);
  });
}
