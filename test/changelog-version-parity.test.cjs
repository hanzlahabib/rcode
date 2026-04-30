/**
 * package.json version ↔ CHANGELOG.md latest entry parity.
 *
 * If we ship a version on npm, CHANGELOG.md should record it. The
 * test asserts package.json's version appears as a heading in
 * CHANGELOG.md. Doesn't enforce content depth — just presence.
 *
 * Found at 2026-04-30: package.json was 3.4.4 while CHANGELOG ended
 * at v3.3.0 — 8 unrecorded versions on npm.
 *
 * Run: node --test test/changelog-version-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

test('package.json version is recorded in CHANGELOG.md', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  const version = pkg.version;
  const changelog = fs.readFileSync(path.join(PROJECT_ROOT, 'CHANGELOG.md'), 'utf8');
  // Match `## v3.4.4` or `## 3.4.4` or `## v3.4.4 — ...`
  const re = new RegExp(`^##\\s+v?${version.replace(/\\./g, '\\.')}\\b`, 'm');
  assert.ok(
    re.test(changelog),
    `package.json version ${version} has no entry in CHANGELOG.md.\n` +
      `Add a section "## v${version} — <summary> (<date>)" before publishing the next release.`,
  );
});

test('CHANGELOG.md has at least one version entry (sanity)', () => {
  const changelog = fs.readFileSync(path.join(PROJECT_ROOT, 'CHANGELOG.md'), 'utf8');
  const matches = changelog.match(/^##\s+v?\d+\.\d+\.\d+/gm) || [];
  assert.ok(matches.length > 0, 'CHANGELOG.md has no `## vX.Y.Z` entries');
});
