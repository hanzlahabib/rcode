/**
 * Tests for cli/lib/manifest.cjs — agent manifest verification used by
 * install (post-copy check) and doctor (preflight).
 *
 * Uses the real package source as the expected set, and mocks installed
 * directories in a tempdir so we can simulate drift without needing a
 * full install.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  readPackageManifest,
  verifyInstall,
  verifyClaudeInstall,
  verifyRulesInstall,
  verifyAntigravityInstall,
  formatReport,
} = require('../../cli/lib/manifest.cjs');
const { makeTempDir, cleanup } = require('../helpers.cjs');

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');

test('readPackageManifest returns agents and actions sets from the package', () => {
  const manifest = readPackageManifest(PACKAGE_ROOT);
  assert.ok(manifest.agents instanceof Set);
  assert.ok(manifest.actions instanceof Set);
  assert.ok(manifest.agents.size > 0, 'should find at least one agent');
  assert.ok(manifest.actions.size > 0, 'should find at least one action');
});

test('readPackageManifest handles missing skills dir gracefully', (t) => {
  const fakeRoot = makeTempDir();
  t.after(() => cleanup(fakeRoot));

  const manifest = readPackageManifest(fakeRoot);
  assert.strictEqual(manifest.agents.size, 0);
  assert.strictEqual(manifest.actions.size, 0);
});

test('verifyClaudeInstall reports all agents missing when install dir is empty', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));

  const reports = verifyClaudeInstall(cwd, PACKAGE_ROOT, { globalFallback: false });
  const agentReport = reports.find((r) => r.kind === 'agents');
  assert.ok(agentReport);
  assert.strictEqual(agentReport.installedCount, 0);
  assert.ok(agentReport.expectedCount > 0);
  assert.ok(agentReport.missing.length > 0);
});

test('verifyClaudeInstall reports zero drift when all expected dirs exist', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));

  const manifest = readPackageManifest(PACKAGE_ROOT);
  const agentsDir = path.join(cwd, '.claude/agents');
  const skillsDir = path.join(cwd, '.claude/skills');
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

  // Agents live in .claude/agents/rihal-<name>.md as files (post-v3 layout).
  for (const agent of manifest.agents) {
    fs.writeFileSync(path.join(agentsDir, `rihal-${agent}.md`), '');
  }
  // Actions still live in .claude/skills/<bare-name>/ as dirs.
  for (const action of manifest.actions) {
    fs.mkdirSync(path.join(skillsDir, action));
  }

  const reports = verifyClaudeInstall(cwd, PACKAGE_ROOT, { globalFallback: false });
  const agentReport = reports.find((r) => r.kind === 'agents');
  const actionReport = reports.find((r) => r.kind === 'actions');

  assert.deepStrictEqual(agentReport.missing, []);
  assert.deepStrictEqual(agentReport.extra, []);
  assert.deepStrictEqual(actionReport.missing, []);
  assert.deepStrictEqual(actionReport.extra, []);
});

test('verifyClaudeInstall detects drift when one agent dir is deleted', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));

  const manifest = readPackageManifest(PACKAGE_ROOT);
  const agentsDir = path.join(cwd, '.claude/agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  // Install every agent except the first one (post-v3 file-based layout).
  const agents = [...manifest.agents];
  const skipped = agents[0];
  for (const agent of agents.slice(1)) {
    fs.writeFileSync(path.join(agentsDir, `rihal-${agent}.md`), '');
  }

  const reports = verifyClaudeInstall(cwd, PACKAGE_ROOT, { globalFallback: false });
  const agentReport = reports.find((r) => r.kind === 'agents');
  assert.deepStrictEqual(agentReport.missing, [skipped]);
});

test('verifyRulesInstall counts digest-based rules, excludes rihal-code.mdc', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));

  const rulesDir = path.join(cwd, '.cursor/rules');
  fs.mkdirSync(rulesDir, { recursive: true });

  // Copy expected digest names
  const digestsDir = path.join(PACKAGE_ROOT, 'rihal/digests');
  const expectedDigests = fs
    .readdirSync(digestsDir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => f.replace(/\.md$/, ''));

  for (const name of expectedDigests) {
    fs.writeFileSync(path.join(rulesDir, `rihal-${name}.mdc`), 'stub');
  }
  // The meta overview rule — should NOT count toward per-agent total
  fs.writeFileSync(path.join(rulesDir, 'rihal-code.mdc'), 'stub');

  const reports = verifyRulesInstall('cursor', cwd, PACKAGE_ROOT);
  assert.strictEqual(reports.length, 1);
  assert.deepStrictEqual(reports[0].missing, []);
});

test('verifyAntigravityInstall reports missing when agents dir is empty', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));

  const reports = verifyAntigravityInstall(cwd, PACKAGE_ROOT);
  assert.strictEqual(reports.length, 1);
  assert.ok(reports[0].missing.length > 0);
});

test('verifyInstall aggregates multiple editors and flags hasDrift', (t) => {
  const cwd = makeTempDir();
  t.after(() => cleanup(cwd));

  const result = verifyInstall(cwd, PACKAGE_ROOT, ['claude', 'cursor', 'windsurf', 'antigravity']);
  assert.ok(Array.isArray(result.reports));
  assert.strictEqual(result.hasDrift, true); // everything missing in an empty tempdir
});

test('formatReport produces readable multi-line output', () => {
  const reports = [
    {
      editor: 'claude',
      kind: 'agents',
      expectedCount: 17,
      installedCount: 16,
      missing: ['waleed-architect'],
      extra: [],
    },
    {
      editor: 'cursor',
      kind: 'rules',
      expectedCount: 19,
      installedCount: 19,
      missing: [],
      extra: [],
    },
  ];
  const formatted = formatReport(reports);
  assert.ok(formatted.includes('⚠'));
  assert.ok(formatted.includes('✓'));
  assert.ok(formatted.includes('waleed-architect'));
  assert.ok(formatted.includes('16/17'));
});
