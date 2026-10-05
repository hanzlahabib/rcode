/**
 * Install profiles (minimal | full) — rcode/profiles.yaml, `--profile`,
 * persistence in manifest.yaml, update behavior and the forced switch down.
 * Real installs into tmpdirs with an isolated HOME (no global dedup).
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const CLI = path.join(REPO, 'cli', 'install.js');
const { loadProfiles } = require(path.join(REPO, 'cli', 'lib', 'install-profile.cjs'));

const CORE_LOOP = ['init', 'plan', 'execute', 'verify-phase', 'status', 'next', 'quick', 'do', 'review', 'ship', 'help', 'memory-init', 'memory-update', 'memory-audit', 'memory-distill'];

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-profile-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

function install(dir, args = []) {
  const home = path.join(dir, '_home');
  return spawnSync('node', [CLI, dir, '--yes', '--ide', 'claude', '--no-update-check', ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
}

const ls = (dir, sub) => fs.readdirSync(path.join(dir, sub)).sort();
const manifest = (dir) => fs.readFileSync(path.join(dir, '.rcode', '_config', 'manifest.yaml'), 'utf8');

test('profiles.yaml minimal set sizes match the design', () => {
  const { minimal, full } = loadProfiles();
  assert.strictEqual(minimal.commands.size, 40);
  assert.strictEqual(minimal.skills.size, 9);
  assert.strictEqual(minimal.agents.size, 19);
  assert.strictEqual(full.all, true);
});

test('every name in the minimal profile exists in the package', () => {
  const { minimal } = loadProfiles();
  for (const c of minimal.commands) assert.ok(fs.existsSync(path.join(REPO, 'rcode', 'commands', `${c}.md`)), `command ${c}`);
  for (const a of minimal.agents) assert.ok(fs.existsSync(path.join(REPO, 'rcode', 'agents', `${a}.md`)), `agent ${a}`);
  const skillDirs = new Set();
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      if (fs.existsSync(path.join(d, e.name, 'SKILL.md'))) skillDirs.add(e.name);
      else walk(path.join(d, e.name));
    }
  })(path.join(REPO, 'rcode', 'skills'));
  // rcode-do is the generated sidebar stub of the do command, not a source skill.
  for (const s of minimal.skills) assert.ok(s === 'rcode-do' || skillDirs.has(s), `skill ${s}`);
});

test('a new install defaults to minimal and persists the profile', () => {
  const dir = tmp();
  const r = install(dir);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(manifest(dir), /^profile: minimal$/m);
  const { minimal } = loadProfiles();
  assert.deepStrictEqual(
    ls(dir, '.claude/commands'),
    [...minimal.commands].map((c) => `rcode-${c}.md`).sort(),
  );
  assert.deepStrictEqual(ls(dir, '.claude/agents').filter((f) => f !== 'rules'), [...minimal.agents].map((a) => `${a}.md`).sort());
});

test('minimal ships the core loop and every @.rcode include its commands make resolves', () => {
  const dir = tmp();
  assert.strictEqual(install(dir).status, 0);
  for (const c of CORE_LOOP) assert.ok(fs.existsSync(path.join(dir, '.claude', 'commands', `rcode-${c}.md`)), `core command ${c}`);
  for (const f of ls(dir, '.claude/commands')) {
    const text = fs.readFileSync(path.join(dir, '.claude', 'commands', f), 'utf8');
    for (const m of text.matchAll(/@(\.rcode\/[\w./-]+\.md)/g)) {
      assert.ok(fs.existsSync(path.join(dir, m[1])), `${f} includes missing ${m[1]}`);
    }
  }
  // rcode-do (stub) and the other minimal skills are the only listed skills.
  assert.ok(ls(dir, '.claude/skills').includes('rcode-do'));
  const { minimal } = loadProfiles();
  for (const s of ls(dir, '.claude/skills')) assert.ok(minimal.skills.has(s), `unexpected listed skill ${s}`);
});

// Agents a minimal command's workflow may name in subagent_type without them
// being installed, because the spawn sits behind an opt-in flag and the full
// profile is the documented way to get them.
const FLAG_GATED_AGENTS = new Set([
  'rcode-edge-case-hunter', // /rcode-code-review --edge-cases
  'rcode-security-adversary', // /rcode-code-review --attack
]);

function workflowFiles(wf) {
  const base = path.join(REPO, 'rcode', 'workflows');
  const out = [path.join(base, `${wf}.md`)];
  const steps = path.join(base, wf, 'steps');
  if (fs.existsSync(steps)) {
    for (const f of fs.readdirSync(steps)) if (f.endsWith('.md')) out.push(path.join(steps, f));
  }
  return out.filter((f) => fs.existsSync(f));
}

test('every agent a minimal command spawns unconditionally is in the minimal profile', () => {
  const { minimal } = loadProfiles();
  // Agents register under their frontmatter `name`, which differs from the file
  // name for rcode-code-reviewer.md (name: rcode-reviewer).
  // rcode-code-fixer is also spawned by its file name (pre-existing mismatch with
  // `name: rcode-fixer`), so both spellings count as installed.
  const installedNames = new Set(
    [...minimal.agents].map((a) => fs.readFileSync(path.join(REPO, 'rcode', 'agents', `${a}.md`), 'utf8').match(/^name:\s*(\S+)/m)[1]),
  );
  for (const a of minimal.agents) installedNames.add(a);
  const missing = [];
  for (const cmd of minimal.commands) {
    const text = fs.readFileSync(path.join(REPO, 'rcode', 'commands', `${cmd}.md`), 'utf8');
    const seen = new Set();
    const queue = [];
    const add = (wf) => { if (!seen.has(wf)) { seen.add(wf); queue.push(wf); } };
    for (const m of text.matchAll(/workflows\/([\w-]+)(?:\.md|\/steps)/g)) add(m[1]);
    while (queue.length) {
      for (const file of workflowFiles(queue.pop())) {
        const body = fs.readFileSync(file, 'utf8');
        for (const m of body.matchAll(/subagent_type\s*[=:]?\s*["']?(rcode-[a-z-]+)/g)) {
          if (!installedNames.has(m[1]) && !FLAG_GATED_AGENTS.has(m[1])) missing.push(`${cmd} -> ${m[1]} (${path.basename(file)})`);
        }
        for (const m of body.matchAll(/workflows\/([a-z0-9-]+)\.md/g)) add(m[1]);
      }
    }
  }
  assert.deepStrictEqual(missing, [], 'minimal command workflows spawn agents the profile does not install');
});

test('--profile full installs everything the package ships', () => {
  const dir = tmp();
  assert.strictEqual(install(dir, ['--profile', 'full']).status, 0);
  assert.match(manifest(dir), /^profile: full$/m);
  const srcCommands = fs.readdirSync(path.join(REPO, 'rcode', 'commands')).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
  assert.strictEqual(ls(dir, '.claude/commands').length, srcCommands.length);
  const srcAgents = fs.readdirSync(path.join(REPO, 'rcode', 'agents')).filter((f) => f.endsWith('.md'));
  assert.strictEqual(ls(dir, '.claude/agents').filter((f) => f.endsWith('.md')).length, srcAgents.length);
  assert.ok(ls(dir, '.claude/skills').length > 80);
});

test('an unknown profile is rejected', () => {
  const r = install(tmp(), ['--profile', 'huge']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /Unknown profile "huge"/);
});

test('a manifest without a profile key is full: update and --force keep every file', () => {
  const dir = tmp();
  assert.strictEqual(install(dir, ['--profile', 'full']).status, 0);
  const before = ls(dir, '.claude/commands').length;
  // Simulate a pre-profile (<= 4.18) install.
  const mp = path.join(dir, '.rcode', '_config', 'manifest.yaml');
  fs.writeFileSync(mp, manifest(dir).replace(/^profile:.*\n/m, ''));
  const r = install(dir, ['--force']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Profile: full \(unchanged\)/);
  assert.strictEqual(ls(dir, '.claude/commands').length, before);
  assert.match(manifest(dir), /^profile: full$/m);
});

test('re-install and update keep a persisted minimal profile', () => {
  const dir = tmp();
  assert.strictEqual(install(dir).status, 0);
  const r = install(dir, ['--force']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Profile: minimal \(unchanged\)/);
  assert.match(manifest(dir), /^profile: minimal$/m);
  assert.strictEqual(ls(dir, '.claude/commands').length, loadProfiles().minimal.commands.size);
});

test('minimal -> full adds files and keeps user edits', () => {
  const dir = tmp();
  assert.strictEqual(install(dir).status, 0);
  const edited = path.join(dir, '.claude', 'commands', 'rcode-plan.md');
  fs.appendFileSync(edited, '\n<!-- user edit -->\n');
  const r = install(dir, ['--profile', 'full', '--non-destructive']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(manifest(dir), /^profile: full$/m);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'commands', 'rcode-council.md')));
  assert.match(fs.readFileSync(edited, 'utf8'), /user edit/);
});

test('full -> minimal is refused without --force and lists the removals', () => {
  const dir = tmp();
  assert.strictEqual(install(dir, ['--profile', 'full']).status, 0);
  const before = ls(dir, '.claude/commands').length;
  const r = install(dir, ['--profile', 'minimal']);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /--profile minimal would remove \d+ installed file/);
  assert.match(r.stderr, /\.claude\/agents\/rcode-ahmed\.md/);
  assert.match(r.stderr, /--force/);
  assert.strictEqual(ls(dir, '.claude/commands').length, before);
  assert.match(manifest(dir), /^profile: full$/m);
});

test('full -> minimal with --force backs up the removed files first', () => {
  const dir = tmp();
  assert.strictEqual(install(dir, ['--profile', 'full']).status, 0);
  const r = install(dir, ['--profile', 'minimal', '--force']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /profile switch backup/);
  const backups = fs.readdirSync(path.join(dir, '.rcode', 'backups'));
  assert.ok(backups.some((f) => f.endsWith('.tgz')));
  const tgz = path.join(dir, '.rcode', 'backups', backups.find((f) => f.endsWith('.tgz')));
  const listed = spawnSync('tar', ['-tzf', tgz], { encoding: 'utf8' }).stdout;
  assert.match(listed, /\.claude\/commands\/rcode-council\.md/, 'a removed file must be in the backup');
  assert.match(manifest(dir), /^profile: minimal$/m);
  assert.strictEqual(ls(dir, '.claude/commands').length, loadProfiles().minimal.commands.size);
  assert.ok(!fs.existsSync(path.join(dir, '.claude', 'commands', 'rcode-council.md')));
});

test('split-workflow step files ship in minimal, full and --module installs', () => {
  const stepRoots = fs.readdirSync(path.join(REPO, 'rcode', 'workflows'), { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(REPO, 'rcode', 'workflows', e.name, 'steps')))
    .map((e) => e.name);
  assert.ok(stepRoots.length >= 1, 'expected split workflows with a steps/ dir');
  const expectSteps = (dir, names) => {
    for (const name of names) {
      const src = fs.readdirSync(path.join(REPO, 'rcode', 'workflows', name, 'steps')).sort();
      assert.deepStrictEqual(ls(dir, `.rcode/workflows/${name}/steps`), src, `${name} steps`);
    }
  };
  for (const args of [[], ['--profile', 'full']]) {
    const dir = tmp();
    assert.strictEqual(install(dir, args).status, 0);
    expectSteps(dir, stepRoots);
  }
  const dir = tmp();
  // The post-install health check compares against whole-package counts, so a
  // --module install has always exited 1 there; only the files matter here.
  install(dir, ['--module', 'execution']);
  expectSteps(dir, stepRoots.filter((n) => ['plan', 'execute'].includes(n)));
});

test('the do router stays small and keeps its long branches in on-demand references', () => {
  const doMd = fs.readFileSync(path.join(REPO, 'rcode', 'workflows', 'do.md'), 'utf8');
  assert.ok(doMd.split('\n').length <= 150, 'do.md must stay a thin router');
  assert.ok(Buffer.byteLength(doMd) / 4 <= 4000, 'do.md should stay near 2.5k tokens');
  assert.ok(!/^@\.rcode/m.test(doMd), 'no eager @-includes in the router');
  for (const ref of ['do-persona.md', 'do-guards.md', 'do-routing-extras.md']) {
    assert.ok(fs.existsSync(path.join(REPO, 'rcode', 'references', ref)), ref);
    assert.ok(doMd.includes(`.rcode/references/${ref}`), `do.md must point at ${ref}`);
  }
});

test('the CLAUDE.md block no longer routes every task through /rcode-do', () => {
  const dir = tmp();
  assert.strictEqual(install(dir).status, 0);
  const md = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /Use the command that\s+matches the task directly/);
  assert.match(md, /\/rcode-do only if unsure/);
  assert.doesNotMatch(md, /non-trivial task/);
});
