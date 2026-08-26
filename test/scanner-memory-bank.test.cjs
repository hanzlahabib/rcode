/**
 * Tests for scanMemoryBank() in server/lib/scanner.js (#968).
 *
 * The Memory Bank dashboard view used to render every file as a green
 * "populated · N bytes" regardless of age, with no drift signal and no
 * distillate freshness — for a product whose moat is the Memory Bank, the
 * dashboard had zero health signal. This locks:
 *   1. Per-file age banding (fresh <=30d, aging 30-90d, stale >90d).
 *   2. Drift surfaced via the same heuristics as `rcode-hooks drift`.
 *   3. Distillate staleness vs its source files' git commit history.
 *
 * Run: node --test test/scanner-memory-bank.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { scanMemoryBank } = require('../server/lib/scanner');

function git(cwd, args) {
  execSync(`git ${args}`, { cwd, stdio: 'ignore' });
}

function makeTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-scanner-memory-'));
  git(dir, 'init -q');
  git(dir, 'config user.email test@example.com');
  git(dir, 'config user.name Test');
  return dir;
}

function commitAt(dir, message, isoDate) {
  git(dir, 'add -A');
  execSync(`git commit -q -m "${message}"`, {
    cwd: dir,
    env: { ...process.env, GIT_AUTHOR_DATE: isoDate, GIT_COMMITTER_DATE: isoDate },
  });
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function touchDaysAgo(file, days) {
  const t = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  fs.utimesSync(file, t, t);
}

test('scanMemoryBank reports { exists: false } for a project with no memory dir', () => {
  const dir = makeTempRepo();
  try {
    const result = scanMemoryBank(path.join(dir, '.rcode'));
    assert.strictEqual(result.exists, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('section files are age-banded fresh / aging / stale by mtime', () => {
  const dir = makeTempRepo();
  try {
    const projDir = path.join(dir, '.rcode', 'memory', 'project');
    fs.mkdirSync(projDir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.rcode', 'memory', 'INDEX.md'), '# Memory Bank\n\n**Last updated:** ' + isoDaysAgo(1).slice(0, 10) + '\n');
    fs.writeFileSync(path.join(projDir, 'stack.md'), 'fresh content');
    fs.writeFileSync(path.join(projDir, 'decisions.md'), 'aging content');
    fs.writeFileSync(path.join(projDir, 'glossary.md'), 'stale content');
    touchDaysAgo(path.join(projDir, 'stack.md'), 1);
    touchDaysAgo(path.join(projDir, 'decisions.md'), 45);
    touchDaysAgo(path.join(projDir, 'glossary.md'), 120);
    commitAt(dir, 'chore: init memory', isoDaysAgo(1));

    const result = scanMemoryBank(path.join(dir, '.rcode'));
    const byName = Object.fromEntries(result.sections.project.map(f => [f.name, f]));
    assert.strictEqual(byName['stack.md'].ageBand, 'fresh');
    assert.strictEqual(byName['decisions.md'].ageBand, 'aging');
    assert.strictEqual(byName['glossary.md'].ageBand, 'stale');
    assert.ok(byName['glossary.md'].ageDays >= 90, `expected ageDays >= 90, got ${byName['glossary.md'].ageDays}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('drift is surfaced from the same heuristics as rcode-hooks drift', () => {
  const dir = makeTempRepo();
  try {
    const projDir = path.join(dir, '.rcode', 'memory', 'project');
    fs.mkdirSync(projDir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.rcode', 'memory', 'INDEX.md'), '# Memory Bank\n\n**Last updated:** ' + isoDaysAgo(1).slice(0, 10) + '\n');
    fs.writeFileSync(path.join(projDir, 'stack.md'), 'Zero runtime dependencies by design.');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: { ws: '^8.0.0' } }));
    commitAt(dir, 'chore: init', isoDaysAgo(1));

    const result = scanMemoryBank(path.join(dir, '.rcode'));
    assert.ok(Array.isArray(result.drift.drifts), 'expected result.drift.drifts to be an array');
    const contradiction = result.drift.drifts.find(d => d.kind === 'dep-contradiction');
    assert.ok(contradiction, 'expected a dep-contradiction drift surfaced from memory-drift.cjs');
    assert.match(contradiction.evidence, /ws/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('distillate is flagged stale when a source file was git-committed after generated-at', () => {
  const dir = makeTempRepo();
  try {
    const memDir = path.join(dir, '.rcode', 'memory');
    fs.mkdirSync(path.join(memDir, 'project'), { recursive: true });
    fs.mkdirSync(path.join(memDir, 'distillates'), { recursive: true });
    fs.writeFileSync(path.join(memDir, 'project', 'stack.md'), 'v1 stack notes');
    commitAt(dir, 'chore: initial stack.md', isoDaysAgo(20));

    fs.writeFileSync(
      path.join(memDir, 'distillates', 'project.distillate.md'),
      [
        '---',
        'generated: true',
        'source-digest: deadbeef',
        `generated-at: ${isoDaysAgo(15)}`,
        'source-files:',
        '  - project/stack.md',
        '---',
        '',
        '# Distillate',
      ].join('\n')
    );
    commitAt(dir, 'chore: add distillate', isoDaysAgo(15));

    // stack.md changes AFTER the distillate claims to have been generated.
    fs.writeFileSync(path.join(memDir, 'project', 'stack.md'), 'v2 stack notes — new dependency added');
    commitAt(dir, 'chore: update stack.md post-distill', isoDaysAgo(2));

    const result = scanMemoryBank(path.join(dir, '.rcode'));
    const distillate = result.distillates.find(d => d.name === 'project.distillate.md');
    assert.ok(distillate, 'expected project.distillate.md to be listed');
    assert.strictEqual(distillate.stale, true);
    assert.ok(distillate.staleSources.includes('project/stack.md'));
    assert.strictEqual(distillate.sourceDigest, 'deadbeef');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('distillate is NOT flagged stale when no source file changed since generated-at', () => {
  const dir = makeTempRepo();
  try {
    const memDir = path.join(dir, '.rcode', 'memory');
    fs.mkdirSync(path.join(memDir, 'project'), { recursive: true });
    fs.mkdirSync(path.join(memDir, 'distillates'), { recursive: true });
    fs.writeFileSync(path.join(memDir, 'project', 'stack.md'), 'stable stack notes');
    commitAt(dir, 'chore: initial stack.md', isoDaysAgo(20));

    fs.writeFileSync(
      path.join(memDir, 'distillates', 'project.distillate.md'),
      [
        '---',
        'generated: true',
        'source-digest: cafef00d',
        `generated-at: ${isoDaysAgo(1)}`,
        'source-files:',
        '  - project/stack.md',
        '---',
        '',
        '# Distillate',
      ].join('\n')
    );
    commitAt(dir, 'chore: add distillate', isoDaysAgo(1));

    const result = scanMemoryBank(path.join(dir, '.rcode'));
    const distillate = result.distillates.find(d => d.name === 'project.distillate.md');
    assert.ok(distillate, 'expected project.distillate.md to be listed');
    assert.strictEqual(distillate.stale, false);
    assert.deepStrictEqual(distillate.staleSources, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('scanMemoryBank never throws when memory-drift or git is unavailable', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-scanner-memory-nogit-'));
  try {
    // No `git init` at all — checkDrift's execSync calls must fail-open.
    const memDir = path.join(dir, '.rcode', 'memory', 'project');
    fs.mkdirSync(memDir, { recursive: true });
    fs.writeFileSync(path.join(memDir, 'stack.md'), 'notes');
    assert.doesNotThrow(() => scanMemoryBank(path.join(dir, '.rcode')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
