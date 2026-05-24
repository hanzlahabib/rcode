/**
 * team.yaml ↔ agent files parity test.
 *
 * team.yaml is the canonical agent registry — its entries must each
 * resolve to either a source file (rcode/agents/<id>.md), the file_path
 * field if specified, or an installed file (.claude/agents/<id>.md).
 *
 * Catches:
 *   - team.yaml entries with no real agent (#482-class drift)
 *   - file_path fields pointing at moved/renamed files
 *   - source files orphaned from the registry (lower-priority warning)
 *
 * Schema reference: rcode/team.yaml entries look like
 *   - id: rcode-X
 *     name: ...
 *     file_path: rcode/agents/rcode-Y.md   (optional alias)
 *
 * Run: node --test test/agent-team-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEAM_YAML = path.join(PROJECT_ROOT, 'rcode', 'team.yaml');
const SRC_AGENTS = path.join(PROJECT_ROOT, 'rcode', 'agents');
const INSTALLED_AGENTS = path.join(PROJECT_ROOT, '.claude', 'agents');
const RCODE_MIRROR = path.join(PROJECT_ROOT, '.rcode');

function parseTeamEntries(text) {
  // Minimal parser — read sequential `- id: X` blocks, capture id +
  // optional file_path until the next `- id:` or end-of-list.
  const entries = [];
  const lines = text.split('\n');
  let cur = null;
  for (const raw of lines) {
    const idMatch = raw.match(/^\s*-\s+id:\s*(.+?)\s*$/);
    if (idMatch) {
      if (cur) entries.push(cur);
      cur = { id: idMatch[1] };
      continue;
    }
    if (cur) {
      const fpMatch = raw.match(/^\s+file_path:\s*(.+?)\s*$/);
      if (fpMatch) cur.file_path = fpMatch[1];
    }
  }
  if (cur) entries.push(cur);
  return entries;
}

function entryResolves(entry) {
  // Try explicit file_path first
  if (entry.file_path) {
    const abs = path.isAbsolute(entry.file_path)
      ? entry.file_path
      : path.join(PROJECT_ROOT, entry.file_path);
    if (fs.existsSync(abs)) return true;
  }
  // Try source by id
  const srcByName = path.join(SRC_AGENTS, `${entry.id}.md`);
  if (fs.existsSync(srcByName)) return true;
  // Try installed by id
  const instByName = path.join(INSTALLED_AGENTS, `${entry.id}.md`);
  if (fs.existsSync(instByName)) return true;
  return false;
}

test('every team.yaml entry resolves to a source or installed agent file', () => {
  const text = fs.readFileSync(TEAM_YAML, 'utf8');
  const entries = parseTeamEntries(text);
  assert.ok(entries.length > 30, `expected >30 team entries, got ${entries.length}`);
  const phantom = entries
    .filter((e) => !entryResolves(e))
    .map((e) => `${e.id}${e.file_path ? ` (file_path: ${e.file_path})` : ''}`)
    .sort();
  assert.deepEqual(
    phantom,
    [],
    `team.yaml entries with no resolvable agent file:\n` +
      phantom.map((p) => `  - ${p}`).join('\n') +
      `\nEither create the agent file, fix file_path, or remove the entry.`,
  );
});

function walkMd(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(f, out);
    else if (e.isFile() && f.endsWith('.md')) out.push(f);
  }
  return out;
}

test('every workflow subagent_type= reference resolves to an agent file', () => {
  const re = /subagent_type\s*[:=]\s*['"](rcode-[a-z0-9-]+)['"]/g;
  const refs = new Set();
  // Scan source tree (rcode/workflows) and install-mirror (.rcode/workflows + .rcode/skills)
  const scanDirs = [
    path.join(PROJECT_ROOT, 'rcode', 'workflows'),
    path.join(RCODE_MIRROR, 'workflows'),
    path.join(RCODE_MIRROR, 'skills'),
  ];
  for (const dir of scanDirs) {
    for (const f of walkMd(dir)) {
      const t = fs.readFileSync(f, 'utf8');
      let m;
      while ((m = re.exec(t)) !== null) refs.add(m[1]);
    }
  }
  const installed = fs.existsSync(INSTALLED_AGENTS)
    ? new Set(fs.readdirSync(INSTALLED_AGENTS).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')))
    : new Set();
  const src = fs.existsSync(SRC_AGENTS)
    ? new Set(fs.readdirSync(SRC_AGENTS).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')))
    : new Set();
  const missing = [...refs].filter((r) => !installed.has(r) && !src.has(r)).sort();
  assert.deepEqual(
    missing,
    [],
    `workflow subagent_type refs with no agent file:\n` +
      missing.map((r) => `  - ${r}`).join('\n') +
      `\nEither rename the ref to a real agent or create the agent.`,
  );
});
