/**
 * Slash hook-router tests.
 *
 * Covers:
 *   1. The router script (cli/rcode-slash-router.cjs) — stdin → injection JSON.
 *   2. Installer wiring — copies command bodies + router, merges the
 *      UserPromptSubmit / UserPrompt hook into codex/antigravity JSON while
 *      PRESERVING a pre-existing (herdr) entry, idempotently.
 *   3. Uninstall — removes only the rcode router entry, leaving herdr intact.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ROUTER = path.join(PROJECT_ROOT, 'cli', 'rcode-slash-router.cjs');

const installMod = require(path.join(PROJECT_ROOT, 'cli', 'install.js'));
const uninstallMod = require(path.join(PROJECT_ROOT, 'cli', 'uninstall.js'));

function mkTempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-slash-router-'));
}

function runRouter(stdinObj, home) {
  return spawnSync('node', [ROUTER], {
    input: JSON.stringify(stdinObj),
    encoding: 'utf8',
    env: { ...process.env, HOME: home },
  });
}

// ── 1. Router script ────────────────────────────────────────────────────────

test('router injects the matching command body + args', () => {
  const home = mkTempHome();
  const cmdDir = path.join(home, '.rcode', 'slash-commands');
  fs.mkdirSync(cmdDir, { recursive: true });
  fs.writeFileSync(
    path.join(cmdDir, 'add-phase.md'),
    '---\nname: rcode-add-phase\nallowed-tools: Read\n---\n\nExecute the add-phase workflow.\n',
  );

  const res = runRouter({ prompt: '/rcode-add-phase foo', hook_event_name: 'UserPromptSubmit' }, home);
  assert.strictEqual(res.status, 0);
  const out = JSON.parse(res.stdout);
  assert.strictEqual(out.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  const ctx = out.hookSpecificOutput.additionalContext;
  assert.match(ctx, /Execute the add-phase workflow\./);
  assert.match(ctx, /Arguments: foo/);
  // Frontmatter must be stripped.
  assert.doesNotMatch(ctx, /allowed-tools/);
});

test('router emits nothing for a non-rcode prompt', () => {
  const home = mkTempHome();
  const res = runRouter({ prompt: 'just a normal question' }, home);
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.stdout.trim(), '');
});

test('router notes an unknown rcode command', () => {
  const home = mkTempHome();
  fs.mkdirSync(path.join(home, '.rcode', 'slash-commands'), { recursive: true });
  const res = runRouter({ prompt: '/rcode-does-not-exist' }, home);
  assert.strictEqual(res.status, 0);
  const out = JSON.parse(res.stdout);
  assert.match(out.hookSpecificOutput.additionalContext, /Unknown rcode command/);
});

test('router preserves the hook event name from stdin', () => {
  const home = mkTempHome();
  const cmdDir = path.join(home, '.rcode', 'slash-commands');
  fs.mkdirSync(cmdDir, { recursive: true });
  fs.writeFileSync(path.join(cmdDir, 'status.md'), 'Show status.');
  const res = runRouter({ prompt: '/rcode-status', hook_event_name: 'UserPrompt' }, home);
  const out = JSON.parse(res.stdout);
  assert.strictEqual(out.hookSpecificOutput.hookEventName, 'UserPrompt');
});

// ── 2. Installer wiring ───────────────────────────────────────────────────────

test('codex install copies bodies + router and merges the hook, preserving herdr', () => {
  const home = mkTempHome();
  const prevHome = process.env.HOME;
  process.env.HOME = home;
  try {
    // Seed a pre-existing herdr UserPromptSubmit entry.
    const codexDir = path.join(home, '.codex');
    fs.mkdirSync(codexDir, { recursive: true });
    const hooksPath = path.join(codexDir, 'hooks.json');
    fs.writeFileSync(hooksPath, JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { hooks: [{ type: 'command', command: "bash '/x/herdr-agent-state.sh' working", timeout: 10 }] },
        ],
      },
    }, null, 2));

    installMod.installCodexSlashRouterHook({ global: 'silent' });

    // Command bodies + router copied.
    assert.ok(fs.existsSync(path.join(home, '.rcode', 'bin', 'rcode-slash-router.cjs')));
    assert.ok(fs.existsSync(path.join(home, '.rcode', 'slash-commands', 'add-phase.md')));

    // Hook merged; herdr preserved.
    const json = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    const entries = json.hooks.UserPromptSubmit;
    assert.strictEqual(entries.length, 2, 'herdr + rcode = 2 entries');
    const cmds = entries.flatMap(e => e.hooks.map(h => h.command));
    assert.ok(cmds.some(c => c.includes('herdr-agent-state.sh')), 'herdr preserved');
    assert.ok(cmds.some(c => c.includes('rcode-slash-router.cjs')), 'rcode added');

    // Idempotent: a second run does not duplicate.
    installMod.installCodexSlashRouterHook({ global: 'silent' });
    const json2 = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    assert.strictEqual(json2.hooks.UserPromptSubmit.length, 2, 'no duplicate on re-run');
  } finally {
    process.env.HOME = prevHome;
  }
});

test('antigravity install merges a UserPrompt hook, preserving existing hooks', () => {
  const home = mkTempHome();
  const prevHome = process.env.HOME;
  process.env.HOME = home;
  try {
    const agDir = path.join(home, '.gemini', 'antigravity');
    fs.mkdirSync(agDir, { recursive: true });
    const settingsPath = path.join(agDir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({
      hooks: {
        SessionStart: [{ hooks: [{ type: 'command', command: 'node /x/gsd-check.js' }] }],
      },
    }, null, 2));

    installMod.installAntigravitySlashRouterHook({ global: 'silent' });

    const json = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(Array.isArray(json.hooks.UserPrompt), 'UserPrompt event added');
    const cmds = json.hooks.UserPrompt.flatMap(e => e.hooks.map(h => h.command));
    assert.ok(cmds.some(c => c.includes('rcode-slash-router.cjs')), 'rcode router wired');
    // Pre-existing SessionStart untouched.
    assert.ok(json.hooks.SessionStart[0].hooks[0].command.includes('gsd-check.js'), 'existing hook preserved');

    // Idempotent.
    installMod.installAntigravitySlashRouterHook({ global: 'silent' });
    const json2 = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.strictEqual(json2.hooks.UserPrompt.length, 1, 'no duplicate UserPrompt entry');
  } finally {
    process.env.HOME = prevHome;
  }
});

test('installNativeHomeSlashCommands is a no-op without --global', () => {
  const home = mkTempHome();
  const prevHome = process.env.HOME;
  process.env.HOME = home;
  try {
    installMod.installNativeHomeSlashCommands({ ides: ['codex'] }); // no global flag
    assert.ok(!fs.existsSync(path.join(home, '.rcode', 'bin')), 'nothing written without --global');
  } finally {
    process.env.HOME = prevHome;
  }
});

// ── 3. Uninstall ──────────────────────────────────────────────────────────────

test('uninstall removes only the rcode router hook, leaving herdr intact', () => {
  const home = mkTempHome();
  const hooksPath = path.join(home, '.codex', 'hooks.json');
  fs.mkdirSync(path.dirname(hooksPath), { recursive: true });
  fs.writeFileSync(hooksPath, JSON.stringify({
    hooks: {
      UserPromptSubmit: [
        { hooks: [{ type: 'command', command: "bash '/x/herdr-agent-state.sh' working", timeout: 10 }] },
        { hooks: [{ type: 'command', command: 'node "/h/.rcode/bin/rcode-slash-router.cjs"', timeout: 10 }] },
      ],
    },
  }, null, 2));

  const result = uninstallMod.removeSlashRouterHook(hooksPath, 'UserPromptSubmit');
  assert.strictEqual(result, 'removed');
  const json = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
  assert.strictEqual(json.hooks.UserPromptSubmit.length, 1);
  assert.ok(json.hooks.UserPromptSubmit[0].hooks[0].command.includes('herdr-agent-state.sh'));

  // Idempotent: second call is a no-op.
  assert.strictEqual(uninstallMod.removeSlashRouterHook(hooksPath, 'UserPromptSubmit'), 'unchanged');
});

test('uninstall drops the event key entirely when only rcode was present', () => {
  const home = mkTempHome();
  const settingsPath = path.join(home, '.gemini', 'antigravity', 'settings.json');
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify({
    hooks: {
      SessionStart: [{ hooks: [{ type: 'command', command: 'node /x/gsd.js' }] }],
      UserPrompt: [{ hooks: [{ type: 'command', command: 'node "/h/.rcode/bin/rcode-slash-router.cjs"' }] }],
    },
  }, null, 2));

  assert.strictEqual(uninstallMod.removeSlashRouterHook(settingsPath, 'UserPrompt'), 'removed');
  const json = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.ok(!('UserPrompt' in json.hooks), 'empty event key removed');
  assert.ok('SessionStart' in json.hooks, 'unrelated hook preserved');
});
