/**
 * Tests for `phase add --decimal <parent>` (closes #477 item C).
 *
 * The flag auto-resolves the next free `<parent>.M` slot under an existing
 * integer phase, so users don't have to count siblings manually.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('fs');
const path = require('path');
const { makeTempDir, registerCleanup } = require('./helpers.cjs');

const CLI_SRC = path.resolve(__dirname, '..', 'rcode', 'bin', 'rcode-tools.cjs');
const LIB_SRC = path.resolve(__dirname, '..', 'rcode', 'bin', 'lib');

function run(cwd, args) {
  // Per #473 guard, the source CLI refuses to run against a foreign .rcode/.
  // Tests use the locally-installed copy at <cwd>/.rcode/bin/rcode-tools.cjs.
  const localCli = path.join(cwd, '.rcode', 'bin', 'rcode-tools.cjs');
  return execFileSync('node', [localCli, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, RCODE_NO_AUTO_INIT: '1' },
  });
}

function setupProject(t, opts = {}) {
  const cwd = makeTempDir('rcode-phase-decimal-');
  registerCleanup(t, cwd);
  fs.mkdirSync(path.join(cwd, '.rcode', 'bin', 'lib'), { recursive: true });
  fs.copyFileSync(CLI_SRC, path.join(cwd, '.rcode', 'bin', 'rcode-tools.cjs'));
  for (const file of fs.readdirSync(LIB_SRC)) {
    fs.copyFileSync(path.join(LIB_SRC, file), path.join(cwd, '.rcode', 'bin', 'lib', file));
  }
  fs.mkdirSync(path.join(cwd, '.planning', 'phases'), { recursive: true });

  const seedPhases = opts.phases || [{ number: '13', name: 'Parent Phase', slug: 'parent-phase' }];
  fs.writeFileSync(
    path.join(cwd, '.rcode', 'state.json'),
    JSON.stringify({ phases: seedPhases, decisions: [], blockers: [] }, null, 2),
  );

  // Seed ROADMAP heading so the parent-existence check has multiple sources.
  let roadmap = '# ROADMAP\n\n## Active\n\n';
  for (const p of seedPhases) {
    roadmap += `## Phase ${p.number} — ${p.name}\n\n**Status:** Planned\n\n---\n\n`;
    fs.mkdirSync(path.join(cwd, '.planning', 'phases', `${p.number}-${p.slug}`), { recursive: true });
  }
  fs.writeFileSync(path.join(cwd, '.planning', 'ROADMAP.md'), roadmap);
  return cwd;
}

test('phase add --decimal slots first child as parent.1', (t) => {
  const cwd = setupProject(t);
  const out = run(cwd, ['phase', 'add', '--decimal', '13', 'wave alpha']);
  assert.match(out, /13\.1/);
  const state = JSON.parse(fs.readFileSync(path.join(cwd, '.rcode', 'state.json'), 'utf8'));
  const added = state.phases.find((p) => p.number === '13.1');
  assert.ok(added, 'phase 13.1 should be in state');
  assert.strictEqual(added.slug, 'wave-alpha');
  assert.ok(fs.existsSync(path.join(cwd, '.planning', 'phases', '13.1-wave-alpha')));
});

test('phase add --decimal increments past existing minor', (t) => {
  const cwd = setupProject(t, {
    phases: [
      { number: '13', name: 'Parent', slug: 'parent' },
      { number: '13.1', name: 'First child', slug: 'first-child' },
      { number: '13.2', name: 'Second child', slug: 'second-child' },
    ],
  });
  const out = run(cwd, ['phase', 'add', '--decimal', '13', 'third child']);
  assert.match(out, /13\.3/);
  const state = JSON.parse(fs.readFileSync(path.join(cwd, '.rcode', 'state.json'), 'utf8'));
  assert.ok(state.phases.find((p) => p.number === '13.3'));
});

test('phase add --decimal accepts flag before name', (t) => {
  const cwd = setupProject(t);
  const out = run(cwd, ['phase', 'add', '--decimal', '13', 'reordered name']);
  assert.match(out, /13\.1/);
  const state = JSON.parse(fs.readFileSync(path.join(cwd, '.rcode', 'state.json'), 'utf8'));
  const added = state.phases.find((p) => p.number === '13.1');
  assert.strictEqual(added.name, 'reordered name');
});

test('phase add --decimal rejects non-existent parent', (t) => {
  const cwd = setupProject(t);
  assert.throws(
    () => run(cwd, ['phase', 'add', '--decimal', '99', 'orphan']),
    /parent 99 not found/,
  );
});

test('phase add --decimal rejects non-numeric parent', (t) => {
  const cwd = setupProject(t);
  assert.throws(
    () => run(cwd, ['phase', 'add', '--decimal', 'foo', 'bad']),
    /must be a positive integer/,
  );
});

test('phase add (no --decimal) still increments integer max', (t) => {
  const cwd = setupProject(t);
  const out = run(cwd, ['phase', 'add', 'next integer']);
  assert.match(out, /14/);
  const state = JSON.parse(fs.readFileSync(path.join(cwd, '.rcode', 'state.json'), 'utf8'));
  assert.ok(state.phases.find((p) => p.number === '14'));
});
