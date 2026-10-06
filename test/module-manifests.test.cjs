/**
 * rcode/modules/*.yaml entries must name things that exist, under the right key.
 * filterPlanByModules keeps plan entries by their installed path, so an entry
 * for a missing file (or a skill listed under `commands:`) silently matches
 * nothing and the module installs less than it advertises.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const { readModuleManifest, listAvailableModules } = require(path.join(REPO, 'cli', 'lib', 'install-plan.cjs'));
const SRC = path.join(REPO, 'rcode');

function skillNames() {
  const names = new Set();
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const p = path.join(d, e.name);
      if (fs.existsSync(path.join(p, 'SKILL.md'))) names.add(e.name.startsWith('rcode-') ? e.name : `rcode-${e.name}`);
      else walk(p);
    }
  })(path.join(SRC, 'skills'));
  return names;
}

test('every module entry names an existing agent, workflow, command, reference, skill or module', () => {
  const modules = listAvailableModules();
  const skills = skillNames();
  const missing = [];
  for (const name of modules) {
    const mod = readModuleManifest(name);
    const exists = (kind, dir, file) => {
      if (!fs.existsSync(path.join(SRC, dir, file))) missing.push(`${name}: ${kind} ${file}`);
    };
    mod.agents.forEach((a) => exists('agent', 'agents', a));
    mod.workflows.forEach((w) => exists('workflow', 'workflows', w));
    mod.commands.forEach((c) => exists('command', 'commands', c.endsWith('.md') ? c : `${c}.md`));
    mod.references.forEach((r) => exists('reference', 'references', r));
    mod.skills.forEach((s) => { if (!skills.has(s)) missing.push(`${name}: skill ${s}`); });
    mod.requires.forEach((r) => { if (!modules.includes(r)) missing.push(`${name}: requires ${r}`); });
  }
  assert.deepStrictEqual(missing, []);
});

test('commands: entries in modules carry the .md extension filterPlanByModules matches on', () => {
  const bad = [];
  for (const name of listAvailableModules()) {
    for (const c of readModuleManifest(name).commands) if (!c.endsWith('.md')) bad.push(`${name}: ${c}`);
  }
  assert.deepStrictEqual(bad, []);
});

test('seo and dev-practices list their skills under skills:, not commands:', () => {
  for (const name of ['seo', 'dev-practices']) {
    const mod = readModuleManifest(name);
    assert.deepStrictEqual(mod.commands, [], `${name} has no slash commands of its own`);
    assert.ok(mod.skills.length > 0, `${name} lists skills`);
  }
  const seo = readModuleManifest('seo').skills;
  for (const s of ['rcode-seo-audit', 'rcode-seo-content-factory', 'rcode-seo-aeo-geo']) assert.ok(seo.includes(s), s);
});

test('the seo module lists every skill shipped under rcode/skills/seo', () => {
  const dir = path.join(SRC, 'skills', 'seo');
  const shipped = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'SKILL.md')))
    .map((e) => (e.name.startsWith('rcode-') ? e.name : `rcode-${e.name}`));
  assert.deepStrictEqual(shipped.sort(), [...readModuleManifest('seo').skills].sort());
});
