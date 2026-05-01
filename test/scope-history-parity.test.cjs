/**
 * Commit-history scope ↔ AGENTS.md allowed scopes.
 *
 * Catches scope drift from the other direction: every named scope
 * actually used in the last N commits should be listed in AGENTS.md
 * (so an AI session reading AGENTS.md learns it's allowed) AND in
 * CONTRIBUTING.md (so a human contributor knows it's allowed).
 *
 * Numeric phase/sprint scopes (`docs(15)`, `feat(8.3)`) are excluded
 * — open-ended, listed under `<phase-id>` placeholder rule.
 *
 * Run: node --test test/scope-history-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function commitScopes(n = 100) {
  const out = execSync(`git log --oneline -${n} --format='%s'`, { cwd: PROJECT_ROOT, encoding: 'utf8' });
  const re = /^[a-z]+\(([a-z][a-z0-9-]*)\)/gm;
  const found = new Set();
  let m;
  while ((m = re.exec(out)) !== null) {
    // Skip numeric scopes and named phase/sprint scopes (e.g. phase-17, sprint-3)
    if (/^\d/.test(m[1])) continue;
    if (/^phase-\d+$|^sprint-\d+$/.test(m[1])) continue;
    found.add(m[1]);
  }
  return found;
}

function agentsAllowed() {
  const text = fs.readFileSync(path.join(PROJECT_ROOT, 'AGENTS.md'), 'utf8');
  const m = text.match(/Scopes allowed:\s*([^\n]+)/);
  if (!m) return new Set();
  const re = /`([a-z0-9-]+)`/g;
  const out = new Set();
  let mm;
  while ((mm = re.exec(m[1])) !== null) out.add(mm[1]);
  return out;
}

test('every commit scope from last 100 commits is in AGENTS.md allowed list', () => {
  const used = commitScopes(100);
  const allowed = agentsAllowed();
  const missing = [...used].filter((s) => !allowed.has(s)).sort();
  assert.deepEqual(
    missing,
    [],
    `Scopes used in commits but not in AGENTS.md "Scopes allowed:":\n  ${missing.join(', ')}\n` +
      `Either stop using the scope or add it to the AGENTS.md list.`,
  );
});
