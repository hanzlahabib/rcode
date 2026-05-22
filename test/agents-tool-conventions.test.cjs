/**
 * Agent tool-name convention tests.
 *
 * Catches regressions of #440 / #445 — agents that declare tools using
 * Gemini-style snake_case (read_file, run_shell_command, etc.) instead
 * of Claude Code PascalCase (Read, Bash, Grep, ...).
 *
 * Snake_case names are silently rejected by the Claude Code harness:
 * the agent narrates what it would do but never invokes any tool.
 *
 * Run: node --test test/agents-tool-conventions.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(PROJECT_ROOT, 'rcode', 'agents');

// Tools that the Claude Code harness accepts. PascalCase only.
const VALID_TOOLS = new Set([
  'Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob',
  'WebFetch', 'WebSearch', 'Task', 'AskUserQuestion',
  'NotebookEdit',
]);

// Snake_case tool names that USED to leak in (Gemini convention).
// These are the regression markers the test catches.
const FORBIDDEN_TOOLS = new Set([
  'read_file', 'write_file', 'run_shell_command',
  'search_file_content', 'glob', 'google_web_search', 'web_fetch',
]);

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return {};
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return {};
  const block = text.slice(4, end);
  const fm = {};
  for (const raw of block.split('\n')) {
    const m = raw.match(/^([a-zA-Z_-]+):\s*(.+)$/);
    if (m) fm[m[1].trim()] = m[2].trim();
  }
  return fm;
}

const agentFiles = fs.readdirSync(AGENTS_DIR)
  .filter((f) => f.startsWith('rcode-') && f.endsWith('.md'))
  .map((f) => path.join(AGENTS_DIR, f));

test('agents-tool-conventions: at least one agent file is present', () => {
  assert.ok(agentFiles.length > 0, 'expected agent files under rcode/agents/');
});

test('agents-tool-conventions: no agent uses Gemini snake_case tool names', () => {
  const offenders = [];
  for (const f of agentFiles) {
    const text = fs.readFileSync(f, 'utf8');
    const fm = parseFrontmatter(text);
    if (!fm.tools) continue;
    const toolList = fm.tools.split(',').map((t) => t.trim()).filter(Boolean);
    for (const t of toolList) {
      if (FORBIDDEN_TOOLS.has(t)) {
        offenders.push(`${path.basename(f)} → forbidden tool '${t}' (use the PascalCase equivalent)`);
      }
    }
  }
  assert.deepEqual(offenders, [], `Snake_case tool names found:\n${offenders.join('\n')}`);
});

test('agents-tool-conventions: every declared tool is in the valid set', () => {
  const unknowns = [];
  for (const f of agentFiles) {
    const text = fs.readFileSync(f, 'utf8');
    const fm = parseFrontmatter(text);
    if (!fm.tools) continue;
    const toolList = fm.tools.split(',').map((t) => t.trim()).filter(Boolean);
    for (const t of toolList) {
      if (!VALID_TOOLS.has(t)) {
        unknowns.push(`${path.basename(f)} → unknown tool '${t}' (not in VALID_TOOLS allowlist)`);
      }
    }
  }
  assert.deepEqual(unknowns, [], `Unknown tool names — extend VALID_TOOLS or fix the agent:\n${unknowns.join('\n')}`);
});
