/**
 * package.json files[] ↔ disk parity.
 *
 * Every entry in package.json's `files` array must exist on disk;
 * otherwise `npm publish` ships a partial package or skips entries
 * silently.
 *
 * Found at 2026-04-30: `.rihal-template/` listed but missing.
 *
 * Run: node --test test/package-files-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

test('every package.json files[] entry exists on disk', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  const entries = pkg.files || [];
  assert.ok(entries.length > 0, 'package.json files[] is empty — publish would include node_modules');
  const missing = entries.filter((e) => !fs.existsSync(path.join(PROJECT_ROOT, e))).sort();
  assert.deepEqual(
    missing,
    [],
    `package.json files[] entries missing on disk:\n` +
      missing.map((m) => `  - ${m}`).join('\n') +
      `\nEither create the path, remove the entry, or fix the path.`,
  );
});

test('every package.json bin target exists on disk', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  const bins = pkg.bin || {};
  // dist/ is a build artifact (gitignored) — skip if not yet built
  const distDir = path.join(PROJECT_ROOT, 'dist');
  if (!fs.existsSync(distDir)) return;
  const missing = Object.entries(bins)
    .filter(([, target]) => !fs.existsSync(path.join(PROJECT_ROOT, target)))
    .map(([name, target]) => `${name} → ${target}`)
    .sort();
  assert.deepEqual(missing, [], `package.json bin entries missing on disk:\n  ${missing.join('\n  ')}`);
});
