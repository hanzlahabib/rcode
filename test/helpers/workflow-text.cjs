'use strict';
// Workflows split into an orchestrator plus lazily-read step files keep their
// behavioural text in rcode/workflows/<name>/steps/*.md. Tests that assert on
// workflow instructions must see the orchestrator and every step together.
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOWS_DIR = path.resolve(__dirname, '..', '..', 'rcode', 'workflows');

/**
 * @param {string} file workflow file name, e.g. 'plan.md'
 * @returns {string} orchestrator text followed by every step file, in order
 */
function readWorkflowWithSteps(file) {
  const orchestrator = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');
  const stepsDir = path.join(WORKFLOWS_DIR, file.replace(/\.md$/, ''), 'steps');
  if (!fs.existsSync(stepsDir)) return orchestrator;
  const steps = fs
    .readdirSync(stepsDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => fs.readFileSync(path.join(stepsDir, f), 'utf8'));
  return [orchestrator, ...steps].join('\n');
}

module.exports = { readWorkflowWithSteps, WORKFLOWS_DIR };
