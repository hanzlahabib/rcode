/**
 * Tests for cli/agent.js — `rcode agent <name>` passthrough to claude --agent.
 *
 * Coverage closes #725:
 *   1. --list and zero-args enumerate agents from rcode/agents/*.md
 *   2. invalid agent name exits 1 with a usable error message
 *   3. claude-not-found exits 1 with the install URL
 *   4. parity: --list output matches the actual rcode/agents/ directory
 *
 * We exercise the module directly (not via spawn) so we can capture
 * stdout/stderr without forking. The claude-not-found path is tested by
 * stubbing $PATH to a directory that doesn't contain `claude`.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const AGENT_DIR = path.join(PROJECT_ROOT, 'rcode/agents');
const agentCli = require(path.join(PROJECT_ROOT, 'cli/agent.js'));

function expectedNames() {
  return fs.readdirSync(AGENT_DIR)
    .filter(f => f.startsWith('rcode-') && f.endsWith('.md'))
    .map(f => f.replace(/^rcode-/, '').replace(/\.md$/, ''))
    .sort();
}

function captureOutput(fn) {
  const origLog = console.log;
  const origErr = console.error;
  const origExit = process.exit;
  const logs = [];
  const errs = [];
  let exitCode = null;
  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errs.push(args.join(' '));
  process.exit = (code) => { exitCode = code; throw new Error(`__exit_${code}__`); };
  try { fn(); } catch (e) { if (!/^__exit_/.test(e.message)) throw e; }
  finally {
    console.log = origLog;
    console.error = origErr;
    process.exit = origExit;
  }
  return { stdout: logs.join('\n'), stderr: errs.join('\n'), exitCode };
}

test('agent --list: enumerates every rcode-*.md in rcode/agents/', () => {
  const { stdout, exitCode } = captureOutput(() =>
    agentCli(['--list'], { packageRoot: PROJECT_ROOT }));
  assert.equal(exitCode, null, 'should not call process.exit on --list');
  const names = expectedNames();
  for (const n of names) {
    assert.ok(stdout.includes(`rcode agent ${n}`),
      `--list output missing agent: ${n}`);
  }
  assert.ok(stdout.includes(`Available agents (${names.length})`),
    `--list output should report total count ${names.length}`);
});

test('agent (no args): prints usage and the same agent list', () => {
  const { stdout, exitCode } = captureOutput(() =>
    agentCli([], { packageRoot: PROJECT_ROOT }));
  assert.equal(exitCode, null);
  assert.ok(stdout.startsWith('Usage:'), 'zero-args should lead with usage line');
  const names = expectedNames();
  assert.ok(stdout.includes(`Available agents (${names.length})`),
    'zero-args should fall through to the same enumeration as --list');
});

test('agent <invalid>: exits 1 with "No agent named" + available list', () => {
  const { stderr, exitCode } = captureOutput(() =>
    agentCli(['definitely-not-a-real-agent-xyz'], { packageRoot: PROJECT_ROOT }));
  assert.equal(exitCode, 1, 'invalid agent must exit 1');
  assert.ok(/No agent named 'rcode-definitely-not-a-real-agent-xyz'/.test(stderr),
    'error message must name the resolved agent ID');
  assert.ok(/Available:/.test(stderr),
    'error message must list available agents to help recovery');
});

test('agent <valid>: claude-not-found path exits 1 with install URL', () => {
  // Stub PATH to a directory that exists but contains no `claude` binary.
  // Validates the cross-platform which/where guard added for #724.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-no-claude-'));
  const origPath = process.env.PATH;
  try {
    process.env.PATH = tmp;
    // Pick the first real agent so the existence check passes and we
    // actually hit the claude-binary guard.
    const firstAgent = expectedNames()[0];
    const { stderr, exitCode } = captureOutput(() =>
      agentCli([firstAgent], { packageRoot: PROJECT_ROOT }));
    assert.equal(exitCode, 1, 'missing claude binary must exit 1');
    assert.ok(/claude binary not found/.test(stderr),
      'error must mention claude binary not found');
    assert.ok(/claude\.ai\/code/.test(stderr),
      'error must include the install URL so the user has a recovery path');
  } finally {
    process.env.PATH = origPath;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('agent --list parity: every emitted name resolves to a real .md file', () => {
  const { stdout } = captureOutput(() =>
    agentCli(['--list'], { packageRoot: PROJECT_ROOT }));
  const emittedNames = stdout
    .split('\n')
    .map(line => line.match(/^\s*rcode agent (\S+)$/))
    .filter(Boolean)
    .map(m => m[1]);
  assert.ok(emittedNames.length > 0, '--list must emit at least one agent');
  for (const n of emittedNames) {
    const file = path.join(AGENT_DIR, `rcode-${n}.md`);
    assert.ok(fs.existsSync(file),
      `--list emitted "rcode agent ${n}" but ${file} does not exist`);
  }
});
