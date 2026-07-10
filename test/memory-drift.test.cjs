/**
 * Tests for rcode/bin/lib/memory-drift.cjs (#958).
 *
 * memory-drift is a pure-heuristic checker: it compares claims in
 * .rcode/memory/project/{stack.md,decisions.md} against the last 10 commits
 * and the current working tree. No LLM calls — git + fs only.
 *
 * Run: node --test test/memory-drift.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { checkDrift, extractPaths, extractPackageNames } = require('../rcode/bin/lib/memory-drift.cjs');

function git(cwd, args) {
  execSync(`git ${args}`, { cwd, stdio: 'ignore' });
}

function makeTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-memory-drift-'));
  git(dir, 'init -q');
  git(dir, 'config user.email test@example.com');
  git(dir, 'config user.name Test');
  return dir;
}

function writeMemory(dir, { stack = '', decisions = '', indexLastUpdated } = {}) {
  const memDir = path.join(dir, '.rcode', 'memory', 'project');
  fs.mkdirSync(memDir, { recursive: true });
  fs.writeFileSync(path.join(memDir, 'stack.md'), stack);
  fs.writeFileSync(path.join(memDir, 'decisions.md'), decisions);
  if (indexLastUpdated) {
    fs.writeFileSync(
      path.join(dir, '.rcode', 'memory', 'INDEX.md'),
      `# Memory Bank\n\n**Last updated:** ${indexLastUpdated}\n`
    );
  }
}

function commit(dir, message) {
  git(dir, 'add -A');
  git(dir, `commit -q -m "${message}"`);
}

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

test('extractPaths pulls path-like backtick tokens, skips packages/urls/flags/globs', () => {
  const text =
    'See `server/lib/api.js:131-141` and `.rcode/memory/` and `https://example.com/x` ' +
    'and `@clack/prompts` and `--force` and `server/lib/html/{shell,css}.js` and `dist/rcode.js`.';
  const paths = extractPaths(text);
  assert.deepStrictEqual(paths.sort(), ['.rcode/memory/', 'server/lib/api.js']);
});

test('extractPackageNames pulls bare package identifiers from backticks', () => {
  const text = 'CLI helpers: `picocolors`, `nanospinner`, `@clack/prompts`, `fast-glob`.';
  const names = extractPackageNames(text);
  assert.deepStrictEqual(
    names.sort(),
    ['@clack/prompts', 'fast-glob', 'nanospinner', 'picocolors']
  );
});

test('checkDrift returns no drifts for a clean, consistent memory bank', () => {
  const dir = makeTempRepo();
  try {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', dependencies: {} }));
    fs.writeFileSync(path.join(dir, 'README.md'), '# x');
    writeMemory(dir, {
      stack: 'Uses `README.md`. Zero runtime dependencies by design.',
      indexLastUpdated: isoDaysAgo(1),
    });
    commit(dir, 'chore: init');

    const { drifts } = checkDrift(dir);
    assert.deepStrictEqual(drifts, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkDrift flags dep-removed when a stack.md-named package.json dep disappears', () => {
  const dir = makeTempRepo();
  try {
    writeMemory(dir, {
      stack: 'CLI helpers: `picocolors`, `nanospinner`.',
      indexLastUpdated: isoDaysAgo(1),
    });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'x', devDependencies: { picocolors: '^1.0.0', nanospinner: '^1.0.0' } })
    );
    commit(dir, 'chore: init with deps');

    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'x', devDependencies: { nanospinner: '^1.0.0' } })
    );
    commit(dir, 'chore: drop picocolors');

    const { drifts } = checkDrift(dir);
    const removed = drifts.filter((d) => d.kind === 'dep-removed');
    assert.strictEqual(removed.length, 1);
    assert.match(removed[0].evidence, /picocolors/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkDrift flags dep-contradiction when zero-runtime-deps claim is broken', () => {
  const dir = makeTempRepo();
  try {
    writeMemory(dir, {
      stack: 'Zero runtime dependencies by design.',
      indexLastUpdated: isoDaysAgo(1),
    });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'x', dependencies: { ws: '^8.0.0' } })
    );
    commit(dir, 'chore: init');

    const { drifts } = checkDrift(dir);
    const contradiction = drifts.find((d) => d.kind === 'dep-contradiction');
    assert.ok(contradiction, 'expected a dep-contradiction drift');
    assert.match(contradiction.evidence, /ws/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkDrift flags missing-path when a memory-referenced file no longer exists', () => {
  const dir = makeTempRepo();
  try {
    writeMemory(dir, {
      stack: 'See `docs/adr/0001-zero-deps.md` for the rationale.',
      indexLastUpdated: isoDaysAgo(1),
    });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    commit(dir, 'chore: init');

    const { drifts } = checkDrift(dir);
    const missing = drifts.find((d) => d.kind === 'missing-path');
    assert.ok(missing, 'expected a missing-path drift');
    assert.match(missing.evidence, /docs\/adr\/0001-zero-deps\.md/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkDrift does not flag missing-path for generated/build directories', () => {
  const dir = makeTempRepo();
  try {
    writeMemory(dir, {
      stack: 'Bundles to `dist/rcode.js` for distribution.',
      indexLastUpdated: isoDaysAgo(1),
    });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    commit(dir, 'chore: init');

    const { drifts } = checkDrift(dir);
    assert.strictEqual(drifts.filter((d) => d.kind === 'missing-path').length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkDrift flags stale-index when INDEX.md is older than 30 days', () => {
  const dir = makeTempRepo();
  try {
    writeMemory(dir, { stack: '', indexLastUpdated: isoDaysAgo(45) });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    commit(dir, 'chore: init');

    const { drifts } = checkDrift(dir);
    const stale = drifts.find((d) => d.kind === 'stale-index');
    assert.ok(stale, 'expected a stale-index drift');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkDrift does not flag stale-index when INDEX.md is recent', () => {
  const dir = makeTempRepo();
  try {
    writeMemory(dir, { stack: '', indexLastUpdated: isoDaysAgo(5) });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    commit(dir, 'chore: init');

    const { drifts } = checkDrift(dir);
    assert.strictEqual(drifts.filter((d) => d.kind === 'stale-index').length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkDrift never throws when the memory dir is entirely absent', () => {
  const dir = makeTempRepo();
  try {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    commit(dir, 'chore: init');

    assert.doesNotThrow(() => checkDrift(dir));
    assert.deepStrictEqual(checkDrift(dir), { drifts: [] });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkDrift runs well under the 300ms budget on a small fixture repo', () => {
  const dir = makeTempRepo();
  try {
    writeMemory(dir, {
      stack: 'CLI helpers: `picocolors`. Zero runtime dependencies by design.',
      decisions: 'See `server/lib/api.js` for the guard pattern.',
      indexLastUpdated: isoDaysAgo(1),
    });
    fs.mkdirSync(path.join(dir, 'server', 'lib'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'server', 'lib', 'api.js'), '// x');
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'x', devDependencies: { picocolors: '^1.0.0' } })
    );
    commit(dir, 'chore: init');

    const start = Date.now();
    checkDrift(dir);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 300, `expected <300ms, got ${elapsed}ms`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
