/**
 * Integration test for `rcode uninstall --purge` (Wave 3 W3.2).
 * Runs the real cli/uninstall.js in a tempdir and verifies:
 *
 *   - backup tarball survives the rmSync of .rihal/ (#683 fix)
 *   - state.json + .planning/PROJECT.md are restorable from the tarball
 *   - .rihal/, .planning/ are gone after purge
 *   - .gitignore rcode block is stripped while user lines are preserved
 *
 * Exercises every fix from Wave 1+2 in one E2E flow.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const INSTALL_JS = path.join(REPO_ROOT, 'cli', 'install.js');
const UNINSTALL_JS = path.join(REPO_ROOT, 'cli', 'uninstall.js');
const { makeTempDir, cleanup } = require('./helpers.cjs');

function gitInit(dir) {
  spawnSync('git', ['init', '-q'], { cwd: dir });
}

function runInstall(target) {
  return spawnSync('node', [INSTALL_JS, '--target', target, '--no-update-check', '--yes'], {
    encoding: 'utf8',
  });
}

function runUninstall(target, ...flags) {
  return spawnSync('node', [UNINSTALL_JS, target, ...flags], {
    encoding: 'utf8',
    cwd: target,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

test('--purge removes .rihal/ and .planning/, leaves backup tarball at .rihal-backups/', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  // Install + seed real-looking project data.
  runInstall(dir);
  fs.writeFileSync(
    path.join(dir, '.rihal', 'state.json'),
    JSON.stringify({ project: 'foo', decisions: [{ id: 'd-1', text: 'important' }] }, null, 2),
  );
  fs.writeFileSync(path.join(dir, '.planning', 'PROJECT.md'), '# foo\nimportant content\n');

  const result = runUninstall(dir, '--purge', '--yes');
  assert.strictEqual(result.status, 0, `purge failed: ${result.stderr}`);

  // .rihal/ and .planning/ are gone
  assert.strictEqual(fs.existsSync(path.join(dir, '.rihal')), false);
  assert.strictEqual(fs.existsSync(path.join(dir, '.planning')), false);

  // Backup at .rihal-backups/ (sibling, not under .rihal/)
  const backupsDir = path.join(dir, '.rihal-backups');
  assert.strictEqual(fs.existsSync(backupsDir), true, '.rihal-backups/ missing');
  const tarballs = fs.readdirSync(backupsDir).filter(f => f.endsWith('.tgz'));
  assert.strictEqual(tarballs.length, 1, `expected exactly one tarball, got ${tarballs.length}`);

  // Tarball contents include both state and planning
  const tarPath = path.join(backupsDir, tarballs[0]);
  const list = spawnSync('tar', ['-tzf', tarPath], { encoding: 'utf8' });
  assert.strictEqual(list.status, 0);
  assert.match(list.stdout, /^\.rihal\/state\.json$/m);
  assert.match(list.stdout, /^\.planning\/PROJECT\.md$/m);
});

test('--purge strips rcode block from .gitignore but preserves user lines containing "# rcode"', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  runInstall(dir);

  // Append user content with the historically-problematic prefix.
  fs.appendFileSync(
    path.join(dir, '.gitignore'),
    '\n# rcode is great — my own note\nmy-secret.txt\n# rcode-related thoughts\nkeep-me.txt\n',
  );

  runUninstall(dir, '--purge', '--yes');

  const after = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
  // rcode block is gone
  assert.doesNotMatch(after, /===== rcode-managed gitignore block/);
  // User lines preserved (this was issue #684)
  assert.match(after, /# rcode is great/);
  assert.match(after, /my-secret\.txt/);
  assert.match(after, /# rcode-related thoughts/);
  assert.match(after, /keep-me\.txt/);
});

test('--purge with .planning symlinked outside the project root refuses to traverse (#688)', (t) => {
  const dir = makeTempDir();
  const outside = makeTempDir();
  t.after(() => { cleanup(dir); cleanup(outside); });
  gitInit(dir);

  runInstall(dir);

  // Replace the .planning/ dir with a symlink to /tmp/outside/.
  fs.rmSync(path.join(dir, '.planning'), { recursive: true, force: true });
  fs.symlinkSync(outside, path.join(dir, '.planning'));
  fs.writeFileSync(path.join(outside, 'precious.txt'), 'do not delete');

  const result = runUninstall(dir, '--purge', '--yes');
  // Uninstall completes (refuses are non-fatal warnings).
  assert.strictEqual(result.status, 0);

  // The symlink is removed but the target's contents are intact.
  assert.strictEqual(fs.existsSync(path.join(dir, '.planning')), false);
  assert.strictEqual(fs.existsSync(path.join(outside, 'precious.txt')), true);
});
