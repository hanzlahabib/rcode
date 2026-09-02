/**
 * Parity tests for the supported IDE list (Wave 4 W4.3 — issue #697).
 *
 * Pre-#697, the installer claimed claude/cursor/gemini/vscode/antigravity
 * while the uninstaller used claude/cursor/windsurf/antigravity. Result:
 * users with vscode-installed rcode could never cleanly uninstall, and
 * the uninstaller chased a windsurf path the installer never wrote.
 *
 * This test pins both sides to a single SUPPORTED_IDES constant exported
 * from cli/install.js. Any drift fails CI.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('install.js exports SUPPORTED_IDES as a frozen array', () => {
  const install = require('../cli/install.js');
  assert.ok(Array.isArray(install.SUPPORTED_IDES), 'SUPPORTED_IDES must be an array');
  assert.ok(install.SUPPORTED_IDES.length > 0, 'must contain at least one IDE');
  assert.ok(Object.isFrozen(install.SUPPORTED_IDES), 'must be frozen so callers cannot mutate');
});

test('SUPPORTED_IDES contains the expected canonical set', () => {
  const { SUPPORTED_IDES } = require('../cli/install.js');
  // Locked baseline — adding/removing an IDE must update this test
  // intentionally so reviewers see the semantic change.
  assert.deepStrictEqual(
    Array.from(SUPPORTED_IDES).sort(),
    ['antigravity', 'claude', 'codex', 'cursor', 'gemini', 'grok', 'vscode', 'windsurf'],
  );
});

test('uninstall.js imports SUPPORTED_IDES instead of duplicating the array', () => {
  // Source-level guard: confirm the maintainer used the import. Catches
  // a future revert that copies the array back into uninstall.js.
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'cli', 'uninstall.js'), 'utf8');
  assert.match(src, /require\(['"]\.\/install\.js['"]\)/, 'uninstall.js must require install.js for SUPPORTED_IDES');
  assert.match(src, /SUPPORTED_IDES/, 'uninstall.js must reference SUPPORTED_IDES');
  // Should NOT contain a literal redefinition.
  assert.doesNotMatch(
    src,
    /const\s+SUPPORTED_IDES\s*=\s*\[/,
    'uninstall.js must not redeclare SUPPORTED_IDES locally',
  );
});

test('install.js + cli/lib/install-ide.cjs together hardcode the IDE list only once (regex sweep)', () => {
  // #1066 Phase 1 moved the SUPPORTED_IDES definition (and every function
  // that references it) out of cli/install.js into cli/lib/install-ide.cjs
  // — a mechanical, no-behavior-change split. The canonical array literal
  // now lives there instead; sweep both files so this guard still catches
  // a future duplicate hardcoded list wherever it lands.
  const installSrc = fs.readFileSync(path.resolve(__dirname, '..', 'cli', 'install.js'), 'utf8');
  const ideLibSrc = fs.readFileSync(path.resolve(__dirname, '..', 'cli', 'lib', 'install-ide.cjs'), 'utf8');
  // Count exact array literals that hardcode the canonical set. Should
  // appear at most ONCE (the SUPPORTED_IDES definition itself).
  const re = /['"]claude['"]\s*,\s*['"]cursor['"]\s*,\s*['"]gemini['"]\s*,\s*['"]vscode['"]\s*,\s*['"]antigravity['"]/g;
  const matches = [
    ...(installSrc.match(re) || []),
    ...(ideLibSrc.match(re) || []),
  ];
  assert.strictEqual(
    matches.length,
    1,
    `expected the canonical 5-IDE list to appear exactly once across install.js + install-ide.cjs (the SUPPORTED_IDES definition); found ${matches.length}`,
  );
});
