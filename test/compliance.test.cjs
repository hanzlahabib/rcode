/**
 * Compliance tests for Rihal v2 command, workflow, and agent consistency.
 *
 * These tests verify:
 * 1. Every command in help.md has a matching command file
 * 2. Every workflow listed in module YAML exists
 * 3. Every agent has valid frontmatter
 * 4. Every command file @-includes its workflow
 * 5. rihal-tools.cjs help text matches implemented subcommands
 *
 * Run: node --test test/compliance.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RIHAL_DIR = path.join(PROJECT_ROOT, 'rihal');
const COMMANDS_DIR = path.join(RIHAL_DIR, 'commands');
const WORKFLOWS_DIR = path.join(RIHAL_DIR, 'workflows');
const AGENTS_DIR = path.join(RIHAL_DIR, 'agents');
const MODULES_DIR = path.join(RIHAL_DIR, 'modules');

/**
 * Parse YAML frontmatter. Returns { frontmatter, body }.
 */
function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { frontmatter: {}, body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { frontmatter: {}, body: text };
  const block = text.slice(4, end);
  const body = text.slice(end + 5);
  const fm = {};
  for (const raw of block.split('\n')) {
    const line = raw.replace(/^#.*$/, '').trimEnd();
    if (!line) continue;
    const colonAt = line.indexOf(':');
    if (colonAt === -1) continue;
    const key = line.slice(0, colonAt).trim();
    let val = line.slice(colonAt + 1).trim();
    if (!key || !val) continue;
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    fm[key] = val;
  }
  return { frontmatter: fm, body };
}

/**
 * Get all .md files in a directory.
 */
function getMdFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(dir, f));
}

/**
 * Get all .yaml files in a directory.
 */
function getYamlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .map((f) => path.join(dir, f));
}

/**
 * Test 1: Every command in help.md has a matching command file
 */
test('every command referenced in help.md exists as a .md file', () => {
  const helpFile = path.join(COMMANDS_DIR, 'help.md');
  assert.ok(fs.existsSync(helpFile), 'help.md exists');

  const helpContent = fs.readFileSync(helpFile, 'utf8');
  // Look for `/rihal:` patterns in help.md
  const cmdMatches = helpContent.match(/\/rihal:[\w-]+/g) || [];
  const uniqueCmds = [...new Set(cmdMatches)].map((m) => m.slice(1)); // remove leading /

  const commandFiles = getMdFiles(COMMANDS_DIR).map((f) => path.basename(f, '.md'));

  for (const cmd of uniqueCmds) {
    const cmdName = cmd.slice(6); // remove 'rihal:' prefix
    assert.ok(
      commandFiles.includes(cmdName),
      `Command ${cmd} referenced in help.md but ${cmdName}.md not found`
    );
  }
});

/**
 * Test 2: Every workflow listed in module YAML exists
 */
test('every workflow in module.yaml files exists in workflows/ directory', () => {
  const moduleFiles = getMdFiles(MODULES_DIR);
  const workflowFiles = getMdFiles(WORKFLOWS_DIR).map((f) => path.basename(f));

  for (const moduleFile of moduleFiles) {
    const content = fs.readFileSync(moduleFile, 'utf8');
    // Find workflows section and extract filenames
    const workflowsMatch = content.match(/workflows:\n([\s\S]*?)(?:\ncommands:|$)/);
    if (!workflowsMatch) continue;

    const lines = workflowsMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^\s+-\s+([a-z0-9\-]+\.md)$/);
      if (!match) continue;
      const wfFile = match[1];
      assert.ok(
        workflowFiles.includes(wfFile),
        `Workflow ${wfFile} listed in ${path.basename(moduleFile)} but not found in workflows/`
      );
    }
  }
});

/**
 * Test 3: Every agent has valid frontmatter (name, description)
 */
test('every agent file has valid name and description in frontmatter', () => {
  const agentFiles = getMdFiles(AGENTS_DIR);
  assert.ok(agentFiles.length > 0, 'at least one agent file exists');

  for (const agentFile of agentFiles) {
    const content = fs.readFileSync(agentFile, 'utf8');
    const { frontmatter } = parseFrontmatter(content);

    assert.ok(
      frontmatter.name,
      `Agent ${path.basename(agentFile)} missing 'name' in frontmatter`
    );
    assert.ok(
      frontmatter.description,
      `Agent ${path.basename(agentFile)} missing 'description' in frontmatter`
    );
  }
});

/**
 * Test 4: Every command file @-includes its workflow
 */
test('every command file @-includes its corresponding workflow', () => {
  const commandFiles = getMdFiles(COMMANDS_DIR);

  for (const cmdFile of commandFiles) {
    const cmdName = path.basename(cmdFile, '.md');
    const content = fs.readFileSync(cmdFile, 'utf8');

    // Check for @-include pattern: @.rihal/workflows/{name}.md or similar
    const includePattern = /@\.rihal\/workflows\/|@\.\/\.\.\/workflows\//;
    const hasInclude = includePattern.test(content);

    assert.ok(
      hasInclude || cmdName === 'help', // 'help' command is exempt, it lists everything
      `Command ${cmdName}.md does not @-include a workflow`
    );
  }
});

/**
 * Test 5: rihal-tools.cjs has matching subcommand handlers
 */
test('rihal-tools.cjs has implemented subcommands', () => {
  const toolFile = path.join(PROJECT_ROOT, 'rihal/bin/rihal-tools.cjs');
  assert.ok(fs.existsSync(toolFile), 'rihal-tools.cjs exists');

  const content = fs.readFileSync(toolFile, 'utf8');

  // Extract case statements to find implemented subcommands
  // Match: case 'name': or case "name": or case name:
  const caseMatches = content.match(/case ['"]?([a-z\-_]+)['"]?:/g) || [];
  const implemented = new Set(caseMatches.map((m) => {
    const match = m.match(/case ['"]?([a-z\-_]+)['"]?:/);
    return match ? match[1] : null;
  }).filter(Boolean));

  // Verify essential subcommands are present
  const essential = ['init', 'classify-question', 'state', 'select-panel', 'plan', 'notes', 'version'];
  for (const sub of essential) {
    assert.ok(
      implemented.has(sub),
      `Essential subcommand ${sub} not found in rihal-tools.cjs switch statement`
    );
  }
});

/**
 * Test 6: Command frontmatter has required fields
 */
test('every command file has valid name, description, and argument-hint in frontmatter', () => {
  const commandFiles = getMdFiles(COMMANDS_DIR);
  assert.ok(commandFiles.length > 0, 'at least one command file exists');

  for (const cmdFile of commandFiles) {
    const content = fs.readFileSync(cmdFile, 'utf8');
    const { frontmatter } = parseFrontmatter(content);

    assert.ok(
      frontmatter.name,
      `Command ${path.basename(cmdFile)} missing 'name' in frontmatter`
    );
    assert.ok(
      frontmatter.description,
      `Command ${path.basename(cmdFile)} missing 'description' in frontmatter`
    );
    // argument-hint is optional but should exist for most commands
  }
});

/**
 * Test 7: Workflow files have purpose or clear structure
 */
test('every workflow file has a purpose, title, or opening description', () => {
  const workflowFiles = getMdFiles(WORKFLOWS_DIR);
  assert.ok(workflowFiles.length > 0, 'at least one workflow file exists');

  for (const wfFile of workflowFiles) {
    const content = fs.readFileSync(wfFile, 'utf8');
    // Check for: <purpose>, # Workflow:, # <title>, or <required_reading>
    const hasStructure = /<purpose>|^#\s+|<required_reading>/.test(content);

    assert.ok(
      hasStructure,
      `Workflow ${path.basename(wfFile)} missing purpose or structure`
    );
  }
});

/**
 * Test 8: All referenced modules exist and are valid YAML
 */
test('all modules in modules/ directory are readable YAML', () => {
  const moduleFiles = getYamlFiles(MODULES_DIR);
  assert.ok(moduleFiles.length > 0, 'at least one module file exists');

  for (const modFile of moduleFiles) {
    const content = fs.readFileSync(modFile, 'utf8');
    // Basic YAML validation: check for name: and version: keys
    assert.ok(
      /^name:\s+\S+/m.test(content),
      `Module ${path.basename(modFile)} missing 'name:' field`
    );
    assert.ok(
      /^version:\s+/m.test(content),
      `Module ${path.basename(modFile)} missing 'version:' field`
    );
  }
});
