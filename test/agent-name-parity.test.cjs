/**
 * Agent registration names. Claude Code registers a subagent under its
 * frontmatter `name:`, not its file name, while profiles.yaml / team.yaml
 * select agents by file stem. A file whose stem and `name:` differ is spawnable
 * only under one spelling and installable only under the other, so pin them equal.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const AGENTS = path.join(REPO, 'rcode', 'agents');
const agentFiles = fs.readdirSync(AGENTS).filter((f) => f.endsWith('.md'));

test('every rcode/agents/*.md registers under its own file name', () => {
  const mismatched = [];
  for (const f of agentFiles) {
    const name = fs.readFileSync(path.join(AGENTS, f), 'utf8').match(/^name:\s*(\S+)/m)?.[1];
    if (name !== f.replace(/\.md$/, '')) mismatched.push(`${f} -> name: ${name}`);
  }
  assert.deepEqual(mismatched, []);
});

test('every agent id in profiles.yaml and team.yaml is a real agent file', () => {
  const stems = new Set(agentFiles.map((f) => f.replace(/\.md$/, '')));
  const missing = [];
  const profiles = fs.readFileSync(path.join(REPO, 'rcode', 'profiles.yaml'), 'utf8');
  for (const m of profiles.matchAll(/agents:\s*\[([^\]]*)\]/g)) {
    for (const id of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!stems.has(id)) missing.push(`profiles.yaml: ${id}`);
    }
  }
  const team = fs.readFileSync(path.join(REPO, 'rcode', 'team.yaml'), 'utf8');
  for (const m of team.matchAll(/file_path:\s*rcode\/agents\/(\S+?)\.md/g)) {
    if (!stems.has(m[1])) missing.push(`team.yaml: ${m[1]}`);
  }
  assert.deepEqual(missing, []);
});

test('every subagent_type spawned by shipped workflows/commands/skills is a registered agent', () => {
  const names = new Set(agentFiles.map((f) => f.replace(/\.md$/, '')));
  // Built-in Claude Code agent types, not shipped by rcode.
  for (const b of ['general-purpose', 'Explore', 'Plan', 'claude']) names.add(b);
  const unknown = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) {
        const t = fs.readFileSync(p, 'utf8');
        for (const m of t.matchAll(/subagent_type\s*=\s*"(rcode-[\w-]+)"/g)) {
          if (!names.has(m[1])) unknown.push(`${path.relative(REPO, p)}: ${m[1]}`);
        }
      }
    }
  };
  for (const d of ['workflows', 'commands', 'skills', 'references', 'agents']) walk(path.join(REPO, 'rcode', d));
  assert.deepEqual(unknown, []);
});

test('the tracked .cursor dogfood mirror carries exactly the agents in rcode/agents (doctor drift)', () => {
  // `rcode doctor` run in this repo compares .cursor/rules/rcode/agents with rcode/agents; a mirror
  // refreshed before an agent was added reports "missing: <agent>" although the installer is fine.
  const mirror = path.join(REPO, '.cursor', 'rules', 'rcode', 'agents');
  const have = fs.readdirSync(mirror).filter((f) => /^rcode-.*\.mdc$/.test(f)).map((f) => f.replace(/\.mdc$/, ''));
  const want = agentFiles.map((f) => f.replace(/\.md$/, ''));
  assert.deepStrictEqual(have.sort(), want.sort());
});
