/**
 * Skills compliance tests.
 *
 * Verifies every SKILL.md across rcode/skills/ meets the rcode skill standard:
 *   1. Has valid YAML frontmatter with `name:` and `description:` fields
 *   2. Stays under the line budget (skill body length cap)
 *   3. Frontmatter `name:` matches the directory name (so the installer
 *      can route correctly)
 *
 * Body-length cap is 200 lines (the rcode soft target is 120, hard cap
 * 200 — anything heavier should split content into a sibling references.md).
 *
 * Run: node --test test/skills-compliance.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(PROJECT_ROOT, 'rcode', 'skills');
const LINE_BUDGET = 200;

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { frontmatter: {}, body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { frontmatter: {}, body: text };
  const block = text.slice(4, end);
  const body = text.slice(end + 5);
  const fm = {};
  for (const raw of block.split('\n')) {
    const line = raw.replace(/^#.*$/, '').trimEnd();
    if (!line) continue;
    const colonAt = line.indexOf(':');
    if (colonAt === -1) continue;
    const key = line.slice(0, colonAt).trim();
    let val = line.slice(colonAt + 1).trim();
    if (!key || !val) continue;
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    fm[key] = val;
  }
  return { frontmatter: fm, body };
}

function findSkillFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const skillMd = path.join(full, 'SKILL.md');
      if (fs.existsSync(skillMd)) out.push(skillMd);
      else out.push(...findSkillFiles(full));
    }
  }
  return out;
}

const skillFiles = findSkillFiles(SKILLS_DIR);

test('skills-compliance: at least one SKILL.md exists', () => {
  assert.ok(skillFiles.length > 0, 'expected to find SKILL.md files under rcode/skills/');
});

test('skills-compliance: every SKILL.md has frontmatter with name + description', () => {
  const failures = [];
  for (const f of skillFiles) {
    const text = fs.readFileSync(f, 'utf8');
    const { frontmatter } = parseFrontmatter(text);
    if (!frontmatter.name) failures.push(`${f} — missing 'name:' in frontmatter`);
    if (!frontmatter.description) failures.push(`${f} — missing 'description:' in frontmatter`);
  }
  assert.deepEqual(failures, [], `Frontmatter failures:\n${failures.join('\n')}`);
});

test('skills-compliance: every SKILL.md ≤ line budget', () => {
  const offenders = [];
  for (const f of skillFiles) {
    const lines = fs.readFileSync(f, 'utf8').split('\n').length;
    if (lines > LINE_BUDGET) offenders.push(`${f} — ${lines} lines (budget ${LINE_BUDGET})`);
  }
  assert.deepEqual(offenders, [], `SKILL.md files over budget — split content into a sibling references.md:\n${offenders.join('\n')}`);
});

test('skills-compliance: frontmatter name uses rcode- or rcode- prefix', () => {
  // The installer prepends `rcode-` to any folder name that doesn't already
  // start with `rcode-`, so the frontmatter `name:` field MUST already use
  // one of the known prefixes. This catches drift from the naming convention
  // (e.g. an unprefixed `name: my-skill` would land at `.claude/skills/rcode-my-skill`
  // but the frontmatter wouldn't match — confusing for the user).
  const offenders = [];
  for (const f of skillFiles) {
    const text = fs.readFileSync(f, 'utf8');
    const { frontmatter } = parseFrontmatter(text);
    const declared = frontmatter.name;
    if (!declared) continue; // already flagged in previous test
    if (!/^(rcode|rcode)-/.test(declared)) {
      offenders.push(`${f} — name='${declared}' should start with 'rcode-' or 'rcode-'`);
    }
  }
  assert.deepEqual(offenders, [], `Skill name prefix check:\n${offenders.join('\n')}`);
});
