/**
 * The rcode-do router must be reachable from natural language, and only the
 * router may claim conversational phrases.
 *
 * Regression: rcode shipped 117 commands, 91 with no skill at all, and the one
 * generated stub (`rcode-do`) triggered only on the literal word "rcode". Asked
 * to "raise PR" in a project with rcode installed, an agent matched nothing and
 * hand-rolled `gh pr create` — rcode's own pr-branch/ship workflows were
 * unreachable.
 *
 * Second regression in the same file: parseFrontmatter could not read YAML
 * folded scalars (`description: >-`), so every stub carried an empty
 * description and the model had no idea what the command did.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');

function install() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-router-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  const home = path.join(dir, '_home');
  const r = spawnSync('node', [path.join(REPO, 'cli', 'install.js'),
    '--target', dir, '--no-update-check', '--yes'],
    { encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home } });
  assert.strictEqual(r.status, 0, `install failed: ${r.stdout}${r.stderr}`);
  return dir;
}

function skillText(dir, name) {
  return fs.readFileSync(path.join(dir, '.claude', 'skills', name, 'SKILL.md'), 'utf8');
}

test('the router carries natural-language lifecycle intents', () => {
  const t = skillText(install(), 'rcode-do');
  for (const phrase of ['raise a PR', 'plan this phase', 'audit this project', 'update rcode']) {
    assert.ok(t.includes(`- "${phrase}"`), `router must trigger on "${phrase}"`);
  }
});

test('the router description survives the YAML folded block', () => {
  const t = skillText(install(), 'rcode-do');
  assert.ok(t.includes('[ROUTER]'), 'the real description must reach the stub, not just the placeholder');
  assert.ok(t.includes('never acts on its own'),
    'the description must say the router only asks — that is what bounds a false positive');
});

test('router intents are multi-word, never a bare common verb', () => {
  const t = skillText(install(), 'rcode-do');
  const triggers = [...t.matchAll(/^  - "([^"]+)"$/gm)].map((m) => m[1]);
  const bare = triggers.filter((x) => !x.includes(' ') && !x.includes('-') && !x.startsWith('/'));
  assert.deepStrictEqual(bare, [],
    `bare single-word triggers fire on ordinary conversation: ${bare.join(', ')}`);
});
