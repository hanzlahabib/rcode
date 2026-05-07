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

/**
 * Mirror the runtime global-precedence fallback that install.js uses
 * (#664/#666/#669 for agents/commands, #689 for skills). When the project
 * .claude/ dir is empty because globals shadow it (#679 dedup), tests that
 * count installed rihal-* artifacts should look at ~/.claude/ instead.
 *
 * Returns the count from project first; falls back to global only if
 * project has 0. Returns 0 when neither has anything.
 */
function countRihalArtifacts(projectRoot, kind) {
  // kind: 'agents' (.md files) | 'skills' (dirs) | 'commands' (.md files)
  const projectDir = path.join(projectRoot, '.claude', kind);
  const globalDir = path.join(os.homedir(), '.claude', kind);

  function countAt(dir) {
    if (!fs.existsSync(dir)) return 0;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      if (kind === 'skills') {
        return entries.filter(e => e.isDirectory() && e.name.startsWith('rihal-')).length;
      }
      return entries.filter(e =>
        e.isFile() && e.name.startsWith('rihal-') && e.name.endsWith('.md'),
      ).length;
    } catch {
      return 0;
    }
  }

  const projectCount = countAt(projectDir);
  if (projectCount > 0) return projectCount;
  return countAt(globalDir);
}

module.exports = {
  makeTempDir,
  cleanup,
  initRihalDir,
  seedPhase,
  registerCleanup,
  countRihalArtifacts,
};
