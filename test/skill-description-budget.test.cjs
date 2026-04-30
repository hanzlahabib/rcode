/**
 * Skill description budget — context-window guard.
 *
 * Long descriptions in `.claude/skills/*\/SKILL.md` frontmatter get
 * loaded into every Claude Code session, eating context budget before
 * the user types a word. Hard cap: 100 chars per description.
 *
 * Today 30 of 105 skills exceed the budget — top offender is 449 chars.
 * Rather than fail the build outright, this test snapshots current
 * count and ratchets down: any new violation bumps the count above the
 * baseline and fails CI. Trimming an offender drops the count and
 * passes a tighter snapshot. Either direction is visible.
 *
 * Cleanup tracked in #484-adjacent (see refactor consolidation issue).
 *
 * Run: node --test test/skill-description-budget.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(PROJECT_ROOT, '.claude', 'skills');
const HARD_CAP_CHARS = 100;

// Snapshot: current count of skills exceeding HARD_CAP_CHARS, captured
// 2026-04-30 against 105 installed skills. Drop this number whenever
// you trim a description; never raise it.
const BASELINE_OFFENDERS = 0;

function countOffenders() {
  if (!fs.existsSync(SKILLS_DIR)) return { total: 0, offenders: [] };
  let total = 0;
  const offenders = [];
  for (const d of fs.readdirSync(SKILLS_DIR)) {
    const f = path.join(SKILLS_DIR, d, 'SKILL.md');
    if (!fs.existsSync(f)) continue;
    total++;
    const text = fs.readFileSync(f, 'utf8');
    const m = text.match(/^description:\s*(.+)$/m);
    if (!m) continue;
    let desc = m[1].trim();
    // Strip surrounding quotes if present
    if ((desc.startsWith('"') && desc.endsWith('"')) ||
        (desc.startsWith("'") && desc.endsWith("'"))) {
      desc = desc.slice(1, -1);
    }
    if (desc.length > HARD_CAP_CHARS) offenders.push({ skill: d, length: desc.length });
  }
  return { total, offenders };
}

test('installed skill count is non-trivial (sanity)', () => {
  const { total } = countOffenders();
  assert.ok(total > 50, `expected >50 skills, got ${total} — install drift?`);
});

test('skill description over-budget count does not exceed baseline', () => {
  const { offenders } = countOffenders();
  if (offenders.length > BASELINE_OFFENDERS) {
    offenders.sort((a, b) => b.length - a.length);
    const top = offenders.slice(0, 10).map((o) => `  ${o.length}: ${o.skill}`).join('\n');
    assert.fail(
      `Skill description budget regressed: ${offenders.length} skills exceed ${HARD_CAP_CHARS} chars ` +
        `(baseline: ${BASELINE_OFFENDERS}).\n\nTop offenders:\n${top}\n\n` +
        `Trim the description to ≤${HARD_CAP_CHARS} chars or move detail to the SKILL body.`,
    );
  }
  // Encourage ratcheting down — print current count if it's below baseline
  if (offenders.length < BASELINE_OFFENDERS) {
    // eslint-disable-next-line no-console
    console.log(
      `# skill-description-budget: ${offenders.length} offenders ` +
        `(baseline ${BASELINE_OFFENDERS}). Drop BASELINE_OFFENDERS in this test.`,
    );
  }
});
