/**
 * Tests for rcode/skills/seo/seo-os/scripts/seo-project-init.cjs.
 *
 * Verifies idempotent behavior against a synthetic temp "project" directory
 * with its own synthetic templates directory (via RCODE_PROJECT_ROOT), so
 * this test never touches the real .rcode/templates/seo/ install location
 * or leaves state behind in the repo.
 *
 * Run: node --test test/seo-project-init.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'rcode', 'skills', 'seo', 'seo-os', 'scripts', 'seo-project-init.cjs');
const { resolveTemplateSource, initSeoProject } = require(SCRIPT);

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('resolveTemplateSource finds the real rcode/templates/seo in source tree', () => {
  const resolved = resolveTemplateSource();
  assert.ok(fs.existsSync(path.join(resolved, 'PROJECT.md')));
  assert.ok(fs.existsSync(path.join(resolved, 'STATE.md')));
});

test('initSeoProject creates PROJECT.md and STATE.md on first run', () => {
  const targetDir = makeTempDir('seo-init-target-');
  const templateSource = path.join(PROJECT_ROOT, 'rcode', 'templates', 'seo');

  const result = initSeoProject(targetDir, templateSource);

  assert.deepStrictEqual(result.created.sort(), [path.join('.rcode', 'seo', 'PROJECT.md'), path.join('.rcode', 'seo', 'STATE.md')].sort());
  assert.deepStrictEqual(result.skipped, []);
  assert.ok(fs.existsSync(path.join(targetDir, '.rcode', 'seo', 'PROJECT.md')));
  assert.ok(fs.existsSync(path.join(targetDir, '.rcode', 'seo', 'STATE.md')));
});

test('initSeoProject is idempotent — second run skips existing files and never overwrites them', () => {
  const targetDir = makeTempDir('seo-init-idempotent-');
  const templateSource = path.join(PROJECT_ROOT, 'rcode', 'templates', 'seo');

  initSeoProject(targetDir, templateSource);

  // Simulate real project edits to STATE.md that must survive a second init.
  const statePath = path.join(targetDir, '.rcode', 'seo', 'STATE.md');
  fs.writeFileSync(statePath, 'Stage: LAUNCHED\nPriority: HIGH\n');

  const second = initSeoProject(targetDir, templateSource);

  assert.deepStrictEqual(second.created, []);
  assert.deepStrictEqual(second.skipped.sort(), [path.join('.rcode', 'seo', 'PROJECT.md'), path.join('.rcode', 'seo', 'STATE.md')].sort());
  assert.strictEqual(fs.readFileSync(statePath, 'utf8'), 'Stage: LAUNCHED\nPriority: HIGH\n');
});

test('initSeoProject throws a clear error when the target directory does not exist', () => {
  const templateSource = path.join(PROJECT_ROOT, 'rcode', 'templates', 'seo');
  assert.throws(
    () => initSeoProject(path.join(os.tmpdir(), 'definitely-does-not-exist-seo-init'), templateSource),
    /does not exist or is not a directory/
  );
});

test('initSeoProject throws a clear error when a required template is missing', () => {
  const targetDir = makeTempDir('seo-init-missing-template-');
  const emptyTemplateSource = makeTempDir('seo-init-empty-templates-');
  assert.throws(() => initSeoProject(targetDir, emptyTemplateSource), /Template missing/);
});

test('CLI: prints a JSON blob with created/skipped and is idempotent across two invocations', () => {
  const targetDir = makeTempDir('seo-init-cli-');

  const first = spawnSync(process.execPath, [SCRIPT, targetDir], { encoding: 'utf8' });
  assert.strictEqual(first.status, 0, first.stderr);
  const firstJson = JSON.parse(first.stdout);
  assert.strictEqual(firstJson.created.length, 2);
  assert.strictEqual(firstJson.skipped.length, 0);

  const second = spawnSync(process.execPath, [SCRIPT, targetDir], { encoding: 'utf8' });
  assert.strictEqual(second.status, 0, second.stderr);
  const secondJson = JSON.parse(second.stdout);
  assert.strictEqual(secondJson.created.length, 0);
  assert.strictEqual(secondJson.skipped.length, 2);
});

test('CLI: resolves templates from the installed script location, not the caller\'s cwd', () => {
  // Simulate the real installed layout — <project>/.claude/skills/rcode-seo-os/scripts/<script>
  // — and invoke with a cwd that is NOT the project root, to catch the case where an agent
  // runs this script by absolute path from an arbitrary directory (see resolveTemplateSource's
  // candidate ordering: the installed-location candidate must be checked before the cwd-based
  // one, or this exact scenario fails with "Could not locate SEO templates" even though the
  // templates really are installed one level away from where cwd-only resolution would look).
  const fakeProjectRoot = makeTempDir('seo-init-installed-project-');
  const scriptsDir = path.join(fakeProjectRoot, '.claude', 'skills', 'rcode-seo-os', 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  const installedScript = path.join(scriptsDir, 'seo-project-init.cjs');
  fs.copyFileSync(SCRIPT, installedScript);

  const templatesDir = path.join(fakeProjectRoot, '.rcode', 'templates', 'seo');
  fs.mkdirSync(templatesDir, { recursive: true });
  fs.writeFileSync(path.join(templatesDir, 'PROJECT.md'), 'Project: Fake\n');
  fs.writeFileSync(path.join(templatesDir, 'STATE.md'), 'Stage: IDEA\n');

  const targetDir = fakeProjectRoot; // node seo-project-init.cjs <targetDir>
  const elsewhereCwd = makeTempDir('seo-init-elsewhere-cwd-'); // deliberately not fakeProjectRoot

  const result = spawnSync(process.execPath, [installedScript, targetDir], {
    encoding: 'utf8',
    cwd: elsewhereCwd,
  });

  assert.strictEqual(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.strictEqual(parsed.templateSource, templatesDir);
  assert.strictEqual(parsed.created.length, 2);
});

test('CLI: exits non-zero with a clear message when the target directory does not exist', () => {
  const result = spawnSync(process.execPath, [SCRIPT, path.join(os.tmpdir(), 'definitely-does-not-exist-seo-init-cli')], {
    encoding: 'utf8',
  });

  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /does not exist or is not a directory/);
});
