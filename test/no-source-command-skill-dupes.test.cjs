/**
 * Source-codebase duplication test.
 *
 * Asserts that no source skill folder mirrors a slash command. Sidebar
 * stubs (rihal-do, rihal-status, etc.) are generated at INSTALL TIME by
 * cli/generate-command-skills.cjs. They must NEVER live in the
 * source tree — that would mean we maintain the same content twice.
 *
 * The script's curated SIDEBAR_COMMANDS list is the contract — any
 * command in that list must NOT have a matching rihal-<name> skill
 * folder under rihal/skills/.
 *
 * Run: node --test test/no-source-command-skill-dupes.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(PROJECT_ROOT, 'rihal', 'skills');
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
    const expectedStub = `rihal-${cmd}`;
    if (skillNames.has(expectedStub)) {
      dupes.push(`${expectedStub} (mirrors /rihal-${cmd})`);
    }
  }
  // Some commands legitimately have real skills (init, help, code-review,
  // debug have full skills). Those are exempted by the generator at install
  // time. Here, list explicit exemptions matching the generator's logic.
  const ALLOWED_OVERLAPS = new Set([
    'rihal-debug',         // real skill at actions/4-implementation/rihal-debug
    'rihal-code-review',   // real skill at actions/4-implementation/rihal-code-review
  ]);
  const filtered = dupes.filter((d) => {
    const name = d.split(' ')[0];
    return !ALLOWED_OVERLAPS.has(name);
  });
  assert.deepEqual(filtered, [], `Source skills duplicate sidebar commands. Either remove the source skill (sidebar stub will be generated at install) or add to ALLOWED_OVERLAPS:\n${filtered.join('\n')}`);
});
