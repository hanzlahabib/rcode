/**
 * CLI subcommand parity test.
 *
 * Locks the wins from session 2026-04-30 (closes #479, #481): every
 * top-level subcommand called from rcode/workflows/ and rcode/skills/
 * MUST have a matching case in rcode/bin/rcode-tools.cjs's dispatch
 * switch. Phantom CLI calls are how we ended up with /rcode-execute-phase,
 * phase-plan-index, and 8 more — this test prevents the next round.
 *
 * Methodology mirrors the one-shot diff used during session triage:
 *   comm -23 <(called subcommands) <(implemented top-level cases)
 *
 * False-positive allowlist captures bash-narration words that look like
 * subcommand calls (e.g. "rcode-tools.cjs not found:") but aren't.
 *
 * Run: node --test test/cli-subcommand-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLI_PATH = path.join(PROJECT_ROOT, 'rcode', 'bin', 'rcode-tools.cjs');
const SCAN_DIRS = [
  path.join(PROJECT_ROOT, 'rcode', 'workflows'),
  path.join(PROJECT_ROOT, 'rcode', 'skills'),
];

// Words that appear after `rcode-tools.cjs ` in narration text but are not
// subcommand invocations. Confirmed by inspection in session 2026-04-30.
// `node` slips in when regex spans a newline boundary (next line of a fenced
// bash block starts with `node ".rcode/bin/...`); keeping it here belts-and-
// braces alongside the same-line regex below.
const PROSE_FALSE_POSITIVES = new Set(['exists', 'is', 'not', 'node']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && full.endsWith('.md')) out.push(full);
  }
  return out;
}

function extractCalledSubcommands() {
  // Same-line only ([^\S\n]+ = whitespace except newlines) so the next bash
  // command on a new line doesn't get attributed to this one.
  const re = /rcode-tools\.cjs"?[^\S\n]+([a-z][a-z-]+)/g;
  const found = new Set();
  for (const dir of SCAN_DIRS) {
    for (const f of walk(dir)) {
      const text = fs.readFileSync(f, 'utf8');
      let m;
      while ((m = re.exec(text)) !== null) {
        if (!PROSE_FALSE_POSITIVES.has(m[1])) found.add(m[1]);
      }
    }
  }
  return found;
}

function extractImplementedCases() {
  const text = fs.readFileSync(CLI_PATH, 'utf8');
  const re = /case '([a-z-]+)'/g;
  const found = new Set();
  let m;
  while ((m = re.exec(text)) !== null) found.add(m[1]);
  return found;
}

test('every CLI subcommand called from workflows/skills has a dispatch case', () => {
  const called = extractCalledSubcommands();
  const implemented = extractImplementedCases();
  const phantom = [...called].filter((c) => !implemented.has(c)).sort();
  assert.deepEqual(
    phantom,
    [],
    `Phantom CLI subcommands found in workflows/skills (no matching case in rcode-tools.cjs):\n` +
      `  ${phantom.join(', ')}\n` +
      `Either implement the handler in rcode/bin/rcode-tools.cjs or remove the call site.`,
  );
});

test('CLI dispatch coverage is non-trivial', () => {
  const implemented = extractImplementedCases();
  assert.ok(implemented.size > 20, `expected >20 dispatch cases, got ${implemented.size}`);
});
