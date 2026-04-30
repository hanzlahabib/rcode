/**
 * Installed skill name ↔ directory parity.
 *
 * Every `.claude/skills/<dir>/SKILL.md` must have its frontmatter
 * `name:` field equal to `<dir>`. The router uses the dir name; the
 * frontmatter is what humans read. Drift between them silently
 * mis-routes invocations.
 *
 * test/skills-compliance.test.cjs already enforces this for the
 * source tree (rihal/skills/). This test extends the same rule to
 * the install copy (.claude/skills/) — where the install pipeline
 * may rename dirs without updating frontmatter, or vice versa.
 *
 * Found 19 mismatches at 2026-04-30 (all agent-personality skills,
 * pattern: dir=rihal-X-role, frontmatter=rihal-agent-X). Snapshot-
 * ratchet pattern: fail if count goes up; encourage drop.
 *
 * Run: node --test test/skill-name-dir-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(PROJECT_ROOT, '.claude', 'skills');
const BASELINE_MISMATCHES = 0;

function findMismatches() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  const out = [];
  for (const d of fs.readdirSync(SKILLS_DIR)) {
    const skillFile = path.join(SKILLS_DIR, d, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    const text = fs.readFileSync(skillFile, 'utf8');
    const m = text.match(/^name:\s*"?([^"\n]+?)"?\s*$/m);
    if (!m) continue;
    const fmName = m[1].trim();
    if (fmName !== d) out.push({ dir: d, frontmatter: fmName });
  }
  return out;
}

test('installed skill name ↔ dir mismatch count does not regress', () => {
  const mismatches = findMismatches();
  if (mismatches.length > BASELINE_MISMATCHES) {
    const list = mismatches.map((m) => `  ${m.dir} → ${m.frontmatter}`).join('\n');
    assert.fail(
      `Skill name/dir drift regressed: ${mismatches.length} mismatches ` +
        `(baseline: ${BASELINE_MISMATCHES}).\n${list}\n\n` +
        `Either rename the directory, fix the frontmatter name field, or update the installer.`,
    );
  }
  if (mismatches.length < BASELINE_MISMATCHES) {
    // eslint-disable-next-line no-console
    console.log(
      `# skill-name-dir-parity: ${mismatches.length} mismatches ` +
        `(baseline ${BASELINE_MISMATCHES}). Drop BASELINE_MISMATCHES in this test.`,
    );
  }
});
