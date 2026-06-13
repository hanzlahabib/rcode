/**
 * Agent registry consistency tests.
 *
 * Verifies the cross-references between rcode/team.yaml, rcode/agents/*.md,
 * and rcode/skills/agents/*.  Catches drift like "agent listed in team.yaml
 * but the agent file was deleted" or "skill_path points to a folder that
 * doesn't exist".
 *
 * Run: node --test test/agents-registry.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEAM_YAML = path.join(PROJECT_ROOT, 'rcode', 'team.yaml');
const AGENTS_DIR = path.join(PROJECT_ROOT, 'rcode', 'agents');

/**
 * Minimal team.yaml parser. The file is consistently structured (one entry per
 * agent, indented 2 spaces) so a small line-walker is enough — no YAML lib.
 */
/**
 * Parse team.yaml. The schema has two sections — `agents:` (canonical, with
 * file_path/skill_path) and `utility_agents:` (routing summary used by
 * council-panel.cjs). An id may appear in both; the test treats the
 * full entry as canonical when present.
 */
function parseTeamYaml(text) {
  const byId = new Map();
  let section = null;
  let current = null;
  function flush() {
    if (!current) return;
    const existing = byId.get(current.id);
    // Prefer the entry that carries file_path (the canonical one)
    if (!existing || (current.file_path && !existing.file_path)) {
      byId.set(current.id, { ...current, sections: [...(existing?.sections || []), section] });
    } else {
      existing.sections = [...(existing.sections || []), section];
    }
    current = null;
  }
  // CRLF tolerance (#889): split on \r?\n so Windows checkouts parse the same.
  for (const raw of text.split(/\r?\n/)) {
    // team.yaml has 4 top-level sections: agents, utility_agents, routing, tactical_agents.
    // routing has no agent entries; the other three may share ids by design.
    const sectionMatch = raw.match(/^([a-z_]+):\s*$/);
    if (sectionMatch) { flush(); section = sectionMatch[1]; continue; }
    const idMatch = raw.match(/^\s+- id:\s*(.+)$/);
    if (idMatch) {
      flush();
      current = { id: idMatch[1].trim() };
      continue;
    }
    if (!current) continue;
    const fpMatch = raw.match(/^\s+file_path:\s*(.+)$/);
    if (fpMatch) current.file_path = fpMatch[1].trim();
    const spMatch = raw.match(/^\s+skill_path:\s*(.+)$/);
    if (spMatch) current.skill_path = spMatch[1].trim();
  }
  flush();
  return Array.from(byId.values());
}

const teamYamlText = fs.readFileSync(TEAM_YAML, 'utf8');
const agents = parseTeamYaml(teamYamlText);

test('agents-registry: team.yaml parses to a non-empty roster', () => {
  assert.ok(agents.length > 0, 'expected agents in team.yaml');
});

test('agents-registry: when an id appears in both sections it carries one canonical file_path', () => {
  // Catches the case where the same id appears twice in the same section
  // (a true duplicate) — opposed to the by-design dual entry across
  // `agents:` and `utility_agents:`.
  const dupes = [];
  for (const a of agents) {
    const sections = a.sections || [];
    const counts = sections.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    for (const [section, count] of Object.entries(counts)) {
      if (count > 1) dupes.push(`${a.id} appears ${count}× in section '${section}'`);
    }
  }
  assert.deepEqual(dupes, [], `Within-section duplicate ids:\n${dupes.join('\n')}`);
});

test('agents-registry: every file_path resolves to an existing agent file', () => {
  // Some agents are registry-only (no .md file) — those should not have
  // a file_path. If file_path is declared, the file MUST exist.
  const missing = [];
  for (const a of agents) {
    if (!a.file_path) continue;
    const full = path.join(PROJECT_ROOT, a.file_path);
    if (!fs.existsSync(full)) missing.push(`${a.id} → ${a.file_path}`);
  }
  assert.deepEqual(missing, [], `team.yaml references missing agent files:\n${missing.join('\n')}`);
});

test('agents-registry: every skill_path resolves to a SKILL.md', () => {
  const missing = [];
  for (const a of agents) {
    if (!a.skill_path) continue;
    const full = path.join(PROJECT_ROOT, a.skill_path, 'SKILL.md');
    if (!fs.existsSync(full)) missing.push(`${a.id} → ${a.skill_path}/SKILL.md`);
  }
  assert.deepEqual(missing, [], `team.yaml references missing skill files:\n${missing.join('\n')}`);
});

test('agents-registry: every rcode/agents/*.md is registered in team.yaml', () => {
  // The reverse direction: catch agent files that were added but never
  // registered. Allow `rules/` subdirectory and any non-rcode-* file.
  const ids = new Set(agents.map((a) => a.id));
  const orphans = [];
  for (const entry of fs.readdirSync(AGENTS_DIR)) {
    if (!entry.endsWith('.md')) continue;
    if (!entry.startsWith('rcode-')) continue;
    const id = entry.replace(/\.md$/, '');
    if (!ids.has(id)) orphans.push(entry);
  }
  assert.deepEqual(orphans, [], `Agent files not registered in team.yaml:\n${orphans.join('\n')}`);
});
