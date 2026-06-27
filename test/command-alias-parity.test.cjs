/**
 * Command → workflow alias parity (#933).
 *
 * Most commands @-include a workflow of the same name. The few that point to a
 * differently-named workflow must be declared in rcode/command-aliases.yaml so
 * audits don't mistake them for drift. This test keeps the manifest honest in
 * both directions:
 *   1. Every real mismatch is declared (no undeclared aliases).
 *   2. Every declared alias corresponds to a real mismatch (no stale entries).
 *
 * Run: node --test test/command-alias-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const COMMANDS_DIR = path.join(PROJECT_ROOT, 'rcode', 'commands');
const MANIFEST = path.join(PROJECT_ROOT, 'rcode', 'command-aliases.yaml');

// Map command basename → @-included workflow basename (first workflow ref).
function actualMismatches() {
  const out = {};
  for (const f of fs.readdirSync(COMMANDS_DIR)) {
    if (!f.endsWith('.md')) continue;
    const name = path.basename(f, '.md');
    const text = fs.readFileSync(path.join(COMMANDS_DIR, f), 'utf8');
    const m = text.match(/@\.rcode\/workflows\/([a-z0-9-]+)\.md/);
    if (!m) continue;
    const workflow = m[1];
    if (workflow !== name) out[name] = workflow;
  }
  return out;
}

// Parse the flat `aliases:` block from the manifest (command: workflow).
function declaredAliases() {
  const text = fs.readFileSync(MANIFEST, 'utf8');
  const out = {};
  let inBlock = false;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trimEnd();
    if (/^aliases:\s*$/.test(line)) { inBlock = true; continue; }
    if (!inBlock) continue;
    const m = line.match(/^\s+([a-z0-9-]+):\s*([a-z0-9-]+)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

test('every command→workflow name mismatch is declared in command-aliases.yaml', () => {
  const actual = actualMismatches();
  const declared = declaredAliases();
  const undeclared = Object.keys(actual).filter(k => declared[k] !== actual[k]);
  assert.deepEqual(
    undeclared, [],
    `Commands pointing to a differently-named workflow but not declared in ` +
      `rcode/command-aliases.yaml:\n  ${undeclared.map(k => `${k} → ${actual[k]}`).join('\n  ')}`,
  );
});

test('no stale entries in command-aliases.yaml', () => {
  const actual = actualMismatches();
  const declared = declaredAliases();
  const stale = Object.keys(declared).filter(k => actual[k] !== declared[k]);
  assert.deepEqual(
    stale, [],
    `Declared aliases that no longer match a real command→workflow mismatch:\n  ${stale.join('\n  ')}`,
  );
});
