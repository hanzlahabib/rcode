/**
 * help.md parity test.
 *
 * help.md is the canonical advertised command surface. Every /rcode-X
 * listed there MUST resolve to either a source command file
 * (rcode/commands/X.md) or an installed skill (.claude/skills/rcode-X/).
 *
 * This catches the bug class hit in session 2026-04-30 where help.md
 * advertised /rcode-create-prd, /rcode-validate-prd, etc., but the
 * commands had no rcode/commands/X.md file. They DID exist as installed
 * skills sourced from an external module, which is why the initial
 * "annotate as not-yet-implemented" pass (6e6f7e1) was wrong and got
 * reverted (3469719). The test below checks both stores so neither
 * direction lies.
 *
 * Run: node --test test/help-md-parity.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const os = require('node:os');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const HELP_MD = path.join(PROJECT_ROOT, 'rcode', 'workflows', 'help.md');
const COMMANDS_DIR = path.join(PROJECT_ROOT, 'rcode', 'commands');
// Source skills (always present in repo) and installed skills (project OR
// global, post-#679 dedup may leave project empty).
const SOURCE_SKILLS_DIRS = [
  path.join(PROJECT_ROOT, 'rcode', 'skills', 'agents'),
  path.join(PROJECT_ROOT, 'rcode', 'skills', 'actions'),
  path.join(PROJECT_ROOT, 'rcode', 'skills', 'core'),
];
const INSTALLED_SKILLS_DIRS = [
  path.join(PROJECT_ROOT, '.claude', 'skills'),
  path.join(os.homedir(), '.claude', 'skills'),
];

// Commands explicitly annotated in help.md as not yet implemented are
// allowed to be missing. The annotation marker is stable text; the test
// strips those rows before checking parity.
const NOT_YET_MARKER = /\*Not yet implemented[^*]*\*/;

function extractAdvertisedCommands(text) {
  const out = new Set();
  // Match `/rcode-X` inside markdown table rows (column-1 or backticked
  // anywhere). Skip any row carrying the not-yet-implemented annotation.
  for (const line of text.split('\n')) {
    if (NOT_YET_MARKER.test(line)) continue;
    // Prefer rows that look like table rows: `| `/rcode-X` |`
    const m = line.match(/`\/rcode-([a-z][a-z0-9-]+)`/g);
    if (!m) continue;
    for (const ref of m) {
      const name = ref.replace(/[`\/]/g, '').replace(/^rcode-/, '');
      // Drop tokens that are obviously not commands (single chars, etc.)
      if (name.length >= 2) out.add(name);
    }
  }
  return out;
}

function commandHasSource(name) {
  // Command file in source repo
  const cmdFile = path.join(COMMANDS_DIR, `${name}.md`);
  if (fs.existsSync(cmdFile)) return true;
  // Source skill dir (rcode/skills/<bucket>/rcode-<name>/ or <name>/)
  for (const bucketDir of SOURCE_SKILLS_DIRS) {
    if (!fs.existsSync(bucketDir)) continue;
    if (fs.existsSync(path.join(bucketDir, `rcode-${name}`))) return true;
    if (fs.existsSync(path.join(bucketDir, name))) return true;
  }
  // Installed skill dir (project OR global — covers #679 dedup state)
  for (const dir of INSTALLED_SKILLS_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const target = path.join(dir, `rcode-${name}`);
    try {
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) return true;
    } catch { /* skip */ }
  }
  return false;
}

test('every /rcode-X in help.md has a command file or installed skill', () => {
  const text = fs.readFileSync(HELP_MD, 'utf8');
  const advertised = extractAdvertisedCommands(text);
  const phantom = [...advertised].filter((c) => !commandHasSource(c)).sort();
  assert.deepEqual(
    phantom,
    [],
    `help.md advertises commands with no source:\n` +
      phantom.map((c) => `  /rcode-${c}`).join('\n') +
      `\nEither (a) add rcode/commands/<name>.md, (b) install the skill, or ` +
      `(c) annotate the row in help.md with *Not yet implemented (#NNN).*`,
  );
});

test('help.md advertises a non-trivial number of commands', () => {
  const text = fs.readFileSync(HELP_MD, 'utf8');
  const advertised = extractAdvertisedCommands(text);
  assert.ok(advertised.size > 30, `expected >30 advertised commands, got ${advertised.size}`);
});

test('every command in rcode/commands/ is referenced in help.md', () => {
  // Reverse direction: catches commands added to rcode/commands/ without a help.md entry.
  // NOTE: as of L15A-01 (sibling branch help-md-missing-commands), ~8 commands are
  // expected to be absent from help.md. This test will fail until that branch merges.
  const text = fs.readFileSync(HELP_MD, 'utf8');
  const advertised = extractAdvertisedCommands(text);
  const commandFiles = fs.readdirSync(COMMANDS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort();
  const missing = commandFiles.filter((cmd) => !advertised.has(cmd));
  assert.deepEqual(
    missing,
    [],
    `rcode/commands/ files not referenced in help.md (finding L15A-01):\n` +
      missing.map((c) => `  /rcode-${c}`).join('\n') +
      `\nEither add the command to help.md or remove the command file.`,
  );
});
