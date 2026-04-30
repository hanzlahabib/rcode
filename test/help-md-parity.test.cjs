/**
 * help.md parity test.
 *
 * help.md is the canonical advertised command surface. Every /rihal-X
 * listed there MUST resolve to either a source command file
 * (rihal/commands/X.md) or an installed skill (.claude/skills/rihal-X/).
 *
 * This catches the bug class hit in session 2026-04-30 where help.md
 * advertised /rihal-create-prd, /rihal-validate-prd, etc., but the
 * commands had no rihal/commands/X.md file. They DID exist as installed
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

const PROJECT_ROOT = path.resolve(__dirname, '..');
const HELP_MD = path.join(PROJECT_ROOT, 'rihal', 'workflows', 'help.md');
const COMMANDS_DIR = path.join(PROJECT_ROOT, 'rihal', 'commands');
const SKILLS_DIR = path.join(PROJECT_ROOT, '.claude', 'skills');

// Commands explicitly annotated in help.md as not yet implemented are
// allowed to be missing. The annotation marker is stable text; the test
// strips those rows before checking parity.
const NOT_YET_MARKER = /\*Not yet implemented[^*]*\*/;

function extractAdvertisedCommands(text) {
  const out = new Set();
  // Match `/rihal-X` inside markdown table rows (column-1 or backticked
  // anywhere). Skip any row carrying the not-yet-implemented annotation.
  for (const line of text.split('\n')) {
    if (NOT_YET_MARKER.test(line)) continue;
    // Prefer rows that look like table rows: `| `/rihal-X` |`
    const m = line.match(/`\/rihal-([a-z][a-z0-9-]+)`/g);
    if (!m) continue;
    for (const ref of m) {
      const name = ref.replace(/[`\/]/g, '').replace(/^rihal-/, '');
      // Drop tokens that are obviously not commands (single chars, etc.)
      if (name.length >= 2) out.add(name);
    }
  }
  return out;
}

function commandHasSource(name) {
  const cmdFile = path.join(COMMANDS_DIR, `${name}.md`);
  if (fs.existsSync(cmdFile)) return true;
  const skillDir = path.join(SKILLS_DIR, `rihal-${name}`);
  if (fs.existsSync(skillDir) && fs.statSync(skillDir).isDirectory()) return true;
  return false;
}

test('every /rihal-X in help.md has a command file or installed skill', () => {
  const text = fs.readFileSync(HELP_MD, 'utf8');
  const advertised = extractAdvertisedCommands(text);
  const phantom = [...advertised].filter((c) => !commandHasSource(c)).sort();
  assert.deepEqual(
    phantom,
    [],
    `help.md advertises commands with no source:\n` +
      phantom.map((c) => `  /rihal-${c}`).join('\n') +
      `\nEither (a) add rihal/commands/<name>.md, (b) install the skill, or ` +
      `(c) annotate the row in help.md with *Not yet implemented (#NNN).*`,
  );
});

test('help.md advertises a non-trivial number of commands', () => {
  const text = fs.readFileSync(HELP_MD, 'utf8');
  const advertised = extractAdvertisedCommands(text);
  assert.ok(advertised.size > 30, `expected >30 advertised commands, got ${advertised.size}`);
});
