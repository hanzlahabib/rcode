'use strict';

// Tests for Sprint 38.2: settings-hooks.json template entry + merge idempotency.
//
// Test 1 — template present & valid:
//   settings-hooks.json has hooks.UserPromptSubmit with a prompt-router command.
//   Existing groups (PreToolUse, PostToolUse, PreCompact, Stop) are intact.
//
// Test 2 — merge idempotency (simulated):
//   Simulates the enable-hooks merge rule (substring-skip, same contract as
//   mergeSlashRouterHook in install.js). Applying the template UserPromptSubmit
//   group into an existing settings.json twice must yield exactly one prompt-router
//   command entry.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Resolve the template path relative to this test file (test/ lives at repo root).
const TEMPLATE_PATH = path.resolve(__dirname, '../rcode/templates/settings-hooks.json');

// ---------------------------------------------------------------------------
// Inline merge logic — mirrors the rule described in enable-hooks.md Step 3:
// "If a matcher + command pair already exists, skip it."
// More precisely: skip a new hook group if any command in that group is already
// present (by substring) in any existing group for that event type.
// This mirrors mergeSlashRouterHook's "already" check.
// ---------------------------------------------------------------------------

/**
 * Merge a single hook group (from the template) into an existing settings object.
 * Idempotent: if any command in the incoming group is already present under the
 * eventKey (checked by substring), the group is not added again.
 *
 * @param {object} settings  - Parsed settings.json object (mutated in place)
 * @param {string} eventKey  - e.g. 'UserPromptSubmit'
 * @param {object} group     - A single hook group from the template (has .hooks[])
 */
function mergeHookGroup(settings, eventKey, group) {
  if (!settings.hooks || typeof settings.hooks !== 'object') settings.hooks = {};
  if (!Array.isArray(settings.hooks[eventKey])) settings.hooks[eventKey] = [];

  const incomingCommands = (group.hooks || [])
    .filter(h => typeof h?.command === 'string')
    .map(h => h.command);

  const existingCommands = settings.hooks[eventKey]
    .flatMap(g => g.hooks || [])
    .filter(h => typeof h?.command === 'string')
    .map(h => h.command);

  // Skip the entire group if any of its commands are already present.
  const alreadyPresent = incomingCommands.some(cmd =>
    existingCommands.some(existing => existing.includes(cmd) || cmd.includes(existing.replace(/.*\//, ''))),
  );

  if (!alreadyPresent) {
    settings.hooks[eventKey].push(group);
  }
}

// ---------------------------------------------------------------------------
// Test 1 — template present & valid
// ---------------------------------------------------------------------------

test('settings-hooks.json has valid UserPromptSubmit prompt-router entry', () => {
  assert.ok(fs.existsSync(TEMPLATE_PATH), `template not found at ${TEMPLATE_PATH}`);

  const raw = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  let template;
  assert.doesNotThrow(() => { template = JSON.parse(raw); }, 'template must be valid JSON');

  assert.ok(
    template.hooks && typeof template.hooks === 'object',
    'template must have a hooks object',
  );

  const group = template.hooks.UserPromptSubmit;
  assert.ok(Array.isArray(group), 'hooks.UserPromptSubmit must be an array');
  assert.ok(group.length > 0, 'UserPromptSubmit must have at least one matcher group');

  const commands = group.flatMap(g => g.hooks || []).map(h => h.command);
  assert.ok(
    commands.some(c => /prompt-router/.test(c)),
    `expected a prompt-router command; found: ${JSON.stringify(commands)}`,
  );

  // Existing groups must remain untouched.
  assert.ok(Array.isArray(template.hooks.PreToolUse), 'PreToolUse must still exist');
  assert.ok(Array.isArray(template.hooks.PostToolUse), 'PostToolUse must still exist');
  assert.ok(Array.isArray(template.hooks.PreCompact), 'PreCompact must still exist');
  assert.ok(Array.isArray(template.hooks.Stop), 'Stop must still exist');
});

// ---------------------------------------------------------------------------
// Test 2 — merge idempotency (simulated)
// ---------------------------------------------------------------------------

test('merging UserPromptSubmit prompt-router group twice yields exactly one entry', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-router-test-'));

  try {
    // Start with an existing settings.json that has an unrelated PreToolUse hook.
    const initial = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [{ type: 'command', command: 'node .rcode/bin/rcode-hooks.cjs pre-edit' }],
          },
        ],
      },
    };

    const settingsPath = path.join(tmpDir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(initial, null, 2));

    // Read the template to get the real UserPromptSubmit group.
    const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));
    const templateGroups = template.hooks.UserPromptSubmit;
    assert.ok(Array.isArray(templateGroups) && templateGroups.length > 0, 'template must have UserPromptSubmit');

    // First merge.
    const settings1 = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    for (const group of templateGroups) {
      mergeHookGroup(settings1, 'UserPromptSubmit', group);
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings1, null, 2));

    // Second merge (idempotency check).
    const settings2 = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    for (const group of templateGroups) {
      mergeHookGroup(settings2, 'UserPromptSubmit', group);
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings2, null, 2));

    // Assert exactly one prompt-router command exists after two merges.
    const final = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const promptRouterCommands = (final.hooks.UserPromptSubmit || [])
      .flatMap(g => g.hooks || [])
      .filter(h => typeof h?.command === 'string' && /prompt-router/.test(h.command));

    assert.strictEqual(
      promptRouterCommands.length,
      1,
      `expected exactly 1 prompt-router command after two merges; found ${promptRouterCommands.length}: ${JSON.stringify(promptRouterCommands)}`,
    );

    // PreToolUse must be preserved from the initial settings.
    assert.ok(
      Array.isArray(final.hooks.PreToolUse) && final.hooks.PreToolUse.length === 1,
      'existing PreToolUse hooks must be preserved unchanged',
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
