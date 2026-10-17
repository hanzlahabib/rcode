/**
 * Global install profile (#1114): a bare `--global` install (what the npm
 * postinstall runs) is minimal, `--profile full` is unchanged, and an existing
 * full global install can be slimmed without touching user-authored files.
 * Every run uses an isolated HOME inside a temp dir.
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

function makeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-global-'));
  return { home, claude: path.join(home, '.claude') };
}

function installGlobal(home, args = []) {
  return spawnSync('node', [CLI, '--global', '--yes', '--no-prompt', '--ide', 'claude', '--no-update-check', ...args], {
    encoding: 'utf8',
    cwd: home,
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
}

const ls = (dir) => fs.readdirSync(dir).sort();
const manifest = (claude) => fs.readFileSync(path.join(path.dirname(claude), '.rcode', '_config', 'manifest.yaml'), 'utf8');

test('a fresh bare --global install is minimal', () => {
  const { home, claude } = makeHome();
  const r = installGlobal(home);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(manifest(claude), /^profile: minimal$/m);
  const { minimal } = loadProfiles();
  assert.deepStrictEqual(ls(path.join(claude, 'commands')), [...minimal.commands].map((c) => `rcode-${c}.md`).sort());
  // Global installs skip a few project-scoped skills (e.g. rcode-init), so the
  // listed skills must be a subset of minimal, never beyond it.
  const skills = ls(path.join(claude, 'skills'));
  assert.ok(skills.length > 0);
  for (const s of skills) assert.ok(minimal.skills.has(s), `unexpected skill ${s}`);
});

test('--global --profile full installs more than minimal and persists full', () => {
  const { home, claude } = makeHome();
  const r = installGlobal(home, ['--profile', 'full']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(manifest(claude), /^profile: full$/m);
  const { minimal } = loadProfiles();
  assert.ok(ls(path.join(claude, 'commands')).length > minimal.commands.size);
});

test('--global --purpose seo is minimal plus the purpose, not full', () => {
  const { home, claude } = makeHome();
  const r = installGlobal(home, ['--purpose', 'seo']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(manifest(claude), /^profile: minimal$/m);
  assert.match(manifest(claude), /seo/);
});

test('slimming a full global install keeps the core loop and leaves user files alone', () => {
  const { home, claude } = makeHome();
  assert.strictEqual(installGlobal(home, ['--profile', 'full']).status, 0);

  const userCommand = path.join(claude, 'commands', 'my-own-command.md');
  const userSkill = path.join(claude, 'skills', 'my-own-skill', 'SKILL.md');
  const userAgent = path.join(claude, 'agents', 'my-own-agent.md');
  fs.mkdirSync(path.dirname(userSkill), { recursive: true });
  fs.writeFileSync(userCommand, 'mine\n');
  fs.writeFileSync(userSkill, 'mine\n');
  fs.writeFileSync(userAgent, 'mine\n');

  // Without --force nothing is deleted.
  const fullCommands = ls(path.join(claude, 'commands'));
  const refused = installGlobal(home, ['--profile', 'minimal']);
  assert.notStrictEqual(refused.status, 0);
  assert.deepStrictEqual(ls(path.join(claude, 'commands')), fullCommands);

  const r = installGlobal(home, ['--profile', 'minimal', '--force', '--no-backup']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(manifest(claude), /^profile: minimal$/m);

  const { minimal } = loadProfiles();
  const commands = ls(path.join(claude, 'commands')).filter((f) => f.startsWith('rcode-'));
  assert.deepStrictEqual(commands, [...minimal.commands].map((c) => `rcode-${c}.md`).sort());
  for (const c of CORE_LOOP) assert.ok(fs.existsSync(path.join(claude, 'commands', `rcode-${c}.md`)), `core command ${c}`);
  for (const s of ls(path.join(claude, 'skills')).filter((n) => n.startsWith('rcode-'))) assert.ok(minimal.skills.has(s), `unexpected skill ${s}`);
  assert.ok(fs.existsSync(path.join(claude, 'skills', 'rcode-do', 'SKILL.md')));

  for (const f of [userCommand, userSkill, userAgent]) {
    assert.strictEqual(fs.readFileSync(f, 'utf8'), 'mine\n', `${f} must survive`);
  }
});

test('slimming with backups enabled writes a tarball before removing files', () => {
  const { home } = makeHome();
  assert.strictEqual(installGlobal(home, ['--profile', 'full']).status, 0);
  const r = installGlobal(home, ['--profile', 'minimal', '--force']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /profile switch backup: .*\.tgz/);
});

test('slimming a pre-4.20 full global install (no files-manifest.csv) still prunes only rcode files', () => {
  const { home, claude } = makeHome();
  assert.strictEqual(installGlobal(home, ['--profile', 'full']).status, 0);
  fs.rmSync(path.join(home, '.rcode', '_config', 'files-manifest.csv'));
  const userSkill = path.join(claude, 'skills', 'my-own-skill', 'SKILL.md');
  const userCommand = path.join(claude, 'commands', 'my-own-command.md');
  fs.mkdirSync(path.dirname(userSkill), { recursive: true });
  fs.writeFileSync(userSkill, 'mine\n');
  fs.writeFileSync(userCommand, 'mine\n');

  const r = installGlobal(home, ['--profile', 'minimal', '--force', '--no-backup']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const { minimal } = loadProfiles();
  assert.deepStrictEqual(
    ls(path.join(claude, 'commands')).filter((f) => f.startsWith('rcode-')),
    [...minimal.commands].map((c) => `rcode-${c}.md`).sort(),
  );
  assert.strictEqual(fs.readFileSync(userSkill, 'utf8'), 'mine\n');
  assert.strictEqual(fs.readFileSync(userCommand, 'utf8'), 'mine\n');
});
