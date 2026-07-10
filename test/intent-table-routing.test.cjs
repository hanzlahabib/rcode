/**
 * Drift guard for rcode/data/intent-table.json (#956): every intent's
 * `command` must resolve to a skill that actually ships in rcode/commands/,
 * and any flag the command mentions (e.g. "--karpathy") must be one the
 * target workflow file actually parses.
 *
 * This is the class of bug #956 reported: the "audit-karpathy" intent
 * pointed at `/rcode-review --karpathy`, but review.md never parsed a
 * `--karpathy` flag — the karpathy lens lives in a separate workflow. This
 * test turns that silent drift into a loud CI failure.
 *
 * Run: node --test test/intent-table-routing.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INTENT_TABLE_PATH = path.join(ROOT, 'rcode', 'data', 'intent-table.json');
const COMMANDS_DIR = path.join(ROOT, 'rcode', 'commands');
const WORKFLOWS_DIR = path.join(ROOT, 'rcode', 'workflows');

function loadIntentTable() {
  return JSON.parse(fs.readFileSync(INTENT_TABLE_PATH, 'utf8'));
}

/** Parse `name: rcode-xxx` out of a command file's YAML frontmatter. */
function parseFrontmatterName(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const nameLine = match[1].split('\n').find((l) => l.startsWith('name:'));
  if (!nameLine) return null;
  return nameLine.slice('name:'.length).trim().replace(/^["']|["']$/g, '');
}

/** Find every `@.rcode/workflows/<file>.md` reference in a command file. */
function findWorkflowRefs(text) {
  const refs = [];
  const re = /@\.rcode\/workflows\/([a-zA-Z0-9_-]+\.md)/g;
  let m;
  while ((m = re.exec(text)) !== null) refs.push(m[1]);
  return refs;
}

/**
 * A command entry is `/rcode-foo --bar --baz=qux`. Splits into the base
 * command and the list of flag names ("--bar" -> "bar", "--baz=qux" -> "baz").
 */
function parseCommand(command) {
  const tokens = command.trim().split(/\s+/);
  const base = tokens[0];
  const flags = tokens
    .slice(1)
    .filter((t) => t.startsWith('--'))
    .map((t) => t.slice(2).split('=')[0]);
  return { base, flags };
}

test('every intent-table.json command resolves to a shipped command/skill file', () => {
  const table = loadIntentTable();
  assert.ok(Array.isArray(table) && table.length > 0, 'intent table must be a non-empty array');

  const misses = [];
  for (const entry of table) {
    const { base } = parseCommand(entry.command);
    const skillName = base.replace(/^\//, ''); // "/rcode-audit" -> "rcode-audit"
    const fileName = skillName.replace(/^rcode-/, '') + '.md'; // -> "audit.md"
    const filePath = path.join(COMMANDS_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      misses.push(`  intent "${entry.intent}": ${base} — no file at rcode/commands/${fileName}`);
      continue;
    }

    const text = fs.readFileSync(filePath, 'utf8');
    const frontmatterName = parseFrontmatterName(text);
    if (frontmatterName !== skillName) {
      misses.push(
        `  intent "${entry.intent}": rcode/commands/${fileName} has name "${frontmatterName}", expected "${skillName}"`
      );
    }
  }

  assert.strictEqual(
    misses.length,
    0,
    [
      `${misses.length} intent-table.json command(s) do not resolve to an existing skill:`,
      ...misses,
      '',
      'Fix the "command" field in rcode/data/intent-table.json, or add the missing',
      'command file under rcode/commands/.',
    ].join('\n')
  );
});

test('every flag mentioned in an intent-table.json command is parsed by its target workflow', () => {
  const table = loadIntentTable();

  const misses = [];
  for (const entry of table) {
    const { base, flags } = parseCommand(entry.command);
    if (flags.length === 0) continue; // nothing to verify

    const skillName = base.replace(/^\//, '');
    const fileName = skillName.replace(/^rcode-/, '') + '.md';
    const commandPath = path.join(COMMANDS_DIR, fileName);
    if (!fs.existsSync(commandPath)) continue; // caught by the previous test

    const commandText = fs.readFileSync(commandPath, 'utf8');
    const workflowRefs = findWorkflowRefs(commandText);
    if (workflowRefs.length === 0) {
      misses.push(
        `  intent "${entry.intent}": ${entry.command} mentions flag(s) [${flags.join(', ')}] but rcode/commands/${fileName} references no workflow to verify them against`
      );
      continue;
    }

    for (const flag of flags) {
      const flagRe = new RegExp(`--${flag}\\b`);
      const parsedSomewhere = workflowRefs.some((ref) => {
        const workflowPath = path.join(WORKFLOWS_DIR, ref);
        if (!fs.existsSync(workflowPath)) return false;
        return flagRe.test(fs.readFileSync(workflowPath, 'utf8'));
      });

      if (!parsedSomewhere) {
        misses.push(
          `  intent "${entry.intent}": ${entry.command} mentions --${flag}, but it is not parsed in ${workflowRefs.join(', ')}`
        );
      }
    }
  }

  assert.strictEqual(
    misses.length,
    0,
    [
      `${misses.length} intent-table.json flag(s) are not parsed by their target workflow:`,
      ...misses,
      '',
      'Either fix the "command" field in rcode/data/intent-table.json to point at a',
      'workflow that actually parses the flag, or add the flag parsing to the workflow.',
    ].join('\n')
  );
});
