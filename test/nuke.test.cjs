/**
 * Tests for cli/nuke.js — legacy rcode cleanup detection logic.
 *
 * nuke.js is highly destructive, so every test here uses dry-run mode
 * (no --yes flag) and isolates state with two complementary guards:
 *
 *   1. process.chdir(tmpDir) — puts nuke's CWD in an isolated /tmp tree so it
 *      can't accidentally scan real project files (.claude/, .rcode/, etc.).
 *
 *   2. process.env.HOME = tmpHome — redirects os.homedir() to a clean temp
 *      dir so getGlobalNodeModulesDirs() / buildPlan() never touch ~/.rcode/.
 *      This also sidesteps a known ReferenceError bug in buildPlan() (line 248):
 *      `plan.globalrcode = globalRcode` — `globalRcode` is undefined; the bug
 *      only fires when ~/.rcode/ actually exists on the machine.
 *
 * All /tmp dirs created here are removed in finally blocks — no residue.
 *
 * Run: node --test test/nuke.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const nuke = require(path.join(PROJECT_ROOT, 'cli/nuke.js'));

// ── helpers ────────────────────────────────────────────────────────────────

/** Capture console.log output from fn() without printing it. */
function captureOutput(fn) {
  const origLog = console.log;
  const origWarn = console.warn;
  const lines = [];
  console.log = (...args) => lines.push(args.join(' '));
  console.warn = (...args) => lines.push(args.join(' '));
  try { fn(); }
  finally {
    console.log = origLog;
    console.warn = origWarn;
  }
  return lines.join('\n');
}

/**
 * Run fn() with:
 *   - process.cwd() pointed at a fresh /tmp dir (optionally pre-populated by setup(tmpDir))
 *   - os.homedir() pointed at a separate clean /tmp dir (no ~/.rcode/ present)
 * Both dirs are cleaned up afterwards.
 */
function withIsolatedEnv(setup, fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuke-cwd-'));
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'nuke-home-'));
  const origCwd = process.cwd();
  const origHome = process.env.HOME;
  try {
    if (setup) setup(tmpDir);
    process.chdir(tmpDir);
    process.env.HOME = tmpHome;
    return fn(tmpDir, tmpHome);
  } finally {
    process.chdir(origCwd);
    process.env.HOME = origHome !== undefined ? origHome : '';
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
}

// ── tests ──────────────────────────────────────────────────────────────────

test('dry-run is the default: no --yes flag prints [DRY RUN] banner', () => {
  withIsolatedEnv(null, () => {
    const out = captureOutput(() => nuke([]));
    assert.ok(
      out.includes('DRY RUN'),
      `expected "DRY RUN" in output, got:\n${out.slice(0, 400)}`,
    );
  });
});

test('source-repo guard: @hanzlaa/rcode package.json triggers warning and early return', () => {
  // No fakeHome needed — the guard fires before buildPlan() is called.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nuke-src-guard-'));
  const origCwd = process.cwd();
  try {
    fs.writeFileSync(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: '@hanzlaa/rcode', version: '1.0.0' }),
    );
    process.chdir(tmp);
    const out = captureOutput(() => nuke([]));
    assert.ok(
      out.includes('rcode source repo') || out.includes('inside the rcode'),
      `expected source-repo warning for @hanzlaa/rcode, got:\n${out.slice(0, 400)}`,
    );
  } finally {
    process.chdir(origCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('source-repo guard: legacy @hanzlahabib/rihal-code package.json also triggers warning', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nuke-legacy-guard-'));
  const origCwd = process.cwd();
  try {
    fs.writeFileSync(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: '@hanzlahabib/rihal-code', version: '1.0.0' }),
    );
    process.chdir(tmp);
    const out = captureOutput(() => nuke([]));
    assert.ok(
      out.includes('rcode source repo') || out.includes('inside the rcode'),
      `expected source-repo warning for legacy package name, got:\n${out.slice(0, 400)}`,
    );
  } finally {
    process.chdir(origCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('project .claude/commands: rcode-*.md files appear in dry-run plan, unrelated files do not', () => {
  withIsolatedEnv((tmpDir) => {
    const cmdDir = path.join(tmpDir, '.claude', 'commands');
    fs.mkdirSync(cmdDir, { recursive: true });
    fs.writeFileSync(path.join(cmdDir, 'rcode-plan.md'), '# rcode plan');
    fs.writeFileSync(path.join(cmdDir, 'rcode-execute.md'), '# rcode execute');
    fs.writeFileSync(path.join(cmdDir, 'other-tool.md'), '# keep me');
  }, () => {
    const out = captureOutput(() => nuke([]));
    assert.ok(
      out.includes('rcode-plan.md'),
      `expected rcode-plan.md in nuke plan:\n${out.slice(0, 600)}`,
    );
    assert.ok(
      out.includes('rcode-execute.md'),
      `expected rcode-execute.md in nuke plan:\n${out.slice(0, 600)}`,
    );
    assert.ok(
      !out.includes('other-tool.md'),
      'other-tool.md should NOT appear in nuke plan — it is not an rcode artifact',
    );
  });
});

test('project .claude/agents: rcode-*.md agents appear in dry-run plan, others do not', () => {
  withIsolatedEnv((tmpDir) => {
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, 'rcode-executor.md'), '# executor');
    fs.writeFileSync(path.join(agentsDir, 'my-custom-agent.md'), '# keep me');
  }, () => {
    const out = captureOutput(() => nuke([]));
    assert.ok(
      out.includes('rcode-executor.md'),
      `expected rcode-executor.md in nuke plan:\n${out.slice(0, 600)}`,
    );
    assert.ok(
      !out.includes('my-custom-agent.md'),
      'my-custom-agent.md should NOT appear in nuke plan — user-defined agent',
    );
  });
});

test('project .claude/skills: rcode-* skill dirs appear in dry-run plan, others do not', () => {
  withIsolatedEnv((tmpDir) => {
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    fs.mkdirSync(path.join(skillsDir, 'rcode-plan'), { recursive: true });
    fs.mkdirSync(path.join(skillsDir, 'rihal-keep'), { recursive: true });
  }, () => {
    const out = captureOutput(() => nuke([]));
    assert.ok(
      out.includes('rcode-plan'),
      `expected rcode-plan skill dir in nuke plan:\n${out.slice(0, 600)}`,
    );
    assert.ok(
      !out.includes('rihal-keep'),
      'rihal-keep skill dir should NOT appear — only rcode-* prefix is targeted',
    );
  });
});

test('--include-planning: .planning/ actual path included iff flag is present', () => {
  // The dry-run hint always prints "rcode nuke --yes --include-planning" (which contains
  // ".planning") whenever total > 0. So we assert on the full /tmp path, not just the
  // substring ".planning", to distinguish the section entry from the hint text.
  withIsolatedEnv((tmpDir) => {
    const planningDir = path.join(tmpDir, '.planning');
    fs.mkdirSync(planningDir, { recursive: true });
    fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '# roadmap');
  }, (tmpDir) => {
    const planningPath = path.join(tmpDir, '.planning');
    const withFlag = captureOutput(() => nuke(['--include-planning']));
    const withoutFlag = captureOutput(() => nuke([]));
    assert.ok(
      withFlag.includes(planningPath),
      `expected "${planningPath}" in output with --include-planning:\n${withFlag.slice(0, 600)}`,
    );
    assert.ok(
      !withoutFlag.includes(planningPath),
      `"${planningPath}" must NOT appear in nuke plan without --include-planning flag`,
    );
  });
});
