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
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PROJECT_SKILLS_DIR = path.join(PROJECT_ROOT, '.claude', 'skills');
const GLOBAL_SKILLS_DIR = path.join(os.homedir(), '.claude', 'skills');
const HARD_CAP_CHARS = 100;

// Snapshot: current count of skills exceeding HARD_CAP_CHARS, captured
// 2026-04-30 against 105 installed skills. Drop this number whenever
// you trim a description; never raise it.
const BASELINE_OFFENDERS = 0;

/**
 * Resolve which skills directory has the rcode-* set. After #679 dedup,
 * .claude/skills/ may be empty when globals shadow it. Mirror runtime
 * fallback.
 */
function resolveSkillsDir() {
  for (const dir of [PROJECT_SKILLS_DIR, GLOBAL_SKILLS_DIR]) {
    if (!fs.existsSync(dir)) continue;
    try {
      const has = fs.readdirSync(dir).some(d => d.startsWith('rcode-'));
      if (has) return dir;
    } catch { /* continue */ }
  }
  return null;
}

function countOffenders() {
  const dir = resolveSkillsDir();
  if (!dir) return { total: 0, offenders: [] };
  let total = 0;
  const offenders = [];
  for (const d of fs.readdirSync(dir)) {
    if (!d.startsWith('rcode-')) continue;
    const f = path.join(dir, d, 'SKILL.md');
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
  if (!resolveSkillsDir()) return; // neither project nor global has rcode skills — skip
  const { total } = countOffenders();
  // Post-rebrand (2026-05-25): install ships 49 rcode-* skills to .claude/skills/.
  // Threshold lowered from >50 to >40 to reflect the condensed catalog while still
  // catching real install drift (a missing-skill regression would drop count well below 40).
  assert.ok(total > 40, `expected >40 skills, got ${total} — install drift?`);
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
