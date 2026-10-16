/**
 * `rcode doctor --tokens` (#1114): measures fixed per-turn context from disk.
 * Runs against an isolated temp HOME; nothing outside temp dirs is touched.
 *
 * Run: node --test test/doctor-tokens.test.cjs
 */

'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CLI = path.resolve(__dirname, '..', 'cli', 'index.js');
const { tokens, lineChars } = require('../cli/lib/token-estimate.cjs');

let tmp; let home; let project;

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function snapshot(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else out.push(`${f}:${fs.statSync(f).size}:${fs.readFileSync(f, 'utf8').length}`);
    }
  };
  walk(dir);
  return out.sort();
}

function run(args) {
  return spawnSync(process.execPath, [CLI, 'doctor', ...args], {
    cwd: project, encoding: 'utf8', env: { ...process.env, HOME: home },
  });
}

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-doctor-tokens-'));
  home = path.join(tmp, 'home');
  project = path.join(tmp, 'project');
  fs.mkdirSync(project, { recursive: true });
  const g = path.join(home, '.claude');
  write(path.join(g, 'skills', 'rcode-alpha', 'SKILL.md'), '---\nname: rcode-alpha\ndescription: Alpha skill description\n---\nbody\n');
  write(path.join(g, 'skills', 'rcode-hidden', 'SKILL.md'), '---\nname: rcode-hidden\ndescription: Hidden\ndisable-model-invocation: true\n---\n');
  write(path.join(g, 'skills', 'user-skill', 'SKILL.md'), '---\nname: user-skill\ndescription: Not rcode-owned\n---\n');
  write(path.join(g, 'commands', 'rcode-plan.md'), '---\ndescription: Plan a phase\n---\nbody\n');
  write(path.join(g, 'agents', 'rcode-executor.md'), '---\nname: rcode-executor\ndescription: Executes sprints\ntools: Read\n---\nbody\n');
  write(path.join(g, 'CLAUDE.md'), 'user text\n<!-- ===== rcode-managed rule block (npx @hanzlaa/rcode install) ===== -->\n\nrcode rules\n\n<!-- ===== end rcode-managed rule block ===== -->\n');
  write(path.join(home, '.rcode', '_config', 'manifest.yaml'), 'profile: full\n');
  write(path.join(project, '.claude', 'commands', 'rcode-status.md'), '---\ndescription: Show state\n---\n');
});

after(() => fs.rmSync(tmp, { recursive: true, force: true }));

test('--json reports per-scope counts and estimates from disk', () => {
  const r = run(['--tokens', '--json']);
  assert.strictEqual(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  const g = out.scopes.find((s) => s.scope === 'global');
  assert.strictEqual(g.profile, 'full');
  assert.strictEqual(g.skills.count, 1, 'hidden and non-rcode skills are not counted');
  assert.strictEqual(g.skills.tokens, tokens(lineChars({ name: 'rcode-alpha', description: 'Alpha skill description' })));
  assert.strictEqual(g.commands.count, 1);
  assert.strictEqual(g.agents.count, 1);
  assert.ok(g.claudeMd.tokens > 0);
  assert.strictEqual(g.total, g.skills.tokens + g.commands.tokens + g.agents.tokens + g.claudeMd.tokens);
  const p = out.scopes.find((s) => s.scope === 'project');
  assert.strictEqual(p.commands.count, 1);
  assert.strictEqual(p.profile, null);
  assert.strictEqual(out.overGate, false);
});

test('flags totals above the 5.0k gate with a slim hint', () => {
  const big = path.join(home, '.claude', 'commands', 'rcode-big.md');
  write(big, `---\ndescription: ${'x'.repeat(21000)}\n---\n`);
  try {
    const json = JSON.parse(run(['--tokens', '--json']).stdout);
    assert.strictEqual(json.overGate, true);
    const text = run(['--tokens']).stdout;
    assert.match(text, /Over the 5000 gate/);
    assert.match(text, /rcode install --global --profile minimal/);
  } finally {
    fs.rmSync(big);
  }
});

test('is read-only and does not run the compliance suite', () => {
  const before = snapshot(tmp);
  const r = run(['--tokens']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /Preflight/);
  assert.deepStrictEqual(snapshot(tmp), before);
});
