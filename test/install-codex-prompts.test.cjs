/**
 * Codex native home-prompt install tests.
 *
 * Codex surfaces /slash commands ONLY from ~/.codex/prompts/<name>.md. The
 * installer's installCodexPromptCommands() writes each rcode command there as a
 * flat prompt file with the YAML frontmatter stripped and a `# rcode: <desc>`
 * header prepended. These tests pin that contract against a temp HOME so the
 * real ~/.codex is never touched.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { installCodexPromptCommands } = require('../cli/install.js');

function withTempHome(fn) {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-codex-home-'));
  const origHomedir = os.homedir;
  os.homedir = () => tmpHome;
  try {
    return fn(tmpHome);
  } finally {
    os.homedir = origHomedir;
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
}

test('installCodexPromptCommands writes namespaced prompts into ~/.codex/prompts', () => {
  withTempHome((home) => {
    installCodexPromptCommands({ ide: 'codex', global: true });

    const promptsDir = path.join(home, '.codex', 'prompts');
    const target = path.join(promptsDir, 'rcode-add-phase.md');
    assert.ok(fs.existsSync(target), 'rcode-add-phase.md should exist');

    const body = fs.readFileSync(target, 'utf8');
    assert.ok(!body.startsWith('---'), 'frontmatter block must be stripped');
    assert.ok(body.startsWith('# rcode:'), 'prompt must start with the rcode header');

    // Sanity: the namespace is applied to every written file.
    const written = fs.readdirSync(promptsDir);
    assert.ok(written.length > 0, 'at least one prompt should be written');
    assert.ok(written.every((f) => f.startsWith('rcode-') && f.endsWith('.md')),
      'all written prompts must be rcode-namespaced .md files');
  });
});

test('installCodexPromptCommands is idempotent (overwrite ok)', () => {
  withTempHome((home) => {
    installCodexPromptCommands({ ide: 'codex', global: true });
    const target = path.join(home, '.codex', 'prompts', 'rcode-add-phase.md');
    const first = fs.readFileSync(target, 'utf8');
    installCodexPromptCommands({ ide: 'codex', global: true });
    const second = fs.readFileSync(target, 'utf8');
    assert.strictEqual(first, second, 're-run should produce identical content');
  });
});
