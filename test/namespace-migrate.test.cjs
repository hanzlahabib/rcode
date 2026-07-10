/**
 * Unit tests for cli/lib/namespace-migrate.cjs (#954).
 *
 * All scans/mutations operate on plain tempdirs passed in explicitly as
 * projectDir/homeDir — no os.homedir()/process.cwd() stubbing needed, since
 * every function in this module takes its roots as arguments.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  findLegacyRihalArtifacts,
  findUnprefixedTwinDupes,
  findCrossScopeDupes,
  scanNamespaceDuplication,
  migrateNamespace,
} = require('../cli/lib/namespace-migrate.cjs');
const { makeTempDir, cleanup } = require('./helpers.cjs');

function writeSkill(claudeDir, name, content = '# skill\n') {
  const dir = path.join(claudeDir, 'skills', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), content);
}

function writeCommand(claudeDir, name, content = '# command\n') {
  const dir = path.join(claudeDir, 'commands');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), content);
}

// ---- findLegacyRihalArtifacts ----

test('findLegacyRihalArtifacts: flags rihal-* skill only when rcode-* twin exists', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  writeSkill(dir, 'rihal-do');
  writeSkill(dir, 'rihal-orphan'); // no twin — must NOT be flagged
  writeSkill(dir, 'rcode-do');

  const { skills } = findLegacyRihalArtifacts(dir);
  assert.strictEqual(skills.length, 1);
  assert.strictEqual(skills[0].name, 'rihal-do');
  assert.strictEqual(skills[0].twin, 'rcode-do');
});

test('findLegacyRihalArtifacts: flags rihal-* command only when rcode-* twin exists', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  writeCommand(dir, 'rihal-status.md');
  writeCommand(dir, 'rihal-lonely.md'); // no twin
  writeCommand(dir, 'rcode-status.md');

  const { commands } = findLegacyRihalArtifacts(dir);
  assert.strictEqual(commands.length, 1);
  assert.strictEqual(commands[0].name, 'rihal-status.md');
});

test('findLegacyRihalArtifacts: empty on a dir with no skills/commands', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  const result = findLegacyRihalArtifacts(dir);
  assert.deepStrictEqual(result, { skills: [], commands: [] });
});

// ---- findUnprefixedTwinDupes ----

test('findUnprefixedTwinDupes: flags unprefixed command with an rcode- twin', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  writeCommand(dir, 'do.md');
  writeCommand(dir, 'rcode-do.md');
  writeCommand(dir, 'standalone.md'); // no twin

  const dupes = findUnprefixedTwinDupes(dir);
  assert.strictEqual(dupes.length, 1);
  assert.strictEqual(dupes[0].name, 'do.md');
  assert.strictEqual(dupes[0].twin, 'rcode-do.md');
});

test('findUnprefixedTwinDupes: ignores rcode-* and rihal-* prefixed files themselves', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  writeCommand(dir, 'rcode-do.md');
  writeCommand(dir, 'rihal-do.md');
  const dupes = findUnprefixedTwinDupes(dir);
  assert.strictEqual(dupes.length, 0);
});

// ---- findCrossScopeDupes ----

test('findCrossScopeDupes: flags global copy when the same command exists in project', (t) => {
  const projectDir = makeTempDir();
  const homeDir = makeTempDir();
  t.after(() => { cleanup(projectDir); cleanup(homeDir); });

  writeCommand(path.join(projectDir, '.claude'), 'do.md');
  writeCommand(path.join(homeDir, '.claude'), 'do.md');
  writeCommand(path.join(homeDir, '.claude'), 'global-only.md');

  const dupes = findCrossScopeDupes(path.join(projectDir, '.claude'), path.join(homeDir, '.claude'));
  assert.strictEqual(dupes.length, 1);
  assert.strictEqual(dupes[0].name, 'do.md');
  assert.strictEqual(dupes[0].srcPath, path.join(homeDir, '.claude', 'commands', 'do.md'));
});

test('findCrossScopeDupes: same dir passed for both scopes returns nothing (no self-dupe)', (t) => {
  const dir = makeTempDir();
  t.after(() => cleanup(dir));
  writeCommand(dir, 'do.md');
  const dupes = findCrossScopeDupes(dir, dir);
  assert.strictEqual(dupes.length, 0);
});

// ---- scanNamespaceDuplication ----

test('scanNamespaceDuplication: aggregates counts across project + global scope', (t) => {
  const projectDir = makeTempDir();
  const homeDir = makeTempDir();
  t.after(() => { cleanup(projectDir); cleanup(homeDir); });

  writeSkill(path.join(homeDir, '.claude'), 'rihal-do');
  writeSkill(path.join(homeDir, '.claude'), 'rcode-do');
  writeCommand(path.join(homeDir, '.claude'), 'plan.md');
  writeCommand(path.join(homeDir, '.claude'), 'rcode-plan.md');
  writeCommand(path.join(projectDir, '.claude'), 'ship.md');
  writeCommand(path.join(homeDir, '.claude'), 'ship.md');

  const scan = scanNamespaceDuplication(projectDir, homeDir);
  assert.strictEqual(scan.legacySkillCount, 1);
  assert.strictEqual(scan.unprefixedCount, 1);
  assert.strictEqual(scan.crossScopeCount, 1);
  assert.strictEqual(scan.totalCount, 3);
});

test('scanNamespaceDuplication: zero on a clean install', (t) => {
  const projectDir = makeTempDir();
  const homeDir = makeTempDir();
  t.after(() => { cleanup(projectDir); cleanup(homeDir); });

  writeSkill(path.join(homeDir, '.claude'), 'rcode-do');
  writeCommand(path.join(homeDir, '.claude'), 'rcode-do.md');

  const scan = scanNamespaceDuplication(projectDir, homeDir);
  assert.strictEqual(scan.totalCount, 0);
});

// ---- migrateNamespace ----

test('migrateNamespace: removes legacy rihal-* skill and backs it up under ~/.claude/.rcode-backup/', (t) => {
  const projectDir = makeTempDir();
  const homeDir = makeTempDir();
  t.after(() => { cleanup(projectDir); cleanup(homeDir); });

  writeSkill(path.join(homeDir, '.claude'), 'rihal-do', '# legacy content\n');
  writeSkill(path.join(homeDir, '.claude'), 'rcode-do');

  const summary = migrateNamespace(projectDir, homeDir);
  assert.strictEqual(summary.removed.legacySkills, 1);
  assert.ok(summary.backupDir);
  assert.ok(summary.backupDir.startsWith(path.join(homeDir, '.claude', '.rcode-backup')));

  // Original removed
  assert.strictEqual(fs.existsSync(path.join(homeDir, '.claude', 'skills', 'rihal-do')), false);
  // Twin untouched
  assert.strictEqual(fs.existsSync(path.join(homeDir, '.claude', 'skills', 'rcode-do')), true);
  // Backup preserved with original content
  const backedUp = path.join(summary.backupDir, 'global', 'skills', 'rihal-do', 'SKILL.md');
  assert.strictEqual(fs.existsSync(backedUp), true);
  assert.strictEqual(fs.readFileSync(backedUp, 'utf8'), '# legacy content\n');
});

test('migrateNamespace: cross-scope dupe keeps the project copy, removes the global one', (t) => {
  const projectDir = makeTempDir();
  const homeDir = makeTempDir();
  t.after(() => { cleanup(projectDir); cleanup(homeDir); });

  writeCommand(path.join(projectDir, '.claude'), 'ship.md', '# project ship\n');
  writeCommand(path.join(homeDir, '.claude'), 'ship.md', '# global ship\n');

  migrateNamespace(projectDir, homeDir);

  assert.strictEqual(fs.existsSync(path.join(projectDir, '.claude', 'commands', 'ship.md')), true);
  assert.strictEqual(fs.existsSync(path.join(homeDir, '.claude', 'commands', 'ship.md')), false);
});

test('migrateNamespace: idempotent — second run removes nothing and creates no new backup', (t) => {
  const projectDir = makeTempDir();
  const homeDir = makeTempDir();
  t.after(() => { cleanup(projectDir); cleanup(homeDir); });

  writeSkill(path.join(homeDir, '.claude'), 'rihal-do');
  writeSkill(path.join(homeDir, '.claude'), 'rcode-do');
  writeCommand(path.join(homeDir, '.claude'), 'rihal-plan.md');
  writeCommand(path.join(homeDir, '.claude'), 'rcode-plan.md');

  const first = migrateNamespace(projectDir, homeDir);
  const totalFirst = Object.values(first.removed).reduce((a, b) => a + b, 0);
  assert.strictEqual(totalFirst, 2);

  const second = migrateNamespace(projectDir, homeDir);
  const totalSecond = Object.values(second.removed).reduce((a, b) => a + b, 0);
  assert.strictEqual(totalSecond, 0);
  assert.strictEqual(second.backupDir, null);
});

test('migrateNamespace: no-op run creates no backup directory at all', (t) => {
  const projectDir = makeTempDir();
  const homeDir = makeTempDir();
  t.after(() => { cleanup(projectDir); cleanup(homeDir); });

  const summary = migrateNamespace(projectDir, homeDir);
  assert.strictEqual(summary.backupDir, null);
  assert.strictEqual(fs.existsSync(path.join(homeDir, '.claude', '.rcode-backup')), false);
});
