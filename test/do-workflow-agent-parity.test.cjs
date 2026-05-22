/**
 * Parity test: do.md persona-alias table vs team.yaml agent registry.
 *
 * Every rcode-* agent ID referenced in the do.md alias table must exist in
 * team.yaml. Catches the "added agent to team.yaml but forgot do.md" drift
 * described in issue #552.
 *
 * Run: node --test test/do-workflow-agent-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DO_MD = path.join(ROOT, 'rcode', 'workflows', 'do.md');
const TEAM_YAML = path.join(ROOT, 'rcode', 'team.yaml');

function teamAgentIds(text) {
  const ids = new Set();
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*-\s+id:\s*(rcode-\S+)/);
    if (m) ids.add(m[1].trim());
  }
  return ids;
}

function doMdAgentRefs(text) {
  // Match table rows like: | ... | rcode-sadiq |
  const ids = new Set();
  const re = /\|\s*(rcode-[\w-]+)\s*\|/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    ids.add(m[1].trim());
  }
  return ids;
}

test('do.md and team.yaml both exist', () => {
  assert.ok(fs.existsSync(DO_MD), `Missing: ${DO_MD}`);
  assert.ok(fs.existsSync(TEAM_YAML), `Missing: ${TEAM_YAML}`);
});

test('every rcode-* agent in do.md persona table exists in team.yaml', () => {
  const doText = fs.readFileSync(DO_MD, 'utf8');
  const teamText = fs.readFileSync(TEAM_YAML, 'utf8');

  const doRefs = doMdAgentRefs(doText);
  const teamIds = teamAgentIds(teamText);

  const missing = [...doRefs].filter(id => !teamIds.has(id));
  assert.deepStrictEqual(
    missing,
    [],
    `do.md references agents not in team.yaml:\n  ${missing.join('\n  ')}\n` +
    `Add them to rcode/team.yaml or fix the do.md alias table.`
  );
});
