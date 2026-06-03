/**
 * Phase resolver handles 1-*, 01-*, and 001-* directory prefixes.
 *
 * Regression: the scanner only padded to 2 digits, missing legacy repos
 * that use 3-digit zero-padded phase directories (e.g. 001-setup).
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('fs');
const path = require('path');
const { makeTempDir, registerCleanup } = require('./helpers.cjs');

const CLI_SRC = path.resolve(__dirname, '..', 'rcode', 'bin', 'rcode-tools.cjs');
const LIB_SRC = path.resolve(__dirname, '..', 'rcode', 'bin', 'lib');

function setupProject(t, dirPrefix) {
  const cwd = makeTempDir('rcode-phase-dir-prefix-');
  registerCleanup(t, cwd);

  fs.mkdirSync(path.join(cwd, '.rcode', 'bin', 'lib'), { recursive: true });
  fs.copyFileSync(CLI_SRC, path.join(cwd, '.rcode', 'bin', 'rcode-tools.cjs'));
  for (const file of fs.readdirSync(LIB_SRC)) {
    fs.copyFileSync(path.join(LIB_SRC, file), path.join(cwd, '.rcode', 'bin', 'lib', file));
  }

  const phasesDir = path.join(cwd, '.planning', 'phases');
  fs.mkdirSync(path.join(phasesDir, dirPrefix), { recursive: true });

  fs.writeFileSync(
    path.join(cwd, '.rcode', 'state.json'),
    JSON.stringify(
      { phases: [{ number: '1', name: 'Setup', slug: 'setup' }], decisions: [], blockers: [] },
      null,
      2,
    ),
  );

  const roadmap = '# ROADMAP\n\n## Active\n\n## Phase 1 — Setup\n\n**Status:** Planned\n\n---\n\n';
  fs.writeFileSync(path.join(cwd, '.planning', 'ROADMAP.md'), roadmap);
  return cwd;
}

function resolvePhase(cwd, phaseNum) {
  const localCli = path.join(cwd, '.rcode', 'bin', 'rcode-tools.cjs');
  const raw = execFileSync(
    'node',
    [localCli, 'init', 'phase-op', `${phaseNum} what is the goal`],
    {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, RCODE_NO_AUTO_INIT: '1' },
    },
  );
  return JSON.parse(raw);
}

test('phase resolver finds directory with unpadded prefix "1-setup"', (t) => {
  const cwd = setupProject(t, '1-setup');
  const out = resolvePhase(cwd, 1);
  assert.strictEqual(out.phase_slug, 'setup', 'phase_slug should be "setup"');
  assert.ok(out.phase_dir, 'phase_dir should be set');
  assert.match(out.phase_dir, /1-setup$/, 'phase_dir should end with "1-setup"');
});

test('phase resolver finds directory with 2-digit padded prefix "01-setup"', (t) => {
  const cwd = setupProject(t, '01-setup');
  const out = resolvePhase(cwd, 1);
  assert.strictEqual(out.phase_slug, 'setup', 'phase_slug should be "setup"');
  assert.ok(out.phase_dir, 'phase_dir should be set');
  assert.match(out.phase_dir, /01-setup$/, 'phase_dir should end with "01-setup"');
});

test('phase resolver finds directory with 3-digit padded prefix "001-setup"', (t) => {
  const cwd = setupProject(t, '001-setup');
  const out = resolvePhase(cwd, 1);
  assert.strictEqual(out.phase_slug, 'setup', 'phase_slug should be "setup"');
  assert.ok(out.phase_dir, 'phase_dir should be set');
  assert.match(out.phase_dir, /001-setup$/, 'phase_dir should end with "001-setup"');
});

test('phase resolver returns null phase_slug when no matching directory exists', (t) => {
  const cwd = setupProject(t, '2-other');
  const out = resolvePhase(cwd, 1);
  assert.strictEqual(out.phase_slug, null, 'phase_slug should be null when dir not found');
  assert.strictEqual(out.phase_dir, null, 'phase_dir should be null when dir not found');
});
