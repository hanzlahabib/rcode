/**
 * Install matrix tests — locks in the unified-layout fix per Waleed + Fatima.
 *
 * Closes #635, #637, #638, #639, #640, #641, #642, #643, #646.
 *
 * After unification, vscode and claude IDEs both write commands to the same
 * prefixed-root form (.claude/commands/rcode-{name}.md). These tests verify:
 *
 *   row 4  (claude+vscode single run)  → no duplicates, single set of files
 *   row 5  (re-run = idempotency)      → second run produces byte-identical state
 *   row 8  (legacy migration)          → migrateVscodeCommandsLayout moves files
 *
 * Plus path-parity tests so getPathsForIde('vscode') and getPathsForIde('claude')
 * return the same commandsDir (the structural fix Waleed recommended).
 */

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const installMod = require(path.join(PROJECT_ROOT, 'cli/install.js'));
const { buildInstallPlan, migrateVscodeCommandsLayout, getPathsForIde } = installMod;

function mkTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-install-matrix-'));
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

// ─── Structural parity: claude and vscode point at the same commandsDir ──────

test('getPathsForIde: vscode and claude return the same commandsDir (#723 unification)', () => {
  const target = '/tmp/never-written';
  const claudePaths = getPathsForIde('claude', target);
  const vscodePaths = getPathsForIde('vscode', target);
  assert.equal(
    claudePaths.commandsDir,
    vscodePaths.commandsDir,
    'After unification, vscode must write to the same commandsDir as claude. ' +
    'Layout drift here will re-introduce the entire #635-#646 cluster.',
  );
  assert.equal(claudePaths.agentsDir, vscodePaths.agentsDir,
    'agentsDir should already have matched pre-fix, keep it pinned');
});

test('vscode still writes its workspace marker (.vscode/rcode/)', () => {
  // Unification dropped the subdir but should NOT drop the marker —
  // VSCode workspace settings can pin behaviour via this dir.
  const paths = getPathsForIde('vscode', '/tmp/never-written');
  assert.ok(paths.markerDir, 'vscode paths must still include markerDir');
  assert.ok(paths.markerDir.endsWith(path.join('.vscode', 'rcode')),
    `markerDir should be .vscode/rcode, got: ${paths.markerDir}`);
});

// ─── Row 4: claude+vscode plan has no command duplicates ─────────────────────

test('buildInstallPlan(["claude","vscode"]): no duplicate command entries (row 4)', () => {
  const target = '/tmp/never-written';
  const plan = buildInstallPlan(['claude', 'vscode'], target);
  // Pick out command entries (path goes through .claude/commands/)
  const commandEntries = plan.filter(e => {
    const rel = e.rel.split(path.sep).join('/');
    return rel.startsWith('.claude/commands/') && rel.endsWith('.md');
  });
  // Group by destination rel — there must be no `rel` collisions AND no
  // pair of entries that resolve to the same final basename.
  const relCounts = new Map();
  for (const e of commandEntries) {
    relCounts.set(e.rel, (relCounts.get(e.rel) || 0) + 1);
  }
  const duplicates = [...relCounts.entries()].filter(([, n]) => n > 1);
  assert.deepStrictEqual(duplicates, [],
    `claude+vscode plan must dedupe commands by rel — found duplicates: ${JSON.stringify(duplicates)}`);

  // Also: NO entry should be inside the legacy .claude/commands/rcode/ subdir.
  // That layout is dead post-#723.
  const legacy = commandEntries.filter(e =>
    e.rel.split(path.sep).join('/').startsWith('.claude/commands/rcode/'));
  assert.deepStrictEqual(legacy, [],
    `No command should land in the legacy .claude/commands/rcode/ subdir. Found: ${legacy.length} entries`);
});

test('buildInstallPlan(["claude","vscode"]): every command uses rcode- prefix at root (row 4)', () => {
  const plan = buildInstallPlan(['claude', 'vscode'], '/tmp/never-written');
  const commandEntries = plan.filter(e => {
    const rel = e.rel.split(path.sep).join('/');
    return rel.startsWith('.claude/commands/') && rel.endsWith('.md');
  });
  assert.ok(commandEntries.length > 0, 'plan should include at least one command');
  for (const e of commandEntries) {
    const basename = path.basename(e.rel);
    assert.ok(
      basename.startsWith('rcode-'),
      `Every command must use prefixed-root form. Got: ${e.rel}`,
    );
  }
});

// ─── Row 5: idempotency — second buildInstallPlan equals first ───────────────

test('buildInstallPlan is deterministic and idempotent (row 5)', () => {
  const target = '/tmp/never-written';
  const first = buildInstallPlan(['claude', 'vscode'], target);
  const second = buildInstallPlan(['claude', 'vscode'], target);
  // Compare by rel + src — ignoring `ide` and other metadata that may
  // legitimately vary across runs.
  const fp1 = first.map(e => `${e.rel}|${path.basename(e.src)}`).sort().join('\n');
  const fp2 = second.map(e => `${e.rel}|${path.basename(e.src)}`).sort().join('\n');
  assert.equal(fp1, fp2, 'plan must be deterministic — same inputs → same outputs');
});

// ─── Row 8: migrateVscodeCommandsLayout ──────────────────────────────────────

test('migrateVscodeCommandsLayout: no legacy dir → no-op', (t) => {
  const target = mkTempProject();
  t.after(() => cleanup(target));
  const result = migrateVscodeCommandsLayout(target);
  assert.deepStrictEqual(result, { moved: 0, removed_dir: false });
});

test('migrateVscodeCommandsLayout: moves bare files to prefixed-root form', (t) => {
  const target = mkTempProject();
  t.after(() => cleanup(target));
  const legacyDir = path.join(target, '.claude', 'commands', 'rcode');
  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(path.join(legacyDir, 'plan.md'), '# plan content');
  fs.writeFileSync(path.join(legacyDir, 'execute.md'), '# execute content');

  const result = migrateVscodeCommandsLayout(target);

  assert.equal(result.moved, 2, 'should move both files');
  assert.equal(result.removed_dir, true, 'should remove now-empty legacy dir');
  assert.ok(
    fs.existsSync(path.join(target, '.claude', 'commands', 'rcode-plan.md')),
    'plan.md should land as rcode-plan.md at root',
  );
  assert.ok(
    fs.existsSync(path.join(target, '.claude', 'commands', 'rcode-execute.md')),
    'execute.md should land as rcode-execute.md at root',
  );
  assert.equal(
    fs.readFileSync(path.join(target, '.claude', 'commands', 'rcode-plan.md'), 'utf8'),
    '# plan content',
    'file content must be preserved across the rename',
  );
  assert.ok(
    !fs.existsSync(legacyDir),
    'legacy rcode/ subdir should be cleaned up after the migration',
  );
});

test('migrateVscodeCommandsLayout: idempotent — running twice is a no-op', (t) => {
  const target = mkTempProject();
  t.after(() => cleanup(target));
  const legacyDir = path.join(target, '.claude', 'commands', 'rcode');
  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(path.join(legacyDir, 'plan.md'), '# plan');

  const first = migrateVscodeCommandsLayout(target);
  assert.equal(first.moved, 1);

  const second = migrateVscodeCommandsLayout(target);
  assert.deepStrictEqual(second, { moved: 0, removed_dir: false },
    'second run with no legacy dir should be a clean no-op');
});

test('migrateVscodeCommandsLayout: collision protection (target already exists)', (t) => {
  const target = mkTempProject();
  t.after(() => cleanup(target));
  const legacyDir = path.join(target, '.claude', 'commands', 'rcode');
  fs.mkdirSync(legacyDir, { recursive: true });
  // Both layouts present — claude wrote rcode-plan.md, vscode wrote rcode/plan.md.
  // Migration should treat the prefixed-root version as canonical and drop the
  // legacy duplicate so we don't end up with two slash commands for one source.
  fs.writeFileSync(path.join(legacyDir, 'plan.md'), '# legacy plan');
  fs.writeFileSync(
    path.join(target, '.claude', 'commands', 'rcode-plan.md'),
    '# canonical plan',
  );

  migrateVscodeCommandsLayout(target);

  assert.equal(
    fs.readFileSync(path.join(target, '.claude', 'commands', 'rcode-plan.md'), 'utf8'),
    '# canonical plan',
    'canonical file must NOT be overwritten by the legacy duplicate',
  );
  assert.ok(
    !fs.existsSync(path.join(legacyDir, 'plan.md')),
    'legacy duplicate must be removed',
  );
});

test('migrateVscodeCommandsLayout: leaves user-managed dir alone if non-empty after move', (t) => {
  const target = mkTempProject();
  t.after(() => cleanup(target));
  const legacyDir = path.join(target, '.claude', 'commands', 'rcode');
  fs.mkdirSync(legacyDir, { recursive: true });
  // Only one rcode-managed file but a user has stashed something else in here.
  fs.writeFileSync(path.join(legacyDir, 'plan.md'), '# plan');
  fs.writeFileSync(path.join(legacyDir, 'MY-NOTES.txt'), 'user file');

  const result = migrateVscodeCommandsLayout(target);

  assert.equal(result.moved, 1);
  assert.equal(result.removed_dir, false,
    'user file present → leave the dir; never delete user content');
  assert.ok(fs.existsSync(path.join(legacyDir, 'MY-NOTES.txt')),
    'user-managed file must be preserved');
});
