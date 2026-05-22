/**
 * Source agent description budget — context-window guard.
 *
 * rcode/agents/*.md frontmatter `description:` is read by the agent
 * registry and shown in agent pickers. Long descriptions inflate
 * every spawn. Soft cap: 200 chars per source agent description.
 *
 * Snapshot baseline 2026-04-30: 11 of 41 source agents exceed 200
 * chars (top: rcode-ahmed.md at 319). Ratchet — fail on regression
 * past baseline.
 *
 * Different from test/skill-description-budget.test.cjs:
 *   - that test scans installed `.claude/skills/*` (cap 100 chars)
 *   - this test scans source `rcode/agents/*` (cap 200 chars — agent
 *     descriptions need more room than skill descriptions because
 *     they describe a persona, not a single action)
 *
 * Run: node --test test/agent-description-budget.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(PROJECT_ROOT, 'rcode', 'agents');
const HARD_CAP_CHARS = 200;
const BASELINE_OFFENDERS = 0;

function findOffenders() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  const offenders = [];
  for (const f of fs.readdirSync(AGENTS_DIR)) {
    if (!f.endsWith('.md')) continue;
    const text = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
    const m = text.match(/^description:\s*(.+)$/m);
    if (!m) continue;
    let desc = m[1].trim();
    if ((desc.startsWith('"') && desc.endsWith('"')) ||
        (desc.startsWith("'") && desc.endsWith("'"))) {
      desc = desc.slice(1, -1);
    }
    if (desc.length > HARD_CAP_CHARS) offenders.push({ file: f, length: desc.length });
  }
  return offenders;
}

test('source agent description over-budget count does not regress', () => {
  const offenders = findOffenders();
  if (offenders.length > BASELINE_OFFENDERS) {
    offenders.sort((a, b) => b.length - a.length);
    const top = offenders.slice(0, 10).map((o) => `  ${o.length}: ${o.file}`).join('\n');
    assert.fail(
      `Source agent description budget regressed: ${offenders.length} agents exceed ${HARD_CAP_CHARS} chars ` +
        `(baseline: ${BASELINE_OFFENDERS}).\n\nTop:\n${top}\n\n` +
        `Trim the description to ≤${HARD_CAP_CHARS} chars or move detail to the agent body.`,
    );
  }
  if (offenders.length < BASELINE_OFFENDERS) {
    // eslint-disable-next-line no-console
    console.log(
      `# agent-description-budget: ${offenders.length} offenders ` +
        `(baseline ${BASELINE_OFFENDERS}). Drop BASELINE_OFFENDERS in this test.`,
    );
  }
});
