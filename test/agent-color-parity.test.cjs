/**
 * Agent color palette parity.
 *
 * Claude Code's agent picker renders the `color:` frontmatter field.
 * Non-standard names (e.g. `gold`, `teal`, `indigo`, `#8B5CF6`) and
 * arbitrary hex codes have inconsistent rendering across IDEs and
 * versions. Locking to a known-safe palette removes that variability.
 *
 * Safe palette derived from Claude Code's documented color set:
 *   red, blue, green, yellow, cyan, magenta, purple, orange
 *   (white, gray, pink also accepted but not used today)
 *
 * Run: node --test test/agent-color-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(PROJECT_ROOT, 'rihal', 'agents');
const SAFE_COLORS = new Set([
  'red', 'blue', 'green', 'yellow',
  'cyan', 'magenta', 'purple', 'orange',
  'white', 'gray', 'grey', 'pink',
]);

function findOffenders() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  const offenders = [];
  for (const f of fs.readdirSync(AGENTS_DIR)) {
    if (!f.endsWith('.md')) continue;
    const text = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
    const m = text.match(/^color:\s*([^\n]+)/m);
    if (!m) continue;
    const color = m[1].trim().replace(/^["']|["']$/g, '').toLowerCase();
    if (!SAFE_COLORS.has(color)) offenders.push({ file: f, color });
  }
  return offenders;
}

test('every agent color is in the safe palette', () => {
  const offenders = findOffenders();
  assert.deepEqual(
    offenders.map((o) => `${o.file}: ${o.color}`).sort(),
    [],
    `Agents with non-safe colors:\n` +
      offenders.map((o) => `  ${o.file}: ${o.color}`).join('\n') +
      `\nValid: ${[...SAFE_COLORS].sort().join(', ')}`,
  );
});
