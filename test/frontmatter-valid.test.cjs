/**
 * Frontmatter validity for the three Claude Code listing surfaces
 * (rcode/skills/**, rcode/commands/*, rcode/agents/*) — token diet T1 (#1102).
 *
 * Claude Code's frontmatter parser is stricter than the installer's. A skill
 * whose frontmatter it rejects falls back to the first body line in the listing
 * (15 skills did, via trigger strings wrapped across two lines; two more had
 * unquoted `: ` in the description). This test enforces the contract that the
 * listing text is always the real description:
 *   - `description` is a single-line double-quoted scalar that JSON-parses
 *   - no double-quoted list item is wrapped across lines
 *   - no leaked `<!-- Bridge status` comment in a skill body
 *
 * Run: node --test test/frontmatter-valid.test.cjs
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RCODE = path.resolve(__dirname, '..', 'rcode');

function walkSkills(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkSkills(p, out);
    else if (e.name === 'SKILL.md') out.push(p);
  }
  return out;
}

function listMd(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => path.join(dir, f));
}

const FILES = [
  ...walkSkills(path.join(RCODE, 'skills')),
  ...listMd(path.join(RCODE, 'commands')),
  ...listMd(path.join(RCODE, 'agents')),
];

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
}

test('every listing-surface file has frontmatter with a quoted single-line description', () => {
  assert.ok(FILES.length > 250, `expected >250 files, got ${FILES.length}`);
  const problems = [];
  for (const f of FILES) {
    const rel = path.relative(RCODE, f);
    const fm = frontmatter(fs.readFileSync(f, 'utf8'));
    if (fm === null) { problems.push(`${rel}: no frontmatter`); continue; }
    const m = fm.match(/^description:[ \t]*(.*)$/m);
    if (!m) { problems.push(`${rel}: no description`); continue; }
    try {
      const v = JSON.parse(m[1]);
      if (typeof v !== 'string' || !v.trim()) problems.push(`${rel}: empty description`);
    } catch {
      problems.push(`${rel}: description is not a single-line double-quoted scalar`);
    }
  }
  assert.deepStrictEqual(problems, []);
});

test('no double-quoted frontmatter list item is wrapped across lines', () => {
  const problems = [];
  for (const f of FILES) {
    const fm = frontmatter(fs.readFileSync(f, 'utf8'));
    if (fm === null) continue;
    fm.split('\n').forEach((line, i) => {
      if (/^\s*-\s*"(?:[^"\\]|\\.)*$/.test(line)) {
        problems.push(`${path.relative(RCODE, f)}:${i + 2}: ${line.trim().slice(0, 50)}`);
      }
    });
  }
  assert.deepStrictEqual(problems, []);
});

test('skill bodies carry no leaked Bridge status comment', () => {
  const leaked = walkSkills(path.join(RCODE, 'skills'))
    .filter((f) => fs.readFileSync(f, 'utf8').includes('<!-- Bridge status'))
    .map((f) => path.relative(RCODE, f));
  assert.deepStrictEqual(leaked, []);
});
