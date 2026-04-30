/**
 * AGENTS.md ↔ CONTRIBUTING.md scope list parity.
 *
 * Both docs claim authority on conventional-commit scopes. They must
 * agree on the non-phase scope names; otherwise an AI session reading
 * AGENTS.md and a human reading CONTRIBUTING.md write commits that
 * lint differently.
 *
 * AGENTS.md uses an inline `Scopes allowed:` line; CONTRIBUTING.md
 * uses a bulleted list under `### Allowed scopes`. Both extract to a
 * set of identifiers and the test asserts AGENTS ⊆ CONTRIBUTING.
 *
 * Numeric phase/sprint scopes (`docs(15)`, `feat(8.3)`) are excluded
 * — those are open-ended and listed in CONTRIBUTING.md only as
 * `<phase-id>` placeholder rules.
 *
 * Run: node --test test/scope-list-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function extractAgentsMdScopes() {
  const text = fs.readFileSync(path.join(PROJECT_ROOT, 'AGENTS.md'), 'utf8');
  const m = text.match(/Scopes allowed:\s*([^\n]+)/);
  if (!m) return new Set();
  // Extract backtick-quoted tokens
  const re = /`([a-z0-9-]+)`/g;
  const out = new Set();
  let mm;
  while ((mm = re.exec(m[1])) !== null) out.add(mm[1]);
  return out;
}

function extractContributingScopes() {
  const text = fs.readFileSync(path.join(PROJECT_ROOT, 'CONTRIBUTING.md'), 'utf8');
  const start = text.indexOf('### Allowed scopes');
  if (start === -1) return new Set();
  const end = text.indexOf('\n### ', start + 5);
  const block = end === -1 ? text.slice(start) : text.slice(start, end);
  // Each bullet starts with `- \`name\``; placeholder bullets use `<...>` and are skipped.
  const re = /^-\s+`([a-z0-9-]+)`/gm;
  const out = new Set();
  let mm;
  while ((mm = re.exec(block)) !== null) out.add(mm[1]);
  return out;
}

test('every AGENTS.md scope is also in CONTRIBUTING.md', () => {
  const a = extractAgentsMdScopes();
  const c = extractContributingScopes();
  assert.ok(a.size > 5, `AGENTS.md scope list parsed too small: ${a.size}`);
  assert.ok(c.size > 5, `CONTRIBUTING.md scope list parsed too small: ${c.size}`);
  const missing = [...a].filter((s) => !c.has(s)).sort();
  assert.deepEqual(
    missing,
    [],
    `Scopes in AGENTS.md but not in CONTRIBUTING.md:\n  ${missing.join(', ')}\n` +
      `Add them to CONTRIBUTING.md ### Allowed scopes block.`,
  );
});
