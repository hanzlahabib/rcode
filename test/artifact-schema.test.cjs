/**
 * Tests for the artifact schema validators in cli/lib/schemas.cjs.
 *
 * Covers issue #747 — schema validation of rcode's own artifacts:
 * SKILL.md frontmatter, agent frontmatter, and `.rcode/state.json`.
 * The final integration test locks the packaged agent source clean.
 *
 * Run: node --test test/artifact-schema.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const schemas = require(path.join(PROJECT_ROOT, 'cli/lib/schemas.cjs'));
const {
  parseFrontmatter,
  validateSkillFrontmatter,
  validateAgentFrontmatter,
  validateState,
} = schemas;

// ---------- Fixtures ----------

const goodSkill = {
  name: 'rcode-example-skill',
  description:
    'Example skill. Activates when the user says "do thing one", "do thing two", ' +
    '"do thing three", "do thing four", "do thing five", or "do thing six". ' +
    'Do NOT use for: unrelated work.',
};

const goodAgent = {
  name: 'rcode-example-agent',
  description: 'Does a thing for a phase.',
  tools: 'Read, Write, Bash',
  color: 'cyan',
};

// ---------- validateSkillFrontmatter ----------

test('validateSkillFrontmatter — well-formed fixture passes', () => {
  const r = validateSkillFrontmatter(goodSkill);
  assert.strictEqual(r.ok, true, JSON.stringify(r.errors));
});

test('validateSkillFrontmatter — only 3 trigger phrases fails on count', () => {
  const r = validateSkillFrontmatter({
    name: 'rcode-thin-skill',
    description: 'Activates on "one", "two", "three". Do NOT use for: anything else.',
  });
  assert.strictEqual(r.ok, false);
  assert.ok(
    r.errors.some((e) => /trigger phrases/.test(e) && /3/.test(e)),
    `expected a phrase-count error, got: ${JSON.stringify(r.errors)}`,
  );
});

test('validateSkillFrontmatter — missing negative-boundary clause fails', () => {
  const r = validateSkillFrontmatter({
    name: 'rcode-no-boundary',
    description:
      'Activates on "alpha", "bravo", "charlie", "delta", "echo", "foxtrot".',
  });
  assert.strictEqual(r.ok, false);
  assert.ok(
    r.errors.some((e) => /negative-boundary/.test(e)),
    `expected a negative-boundary error, got: ${JSON.stringify(r.errors)}`,
  );
});

test('validateSkillFrontmatter — missing name fails', () => {
  const { name, ...noName } = goodSkill;
  const r = validateSkillFrontmatter(noName);
  assert.strictEqual(r.ok, false);
  assert.ok(
    r.errors.some((e) => /name/.test(e)),
    `expected a name error, got: ${JSON.stringify(r.errors)}`,
  );
});

// ---------- validateAgentFrontmatter ----------

test('validateAgentFrontmatter — well-formed fixture passes', () => {
  const r = validateAgentFrontmatter(goodAgent);
  assert.strictEqual(r.ok, true, JSON.stringify(r.errors));
});

test('validateAgentFrontmatter — missing tools fails', () => {
  const { tools, ...noTools } = goodAgent;
  const r = validateAgentFrontmatter(noTools);
  assert.strictEqual(r.ok, false);
  assert.ok(
    r.errors.some((e) => /tools/.test(e)),
    `expected a tools error, got: ${JSON.stringify(r.errors)}`,
  );
});

test('validateAgentFrontmatter — name without rcode- prefix fails', () => {
  const r = validateAgentFrontmatter({ ...goodAgent, name: 'example-agent' });
  assert.strictEqual(r.ok, false);
  assert.ok(
    r.errors.some((e) => /rcode-/.test(e)),
    `expected a prefix error, got: ${JSON.stringify(r.errors)}`,
  );
});

// ---------- validateState ----------

test('validateState — real .rcode/state.json passes', () => {
  const state = require(path.join(PROJECT_ROOT, '.rcode/state.json'));
  const r = validateState(state);
  assert.strictEqual(r.ok, true, JSON.stringify(r.errors));
});

test('validateState — empty object fails', () => {
  const r = validateState({});
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.length > 0);
});

test('validateState — object missing phases fails', () => {
  const r = validateState({ version: '1', project: 'x', schema_version: 1 });
  assert.strictEqual(r.ok, false);
  assert.ok(
    r.errors.some((e) => /phases/.test(e)),
    `expected a phases error, got: ${JSON.stringify(r.errors)}`,
  );
});

// ---------- Integration: packaged agent files validate clean ----------

test('every rcode/agents/*.md file has frontmatter that passes validateAgentFrontmatter', () => {
  const agentsDir = path.join(PROJECT_ROOT, 'rcode/agents');
  const files = fs
    .readdirSync(agentsDir)
    .filter((f) => f.endsWith('.md'));
  assert.ok(files.length > 0, 'at least one agent file exists');

  for (const file of files) {
    const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
    const { frontmatter } = parseFrontmatter(content);
    const r = validateAgentFrontmatter(frontmatter);
    assert.strictEqual(
      r.ok,
      true,
      `agent ${file} failed validation: ${JSON.stringify(r.errors)}`,
    );
  }
});
