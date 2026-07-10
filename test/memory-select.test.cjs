/**
 * Tests for rcode/bin/lib/memory-select.cjs — the relevance-ranked memory
 * selector (#958). Pure heuristics, no network/LLM calls: scores files under
 * .rcode/memory/ against the current phase/branch/touched-files context and
 * returns the top-scoring excerpts that fit a token budget.
 *
 * Run: node --test test/memory-select.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execSync } = require('node:child_process');

const {
  selectMemoryChunks,
  formatMemoryContext,
  estimateTokens,
  hasMemory,
} = require('../rcode/bin/lib/memory-select.cjs');

function makeTempProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-memory-select-'));
  execSync('git init -q', { cwd: dir });
  execSync('git config user.email test@example.com', { cwd: dir });
  execSync('git config user.name Test', { cwd: dir });
  fs.mkdirSync(path.join(dir, '.rcode'), { recursive: true });
  return dir;
}

function writeMemoryFile(dir, relPath, content) {
  const full = path.join(dir, '.rcode', 'memory', relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return full;
}

function writeState(dir, state) {
  fs.writeFileSync(
    path.join(dir, '.rcode', 'state.json'),
    JSON.stringify(state, null, 2)
  );
}

function commit(dir, message) {
  execSync('git add -A', { cwd: dir });
  execSync(`git commit -q -m "${message}"`, { cwd: dir });
}

test('empty-memory degradation: no .rcode/memory/ directory at all', () => {
  const dir = makeTempProject();
  const selection = selectMemoryChunks(dir);
  assert.strictEqual(selection.empty, true);
  assert.deepStrictEqual(selection.chunks, []);
  assert.strictEqual(selection.totalTokens, 0);
  assert.strictEqual(formatMemoryContext(selection), null);
  assert.strictEqual(hasMemory(dir), false);
});

test('empty-memory degradation: memory dir exists but every file is blank', () => {
  const dir = makeTempProject();
  writeMemoryFile(dir, 'project/stack.md', '   \n\n  ');
  const selection = selectMemoryChunks(dir);
  assert.strictEqual(selection.empty, true);
  assert.deepStrictEqual(selection.chunks, []);
  assert.strictEqual(formatMemoryContext(selection), null);
});

test('scoring: a file whose content matches the active phase name outranks an unrelated file', () => {
  const dir = makeTempProject();
  writeState(dir, {
    current_phase: 'checkout-redesign',
    phases: [{ number: '1', name: 'checkout-redesign', status: 'executing' }],
  });
  writeMemoryFile(
    dir,
    'project/decisions.md',
    'We decided to rebuild the checkout-redesign flow with a new payment provider.\n'.repeat(3)
  );
  writeMemoryFile(
    dir,
    'people/stakeholders.md',
    'Totally unrelated stakeholder contact list with no overlap keywords whatsoever.\n'.repeat(3)
  );
  commit(dir, 'seed memory');

  const selection = selectMemoryChunks(dir, { budgetTokens: 5000 });
  assert.strictEqual(selection.chunks.length, 2);
  const [top, second] = selection.chunks;
  assert.match(top.source, /decisions\.md$/);
  assert.ok(top.score > second.score, 'phase-matching file should score higher');
});

test('scoring: a file mentioning a recently-touched path outranks one that does not', () => {
  const dir = makeTempProject();
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'billing-service.js'), 'module.exports = {};\n');
  commit(dir, 'add billing-service.js');

  writeMemoryFile(
    dir,
    'project/decisions.md',
    'The billing-service module now owns invoice generation end to end.\n'.repeat(3)
  );
  writeMemoryFile(
    dir,
    'incidents/known-issues.md',
    'Some historical incident notes about an unrelated subsystem entirely.\n'.repeat(3)
  );
  commit(dir, 'seed memory 2');

  const selection = selectMemoryChunks(dir, { budgetTokens: 5000 });
  const decisions = selection.chunks.find((c) => c.source.endsWith('decisions.md'));
  const incidents = selection.chunks.find((c) => c.source.endsWith('known-issues.md'));
  assert.ok(decisions && incidents);
  assert.ok(decisions.score > incidents.score, 'touched-path mention should score higher');
});

test('budget cap: total selected tokens never exceed the requested budget', () => {
  const dir = makeTempProject();
  for (let i = 0; i < 5; i++) {
    writeMemoryFile(dir, `change-records/${i}.md`, `Change record ${i}\n`.repeat(200));
  }
  commit(dir, 'seed large memory');

  const budget = 300;
  const selection = selectMemoryChunks(dir, { budgetTokens: budget });
  assert.ok(selection.totalTokens <= budget, `totalTokens ${selection.totalTokens} exceeded budget ${budget}`);
  assert.ok(selection.chunks.length > 0);
  for (const chunk of selection.chunks) {
    assert.ok(chunk.tokens > 0);
    assert.strictEqual(chunk.tokens, estimateTokens(chunk.excerpt));
  }
});

test('budget cap: config.yaml memory_inject_budget overrides the default when no explicit option is passed', () => {
  const dir = makeTempProject();
  writeMemoryFile(dir, 'project/stack.md', 'Stack notes.\n'.repeat(500));
  commit(dir, 'seed');
  fs.writeFileSync(path.join(dir, '.rcode', 'config.yaml'), 'memory_inject_budget: "120"\n');

  const selection = selectMemoryChunks(dir);
  assert.strictEqual(selection.budget, 120);
  assert.ok(selection.totalTokens <= 120);
});

test('explicit budgetTokens option wins over config.yaml', () => {
  const dir = makeTempProject();
  writeMemoryFile(dir, 'project/stack.md', 'Stack notes.\n'.repeat(500));
  commit(dir, 'seed');
  fs.writeFileSync(path.join(dir, '.rcode', 'config.yaml'), 'memory_inject_budget: "120"\n');

  const selection = selectMemoryChunks(dir, { budgetTokens: 50 });
  assert.strictEqual(selection.budget, 50);
  assert.ok(selection.totalTokens <= 50);
});

test('formatMemoryContext renders a Markdown block with source headings', () => {
  const dir = makeTempProject();
  writeMemoryFile(dir, 'project/glossary.md', 'Some glossary content.\n');
  commit(dir, 'seed');

  const selection = selectMemoryChunks(dir, { budgetTokens: 1000 });
  const formatted = formatMemoryContext(selection);
  assert.ok(formatted);
  assert.match(formatted, /^## Relevant memory/);
  assert.match(formatted, /### .*glossary\.md/);
  assert.match(formatted, /Some glossary content\./);
});

test('runs fast — well under 200ms for a realistically sized memory bank', () => {
  const dir = makeTempProject();
  for (let i = 0; i < 20; i++) {
    writeMemoryFile(dir, `change-records/rec-${i}.md`, `Record ${i} body text.\n`.repeat(50));
  }
  commit(dir, 'seed perf');

  const start = Date.now();
  selectMemoryChunks(dir);
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 200, `selectMemoryChunks took ${elapsed}ms, expected <200ms`);
});
