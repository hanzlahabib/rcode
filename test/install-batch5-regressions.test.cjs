/**
 * Regression tests for the batch-5 install bugs (#702, #703, #705).
 *
 * Each test pins the WHY of a fix that already shipped. If a future refactor
 * silently regresses any of these, CI fails before the bad behavior hits npm.
 */

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const INSTALL_JS = path.join(REPO_ROOT, 'cli', 'install.js');
const { makeTempDir, cleanup } = require('./helpers.cjs');

// #889: spawn every install with HOME (and USERPROFILE, for any direct
// os.homedir() reads on Windows) pointed at a throwaway dir. Without this,
// installs read the runner's REAL home — where parallel test files leak
// ~/.codex / ~/.gemini on Windows — and IDE auto-detection (--yes installs
// into every detected IDE) sent the install down a different path that
// never seeded .rcode/state.json.
const FAKE_HOME = makeTempDir('rcode-fakehome-');
after(() => cleanup(FAKE_HOME));

function gitInit(dir) {
  spawnSync('git', ['init', '-q'], { cwd: dir });
}

function runInstall(target, extra = []) {
  const r = spawnSync('node', [INSTALL_JS, '--target', target, '--no-update-check', '--yes', ...extra], {
    encoding: 'utf8',
    env: { ...process.env, HOME: FAKE_HOME, USERPROFILE: FAKE_HOME },
  });
  // Every test here depends on the install succeeding; fail HERE with the
  // child's output instead of a confusing downstream ENOENT (#889 — Windows
  // CI failed on a missing state.json three asserts after the real error).
  assert.strictEqual(
    r.status, 0,
    `install exited ${r.status} (signal ${r.signal}, err ${r.error?.message}):\n${r.stderr}\n${r.stdout}`,
  );
  return r;
}

// ────────────────────────────────────────────────────────────────────────
// #702 — files-manifest.csv must include skills installed by installSkills().
// Pre-fix the manifest was generated BEFORE installSkills ran, so 100+ skill
// files were invisible to orphan sweep + doctor drift detection.
// ────────────────────────────────────────────────────────────────────────

test('#702 — files-manifest.csv contains entries from .rcode/skills/', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  const r = runInstall(dir);
  assert.strictEqual(r.status, 0, `install failed: ${r.stderr}`);

  const manifestPath = path.join(dir, '.rcode', '_config', 'files-manifest.csv');
  assert.strictEqual(fs.existsSync(manifestPath), true, 'manifest must exist');

  const content = fs.readFileSync(manifestPath, 'utf8');
  // Internal skills always land in .rcode/skills/ and are NOT shadowed by
  // global precedence — these MUST appear in the manifest.
  const internalSkillRows = content.split('\n').filter(line => /^\.rcode\/skills\//.test(line));
  assert.ok(
    internalSkillRows.length > 0,
    `expected manifest to contain .rcode/skills/* entries, got 0. ` +
    `This means files-manifest.csv was generated before installSkills() ran — regression of #702.`,
  );
});

test('#702 — manifest entries match files actually on disk under .rcode/skills/', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);
  runInstall(dir);

  const manifestPath = path.join(dir, '.rcode', '_config', 'files-manifest.csv');
  const rows = fs.readFileSync(manifestPath, 'utf8').split('\n').slice(1).filter(Boolean);
  const manifestRels = new Set(rows.map(r => r.split(',')[0]));

  // Walk .rcode/skills/ and assert every file is in the manifest.
  function walk(absDir, baseRel) {
    if (!fs.existsSync(absDir)) return;
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const full = path.join(absDir, entry.name);
      const rel = path.join(baseRel, entry.name).split(path.sep).join('/');
      if (entry.isDirectory()) {
        walk(full, rel);
      } else if (entry.isFile()) {
        assert.ok(
          manifestRels.has(rel),
          `file ${rel} exists on disk but missing from manifest — regression of #702`,
        );
      }
    }
  }
  walk(path.join(dir, '.rcode', 'skills'), '.rcode/skills');
});

// ────────────────────────────────────────────────────────────────────────
// #703 — sweepStaleInstalledFiles must refuse path-traversal CSV entries.
// Pre-fix, a row like '../../etc/passwd,deadbeef,0' caused fs.rmSync to
// delete outside the project root.
// ────────────────────────────────────────────────────────────────────────

test('#703 — sweep refuses CSV rows with .. path-escape segments', (t) => {
  const dir = makeTempDir();
  const outside = makeTempDir();
  t.after(() => { cleanup(dir); cleanup(outside); });
  gitInit(dir);

  // First install creates the manifest so subsequent sweep has something to read.
  runInstall(dir);

  // Plant a victim file outside the project root, then add a path-escape
  // entry to the manifest pointing at it.
  const victim = path.join(outside, 'precious.txt');
  fs.writeFileSync(victim, 'do not delete');
  // Compute the relative path from project root to victim (will contain ..).
  const escapeRel = path.relative(dir, victim);
  assert.ok(escapeRel.includes('..'), `expected escape rel to contain .., got ${escapeRel}`);

  const manifestPath = path.join(dir, '.rcode', '_config', 'files-manifest.csv');
  fs.appendFileSync(manifestPath, `${escapeRel},deadbeef,0\n`);

  // Re-run install with --force to trigger the sweep.
  runInstall(dir, ['--force']);

  // The victim file outside the project must survive.
  assert.strictEqual(
    fs.existsSync(victim),
    true,
    `victim file at ${victim} was deleted — regression of #703 (sweep escaped project root)`,
  );
});

test('#703 — sweep refuses absolute paths from CSV', (t) => {
  const dir = makeTempDir();
  const outside = makeTempDir();
  t.after(() => { cleanup(dir); cleanup(outside); });
  gitInit(dir);

  runInstall(dir);

  const victim = path.join(outside, 'absolute-victim.txt');
  fs.writeFileSync(victim, 'absolute path victim');

  // Plant an ABSOLUTE path entry — different attack vector than '..'.
  const manifestPath = path.join(dir, '.rcode', '_config', 'files-manifest.csv');
  fs.appendFileSync(manifestPath, `${victim},deadbeef,0\n`);

  runInstall(dir, ['--force']);

  assert.strictEqual(
    fs.existsSync(victim),
    true,
    `absolute-path victim was deleted — regression of #703`,
  );
});

// ────────────────────────────────────────────────────────────────────────
// #705 — _seeded_stub:true must NOT be seeded when ROADMAP is real.
// Pre-fix: the template state.json (which has _seeded_stub:true baked in)
// got copied wholesale on re-install even when ROADMAP was real, mis-
// classifying the project as fresh.
// ────────────────────────────────────────────────────────────────────────

test('#705 — fresh install with no ROADMAP gets _seeded_stub:true (baseline)', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  runInstall(dir);

  const state = JSON.parse(fs.readFileSync(path.join(dir, '.rcode', 'state.json'), 'utf8'));
  assert.strictEqual(state._seeded_stub, true, 'fresh install should have _seeded_stub:true');
});

test('#705 — fresh install creates a stub-banner ROADMAP', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);
  runInstall(dir);

  const roadmap = fs.readFileSync(path.join(dir, '.planning', 'ROADMAP.md'), 'utf8');
  assert.match(roadmap, /<!-- INSTALL STUB/, 'fresh ROADMAP must carry the INSTALL STUB banner');
});

test('#705 — re-install with real ROADMAP + missing state.json does NOT re-seed _seeded_stub', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  // First install: stub state + stub ROADMAP.
  runInstall(dir);

  // Simulate the user replacing ROADMAP with real content + manually
  // deleting state.json (a common reset pattern).
  fs.writeFileSync(
    path.join(dir, '.planning', 'ROADMAP.md'),
    '# Real Project Roadmap\n\n## Phase 1 — Real production phase\n\nReal goal here.\n',
  );
  fs.unlinkSync(path.join(dir, '.rcode', 'state.json'));

  // Re-install. Without the #705 guard, the template _seeded_stub:true
  // would be copied straight back in.
  runInstall(dir);

  const state = JSON.parse(fs.readFileSync(path.join(dir, '.rcode', 'state.json'), 'utf8'));
  assert.notStrictEqual(
    state._seeded_stub,
    true,
    'real ROADMAP + missing state.json should NOT re-seed _seeded_stub — regression of #705',
  );
});

test('#705 — re-install with stub ROADMAP + missing state.json DOES re-seed _seeded_stub', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  runInstall(dir);

  // Don't change ROADMAP (still has stub banner); just delete state.json.
  fs.unlinkSync(path.join(dir, '.rcode', 'state.json'));

  runInstall(dir);

  const state = JSON.parse(fs.readFileSync(path.join(dir, '.rcode', 'state.json'), 'utf8'));
  assert.strictEqual(
    state._seeded_stub,
    true,
    'stub ROADMAP + missing state.json should re-seed _seeded_stub (true fresh-install case)',
  );
});

// ────────────────────────────────────────────────────────────────────────
// #706 — brain-pull execFileSync must pass a timeout option.
// Pre-fix, a slow upstream URL hung the entire install indefinitely.
// We can't easily test the timeout firing without mocking, so verify the
// option is wired by reading the source — guard against deletion.
// ────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────
// #1062 — a corrupt/unreadable files-manifest.csv must abort --non-destructive
// installs, never silently fall through to an unconditional overwrite.
// Pre-fix, the manifest read was wrapped in a bare try/catch that swallowed
// the error and left priorManifest empty, which made every locally-modified
// file look "new" and skip the preserve-user-edits branch entirely.
// ────────────────────────────────────────────────────────────────────────

test('#1062 — corrupt manifest aborts --non-destructive install instead of overwriting edits', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  gitInit(dir);

  // Fresh install to get a real manifest + real files on disk.
  runInstall(dir);

  const manifestPath = path.join(dir, '.rcode', '_config', 'files-manifest.csv');
  const manifestRows = fs.readFileSync(manifestPath, 'utf8').split('\n').slice(1).filter(Boolean);
  const [trackedRel] = manifestRows[0].split(',');
  assert.ok(trackedRel, 'expected at least one tracked file in the manifest');

  // Simulate a user edit on a tracked file — this is exactly what
  // --non-destructive is supposed to protect.
  const trackedPath = path.join(dir, trackedRel);
  const userEditedContent = '/* USER EDIT — must survive #1062 regression test */\n';
  fs.writeFileSync(trackedPath, userEditedContent, 'utf8');

  // Corrupt the manifest so fs.readFileSync() throws (EISDIR) instead of
  // just returning malformed text — this exercises the actual catch path.
  fs.rmSync(manifestPath, { force: true });
  fs.mkdirSync(manifestPath);

  const r = spawnSync('node', [INSTALL_JS, '--target', dir, '--no-update-check', '--yes', '--non-destructive'], {
    encoding: 'utf8',
    env: { ...process.env, HOME: FAKE_HOME, USERPROFILE: FAKE_HOME },
  });

  assert.notStrictEqual(
    r.status, 0,
    `install must abort (non-zero exit) on a corrupt manifest under --non-destructive, got status ${r.status}`,
  );
  assert.match(
    r.stderr,
    /--non-destructive.*could not read prior install manifest/i,
    `expected an explicit abort message, got:\n${r.stderr}`,
  );
  assert.strictEqual(
    fs.readFileSync(trackedPath, 'utf8'),
    userEditedContent,
    `user-modified file ${trackedRel} was overwritten despite --non-destructive — regression of #1062`,
  );
});

test('#1030 — install.js brain-pull runs detached instead of blocking install', () => {
  // #706's execFileSync + timeout was replaced in #1030: a live-measured 58s
  // cold pull sat dangerously close to that 60s timeout. Brain pull is
  // best-effort and never fails install, so it now spawns detached and
  // install returns immediately instead of blocking on a timeout at all.
  const src = fs.readFileSync(INSTALL_JS, 'utf8');
  const brainPullSection = src.match(
    /spawn\(\s*['"]node['"],\s*\[\s*toolsPath,\s*['"]brain['"],\s*['"]pull['"][\s\S]*?\}\)/,
  );
  assert.ok(brainPullSection, 'detached brain-pull spawn() call not found in install.js');
  assert.match(
    brainPullSection[0],
    /detached:\s*true/,
    'brain-pull spawn MUST pass detached: true — regression of #1030',
  );
  assert.match(
    src,
    /child\.unref\(\)/,
    'brain-pull child process MUST be unref\'d so it does not keep install alive — regression of #1030',
  );
});
