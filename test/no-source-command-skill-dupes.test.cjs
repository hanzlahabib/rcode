/**
 * Source-codebase duplication test.
 *
 * Asserts that no source skill folder mirrors a slash command. Sidebar
 * stubs (rcode-do, rcode-status, etc.) are generated at INSTALL TIME by
 * cli/generate-command-skills.cjs. They must NEVER live in the
 * source tree — that would mean we maintain the same content twice.
 *
 * The script's curated SIDEBAR_COMMANDS list is the contract — any
 * command in that list must NOT have a matching rcode-<name> skill
 * folder under rcode/skills/.
 *
 * Run: node --test test/no-source-command-skill-dupes.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(PROJECT_ROOT, 'rcode', 'skills');
const { SIDEBAR_COMMANDS } = require(path.join(PROJECT_ROOT, 'cli', 'generate-command-skills.cjs'));

function findSkillFolderNames(dir, out = new Set()) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sub = path.join(dir, entry.name);
    if (fs.existsSync(path.join(sub, 'SKILL.md'))) {
      out.add(entry.name);
    } else {
      findSkillFolderNames(sub, out);
    }
  }
  return out;
}

const skillNames = findSkillFolderNames(SKILLS_DIR);

test('no-source-command-skill-dupes: SIDEBAR_COMMANDS curated list is non-empty', () => {
  assert.ok(SIDEBAR_COMMANDS.size > 0, 'SIDEBAR_COMMANDS should list at least one command');
});

test('no-source-command-skill-dupes: no source skill duplicates a sidebar command', () => {
  const dupes = [];
  for (const cmd of SIDEBAR_COMMANDS) {
    const expectedStub = `rcode-${cmd}`;
    if (skillNames.has(expectedStub)) {
      dupes.push(`${expectedStub} (mirrors /rcode-${cmd})`);
    }
  }
  // Some commands legitimately have real skills. Those are exempted by the
  // generator at install time (cli/generate-command-skills.cjs:174 — when
  // realSkills.has(skillName), the stub is skipped). The list below mirrors
  // that runtime behavior so the source-tree check stays in sync with what
  // actually ships.
  const ALLOWED_OVERLAPS = new Set([
    'rcode-debug',                       // actions/4-implementation/rcode-debug
    'rcode-review',                 // actions/4-implementation/rcode-review
    // Phase-flow commands that ship full skills + sidebar entries — both
    // forms are intentional. The skill is the in-IDE workflow; the command
    // is the slash-picker shortcut. Sidebar generator skips these at install.
    'rcode-sprint-planning',
    'rcode-sprint-status',
    'rcode-dev-story',
    'rcode-create-story',
    'rcode-create-epics-and-stories',
    'rcode-prfaq',
  ]);
  const filtered = dupes.filter((d) => {
    const name = d.split(' ')[0];
    return !ALLOWED_OVERLAPS.has(name);
  });
  assert.deepEqual(filtered, [], `Source skills duplicate sidebar commands. Either remove the source skill (sidebar stub will be generated at install) or add to ALLOWED_OVERLAPS:\n${filtered.join('\n')}`);
});
