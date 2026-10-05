'use strict';
// Guards the step-file split of the five largest workflows (token diet, #1105):
// the orchestrator stays short, every step it lists exists and is referenced,
// and step paths are plain paths (an `@` would re-inline them eagerly).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { WORKFLOWS_DIR } = require('./helpers/workflow-text.cjs');

const SPLIT = ['plan', 'execute', 'new-project', 'autonomous', 'discuss-phase'];
const MAX_ORCHESTRATOR_LINES = 150; // the point of the split: a small eager load
const MAX_STEP_LINES = 300; // a step the model reads in one Read call

for (const name of SPLIT) {
  const orchestrator = fs.readFileSync(path.join(WORKFLOWS_DIR, `${name}.md`), 'utf8');
  const stepsDir = path.join(WORKFLOWS_DIR, name, 'steps');
  const files = fs.readdirSync(stepsDir).filter((f) => f.endsWith('.md')).sort();

  test(`${name}.md: orchestrator is at most ${MAX_ORCHESTRATOR_LINES} lines`, () => {
    assert.ok(orchestrator.split('\n').length <= MAX_ORCHESTRATOR_LINES);
  });

  test(`${name}: every step file is listed in the orchestrator table, without @`, () => {
    assert.ok(files.length > 0);
    for (const f of files) {
      const rel = `.rcode/workflows/${name}/steps/${f}`;
      assert.ok(orchestrator.includes(`\`${rel}\``), `${rel} is not referenced`);
      assert.ok(!orchestrator.includes(`@${rel}`), `${rel} must not be an @-include`);
    }
  });

  test(`${name}: every table row points at an existing step; steps are at most ${MAX_STEP_LINES} lines`, () => {
    const refs = [...orchestrator.matchAll(/`\.rcode\/workflows\/([^/]+)\/steps\/([^`]+)`/g)];
    assert.equal(refs.length, files.length);
    for (const [, wf, f] of refs) {
      assert.equal(wf, name);
      assert.ok(files.includes(f), `${f} listed but missing`);
    }
    for (const f of files) {
      const lines = fs.readFileSync(path.join(stepsDir, f), 'utf8').split('\n').length;
      assert.ok(lines <= MAX_STEP_LINES, `${f} has ${lines} lines`);
    }
  });
}
