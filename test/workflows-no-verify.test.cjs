/**
 * Workflow --no-verify scan.
 *
 * Catches regressions of #446 — workflows or agents recommending
 * `git commit --no-verify`. AGENTS.md forbids it.
 *
 * The test allows the literal string when it appears in negative form
 * (e.g. "Do NOT use --no-verify") so AGENTS.md and the executor's
 * forbidden-pattern documentation can keep referencing it.
 *
 * Run: node --test test/workflows-no-verify.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = [
  path.join(PROJECT_ROOT, 'rcode', 'workflows'),
  path.join(PROJECT_ROOT, 'rcode', 'agents'),
  path.join(PROJECT_ROOT, 'rcode', 'skills'),
];

function walkMd(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMd(full));
    else if (e.isFile() && e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

// Patterns that constitute a forbidden recommendation
const FORBIDDEN_PATTERNS = [
  /\bUse\s+--no-verify\b/i,
  /\badd\s+--no-verify\s+flag/i,
  /\bgit\s+commit\s+--no-verify(?!.*(?:DO\s+NOT|forbid|never))/i,
];

// Negative-form indicators (don't flag these)
const NEGATIVE_CONTEXT = [
  /Do\s+NOT\s+use\s+--no-verify/i,
  /never\s+use\s+--no-verify/i,
  /forbid.*--no-verify/i,
  /AGENTS\.md\s+forbids?\s+--no-verify/i,
];

test('workflows-no-verify: no file recommends --no-verify', () => {
  const offenders = [];
  for (const dir of SCAN_DIRS) {
    for (const f of walkMd(dir)) {
      const text = fs.readFileSync(f, 'utf8');
      // Only consider lines that mention --no-verify
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes('--no-verify')) continue;
        // Allow it if the line is a negative-form prohibition
        const isNegative = NEGATIVE_CONTEXT.some((re) => re.test(line));
        if (isNegative) continue;
        // Otherwise check for forbidden recommendation patterns
        const isRecommend = FORBIDDEN_PATTERNS.some((re) => re.test(line));
        if (isRecommend) {
          offenders.push(`${path.relative(PROJECT_ROOT, f)}:${i + 1}: ${line.trim().slice(0, 100)}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], `Files recommending --no-verify (forbidden by AGENTS.md):\n${offenders.join('\n')}`);
});
