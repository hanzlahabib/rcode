/**
 * Command dedup must never delete a git-TRACKED project file.
 *
 * Regression: when a global rcode install exists, install deleted every
 * `.claude/commands/rcode-*.md` in the project as a "duplicate" — including
 * files the repo had deliberately force-tracked for collaborators and CI. A
 * routine package update became a 218-deletion pull request, under a flag named
 * `--non-destructive`. A file a repo chose to commit is a decision, not a
 * redundant copy.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');

function scenario() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-dedup-'));
  const home = path.join(dir, '_home');
  // A global install must exist, or dedup never engages — and it must look like
  // a REAL one, because the health check counts what the user can actually
  // reach (project + global). A one-file fake global would fail that check for
  // reasons unrelated to what this test is about.
  const gCmds = path.join(home, '.claude', 'commands');
  const gSkills = path.join(home, '.claude', 'skills');
  fs.mkdirSync(gCmds, { recursive: true });
  fs.mkdirSync(gSkills, { recursive: true });
  for (let i = 0; i < 120; i++) fs.writeFileSync(path.join(gCmds, `rcode-cmd${i}.md`), 'x');
  for (let i = 0; i < 90; i++) {
    fs.mkdirSync(path.join(gSkills, `rcode-skill${i}`), { recursive: true });
    fs.writeFileSync(path.join(gSkills, `rcode-skill${i}`, 'SKILL.md'), '---\nname: x\n---\n');
  }

  const proj = path.join(dir, 'proj');
  fs.mkdirSync(path.join(proj, '.claude', 'commands'), { recursive: true });
  spawnSync('git', ['init', '-q'], { cwd: proj });

  const tracked = path.join(proj, '.claude', 'commands', 'rcode-ship.md');
  const untracked = path.join(proj, '.claude', 'commands', 'rcode-scratch.md');
  fs.writeFileSync(tracked, '---\nname: rcode-ship\n---\nbody\n');
  fs.writeFileSync(untracked, '---\nname: rcode-scratch\n---\nbody\n');
  spawnSync('git', ['add', '-f', tracked], { cwd: proj });
  spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'], { cwd: proj });

  const r = spawnSync('node', [path.join(REPO, 'cli', 'install.js'),
    '--target', proj, '--no-update-check', '--yes'],
    { encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home } });
  assert.strictEqual(r.status, 0, `install failed: ${r.stdout}${r.stderr}`);
  return { proj, tracked, untracked, out: r.stdout };
}

test('a git-tracked project command survives dedup', () => {
  const { tracked } = scenario();
  assert.ok(fs.existsSync(tracked),
    'a committed command is a deliberate decision and must not be deleted as a duplicate');
});

test('an untracked duplicate is still removed', () => {
  const { untracked } = scenario();
  assert.ok(!fs.existsSync(untracked),
    'dedup must still do its job for files nobody committed');
});

test('the install says what it kept and why', () => {
  const { out } = scenario();
  assert.match(out, /git-tracked/i, 'the user must be told tracked files were preserved');
});
