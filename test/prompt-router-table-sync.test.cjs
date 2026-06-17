/**
 * Drift guard: assert every command in INTENT_TABLE exists as a route in
 * rcode/workflows/do.md's routing table.
 *
 * If someone renames or removes a row in do.md without updating INTENT_TABLE
 * (or vice-versa), this test fails — turning silent drift into a loud failure.
 *
 * Run: node --test test/prompt-router-table-sync.test.cjs
 *
 * Sprint 38.3.2 (#892)
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DO_MD = path.join(ROOT, 'rcode', 'workflows', 'do.md');
const HOOKS = path.join(ROOT, 'rcode', 'bin', 'rcode-hooks.cjs');

/**
 * Parse the routing table slice from do.md.
 *
 * Strategy: find the header line ("| If the text describes..."), then collect
 * rows until the first line that starts with "If no rule matches" (the
 * boundary the sprint spec calls out). Extract every backtick-quoted
 * `/rcode-*` token from the middle (Route) column and strip flags/args so
 * `/rcode-review --karpathy` → `/rcode-review`.
 *
 * Returns a Set<string> of base command names.
 */
function parseDoMdRoutes(doMdText) {
  const lines = doMdText.split('\n');

  // Find the header row — anchors the table start
  const headerIdx = lines.findIndex((l) => l.includes('| If the text describes'));
  if (headerIdx === -1) {
    throw new Error('do.md routing table header not found — parser needs updating');
  }

  // Collect table body lines until the "fall back" boundary or end of table
  const tableLines = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    // Stop at the explicit boundary called out in the sprint spec
    if (/^If no rule matches/i.test(line.trim())) break;
    // Only keep lines that look like table rows (start with |) — skip separator rows
    if (line.startsWith('|') && !/^\|[-| ]+\|/.test(line)) {
      tableLines.push(line);
    }
  }

  // Extract all backtick-quoted `/rcode-*` tokens from each row.
  // A row has the shape: | description | `/rcode-cmd [--flag]` | reason |
  // We extract every `/rcode-[a-z-]+` from backtick spans in any column.
  const routeSet = new Set();
  const tokenRe = /`(\/rcode-[a-z][a-z0-9-]*(?:\s+[^`]*)?)`/g;
  for (const row of tableLines) {
    let m;
    while ((m = tokenRe.exec(row)) !== null) {
      // Strip flags/args: `/rcode-review --karpathy` → `/rcode-review`
      const base = m[1].trim().split(/\s+/)[0];
      routeSet.add(base);
    }
  }

  return { routeSet, tableLineCount: tableLines.length };
}

test('do.md routing table parser finds a non-empty command set (sanity)', () => {
  const text = fs.readFileSync(DO_MD, 'utf8');
  const { routeSet, tableLineCount } = parseDoMdRoutes(text);

  assert.ok(
    tableLineCount >= 5,
    `Routing table slice has only ${tableLineCount} rows — parser may have broken`
  );
  assert.ok(
    routeSet.size >= 5,
    `Only ${routeSet.size} /rcode-* commands found in do.md routing table — parser may have broken`
  );
});

test('every INTENT_TABLE command exists as a route in do.md routing table', () => {
  const doMdText = fs.readFileSync(DO_MD, 'utf8');
  const { routeSet } = parseDoMdRoutes(doMdText);

  // Import INTENT_TABLE — guarded export added in 38.3.1 ensures no CLI side-effect
  const { INTENT_TABLE } = require(HOOKS);

  assert.ok(
    Array.isArray(INTENT_TABLE) && INTENT_TABLE.length > 0,
    'INTENT_TABLE must be a non-empty array'
  );

  const misses = [];
  for (const entry of INTENT_TABLE) {
    // Strip flags/args: `/rcode-review --karpathy` → `/rcode-review`
    const base = entry.command.trim().split(/\s+/)[0];
    if (!routeSet.has(base)) {
      misses.push(`  ${base}  (intent: ${entry.intent})`);
    }
  }

  assert.strictEqual(
    misses.length,
    0,
    [
      `${misses.length} INTENT_TABLE command(s) not found in rcode/workflows/do.md routing table:`,
      ...misses,
      '',
      'Either add the missing command to the do.md routing table (lines ~285-320)',
      'or remove/rename it in INTENT_TABLE in rcode/bin/rcode-hooks.cjs.',
    ].join('\n')
  );
});
