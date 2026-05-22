/**
 * Skills Memory Bank Hooks compliance test.
 *
 * Catches regressions of #447 — SKILL.md files missing the
 * `## Memory Bank Hooks` section. Every skill MUST declare what it
 * reads from and writes to the Memory Bank, even if it's "Writes:
 * nothing" (read-only skills declare that explicitly).
 *
 * Run: node --test test/skills-memory-hooks.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(PROJECT_ROOT, 'rcode', 'skills');

function findSkills(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const sub = path.join(dir, e.name);
    const skillMd = path.join(sub, 'SKILL.md');
    if (fs.existsSync(skillMd)) out.push(skillMd);
    else out.push(...findSkills(sub));
  }
  return out;
}

const skillFiles = findSkills(SKILLS_DIR);

test('skills-memory-hooks: all SKILL.md files present', () => {
  assert.ok(skillFiles.length > 0);
});

test('skills-memory-hooks: every core SKILL.md declares Memory Bank Hooks', () => {
  // Scope:
  //  - rcode/skills/core/ : enforced (#447 fix lives here)
  //  - rcode/skills/agents/ : exempt (per-invocation hooks in agent files)
  //  - rcode/skills/actions/ : tracked separately — many legacy action skills
  //    predate the 5-component standard; expanding enforcement is a separate
  //    audit cycle.
  const offenders = [];
  for (const f of skillFiles) {
    if (!f.includes(`${path.sep}skills${path.sep}core${path.sep}`)) continue;
    const text = fs.readFileSync(f, 'utf8');
    if (!/^##\s+Memory Bank Hooks/m.test(text)) {
      offenders.push(path.relative(PROJECT_ROOT, f));
    }
  }
  assert.deepEqual(offenders, [], `Core skills missing 'Memory Bank Hooks' section:\n${offenders.join('\n')}`);
});

test('skills-memory-hooks: section is non-empty (declares Reads or Writes)', () => {
  // Catches the "drive-by add ## Memory Bank Hooks with no body" anti-pattern.
  // Same scope as the previous test: core/ only.
  const empty = [];
  for (const f of skillFiles) {
    if (!f.includes(`${path.sep}skills${path.sep}core${path.sep}`)) continue;
    const text = fs.readFileSync(f, 'utf8');
    const m = text.match(/^##\s+Memory Bank Hooks\s*\n([\s\S]*?)(?=\n##\s|\n$)/m);
    if (!m) continue;
    const body = m[1].trim();
    const declaresReads = /Reads?:/i.test(body);
    const declaresWrites = /Writes?:/i.test(body);
    if (!declaresReads && !declaresWrites) {
      empty.push(path.relative(PROJECT_ROOT, f));
    }
  }
  assert.deepEqual(empty, [], `Memory Bank Hooks present but empty (no Reads / Writes):\n${empty.join('\n')}`);
});
