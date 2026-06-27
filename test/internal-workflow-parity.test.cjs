/**
 * Internal-workflow parity (#939).
 *
 * A workflow with no same-named command is either:
 *   - an alias target (declared in rcode/command-aliases.yaml), or
 *   - internal-by-design (declared in rcode/internal-workflows.yaml).
 *
 * This test fails when a new command-less workflow appears undeclared (so a
 * genuinely-missing command can't hide), and when a declared internal workflow
 * no longer exists (stale entry).
 *
 * Run: node --test test/internal-workflow-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const COMMANDS_DIR = path.join(PROJECT_ROOT, 'rcode', 'commands');
const WORKFLOWS_DIR = path.join(PROJECT_ROOT, 'rcode', 'workflows');

function basenames(dir) {
  return new Set(
    fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => path.basename(f, '.md')),
  );
}

function listKey(file, key) {
  const text = fs.readFileSync(path.join(PROJECT_ROOT, 'rcode', file), 'utf8');
  const out = new Set();
  let inBlock = false;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trimEnd();
    if (new RegExp(`^${key}:\\s*$`).test(line)) { inBlock = true; continue; }
    if (!inBlock) continue;
    // alias block uses "name: target"; internal block uses "- name"
    const bullet = line.match(/^\s+-\s+([a-z0-9-]+)\s*$/);
    const pair = line.match(/^\s+([a-z0-9-]+):\s*([a-z0-9-]+)\s*$/);
    if (bullet) out.add(bullet[1]);
    else if (pair) out.add(pair[2]); // alias target
    else if (/^\S/.test(line)) break; // left the block
  }
  return out;
}

test('every command-less workflow is declared internal or an alias target', () => {
  const cmds = basenames(COMMANDS_DIR);
  const wfs = basenames(WORKFLOWS_DIR);
  const internal = listKey('internal-workflows.yaml', 'internal');
  const aliasTargets = listKey('command-aliases.yaml', 'aliases');

  const orphans = [...wfs].filter(w => !cmds.has(w));
  const undeclared = orphans.filter(w => !internal.has(w) && !aliasTargets.has(w)).sort();
  assert.deepEqual(
    undeclared, [],
    `Workflows with no command, not declared internal or as an alias target:\n  ${undeclared.join('\n  ')}\n` +
      `Add to rcode/internal-workflows.yaml (internal) or create a command for it.`,
  );
});

test('no stale entries in internal-workflows.yaml', () => {
  const wfs = basenames(WORKFLOWS_DIR);
  const internal = listKey('internal-workflows.yaml', 'internal');
  const stale = [...internal].filter(w => !wfs.has(w)).sort();
  assert.deepEqual(stale, [], `internal-workflows.yaml lists non-existent workflows:\n  ${stale.join('\n  ')}`);
});
