/**
 * Superseded rcode hook commands must be REPLACED, not accumulated.
 *
 * Regression: the merge skipped an exact-string duplicate and otherwise
 * appended. A project installed before v4.12.1 kept its bare
 * `node .rcode/bin/rcode-hooks.cjs stop`, and a later install added the
 * worktree-safe `sh -c '...'` form beside it. Both then ran; inside a git
 * worktree the old one threw MODULE_NOT_FOUND on every event, forever, and
 * reinstalling never removed it. rcode's own circuit breaker could not help —
 * it lives inside rcode-hooks.cjs, which is exactly the file that fails to load.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const INSTALL = path.join(REPO, 'cli', 'install.js');

function project(settingsJson) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-hooks-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude', 'settings.json'), JSON.stringify(settingsJson, null, 2));
  return dir;
}

function install(dir) {
  return spawnSync('node', [INSTALL, '--target', dir, '--no-update-check', '--yes', '--enable-hooks'],
    { encoding: 'utf8', env: { ...process.env, HOME: path.join(dir, '_home'), USERPROFILE: path.join(dir, '_home') } });
}

function stopHooks(dir) {
  const s = JSON.parse(fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8'));
  return (s.hooks?.Stop || []).flatMap((m) => m.hooks || [])
    .filter((h) => typeof h.command === 'string' && h.command.includes('rcode-hooks.cjs'));
}

test('a pre-v4.12.1 bare hook command is replaced, not kept alongside the new one', () => {
  const OLD = 'node .rcode/bin/rcode-hooks.cjs stop';
  const dir = project({ hooks: { Stop: [{ matcher: '', hooks: [{ type: 'command', command: OLD }] }] } });
  const r = install(dir);
  assert.strictEqual(r.status, 0, `install failed: ${r.stdout}${r.stderr}`);

  const hooks = stopHooks(dir);
  assert.ok(!hooks.some((h) => h.command === OLD), 'the superseded bare command must be gone');
  assert.ok(hooks.some((h) => h.command.includes('git rev-parse --git-common-dir')),
    'the worktree-safe form must be present');
  // The subcommand sits far from the filename in the sh -c form, so match both
  // shapes — the same two-shape problem the installer itself has to solve.
  // `stop\b` also matches inside `stop-verify` (a hyphen is a word boundary),
  // so require the subcommand to actually end here.
  const isStop = (c) => /rcode-hooks\.cjs["']?\s+stop(?![-\w])/.test(c) || /\$H["']?\s+stop(?![-\w])/.test(c);
  const stops = hooks.filter((h) => isStop(h.command));
  assert.strictEqual(stops.length, 1, `exactly one stop hook, found ${stops.length}`);
});

test("a non-rcode hook in the same slot is left alone", () => {
  const THEIRS = "bash '/home/someone/.codex/other-agent-state.sh' session";
  const dir = project({ hooks: { Stop: [{ matcher: '', hooks: [{ type: 'command', command: THEIRS }] }] } });
  const r = install(dir);
  assert.strictEqual(r.status, 0, `install failed: ${r.stdout}${r.stderr}`);

  const s = JSON.parse(fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8'));
  const all = (s.hooks?.Stop || []).flatMap((m) => m.hooks || []).map((h) => h.command);
  assert.ok(all.includes(THEIRS), "another tool's hook must survive untouched");
});
