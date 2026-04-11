/**
 * Shared test helpers.
 *
 * Every test creates its own temp directory under os.tmpdir() so tests
 * never touch the contributor's actual filesystem. Cleanup is automatic
 * via t.after() hooks.
 *
 * No network, no gh CLI, no real git commands (tests that need git init
 * do it in the tempdir). Contributors can run the whole suite offline
 * on a fresh clone with nothing but Node.js installed.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

/**
 * Create a fresh temp directory for a single test. Returns its absolute
 * path. Pair with cleanup() or let the `after` hook handle it.
 */
function makeTempDir(prefix = 'rihal-test-') {
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const dir = path.join(os.tmpdir(), `${prefix}${randomSuffix}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Recursively delete a directory. No-op if it doesn't exist.
 */
function cleanup(dir) {
  if (!dir) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // best effort
  }
}

/**
 * Create a minimal .rihal/ scaffold in the temp dir. Just enough to let
 * the libraries under test work without failing on "no .rihal/" checks.
 */
function initRihalDir(cwd) {
  fs.mkdirSync(path.join(cwd, '.rihal', 'phases'), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, '.rihal', 'state.json'),
    JSON.stringify({ created: new Date().toISOString() }, null, 2),
  );
}

/**
 * Seed a single phase with a brief. Lets milestone-linking tests verify
 * frontmatter writes without needing the full install scaffold.
 */
function seedPhase(cwd, phaseId, briefContent = '# Phase brief\n') {
  const dir = path.join(cwd, '.rihal', 'phases', phaseId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'brief.md'), briefContent);
  return dir;
}

/**
 * Register a cleanup handler on a `node:test` test context so the tempdir
 * is deleted when the test finishes (pass or fail).
 */
function registerCleanup(t, dir) {
  t.after(() => cleanup(dir));
}

module.exports = {
  makeTempDir,
  cleanup,
  initRihalDir,
  seedPhase,
  registerCleanup,
};
