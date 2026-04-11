/**
 * Tests for cli/lib/prompts.cjs — zero-dep readline wrapper.
 *
 * Most of this module's behavior is only observable through real stdin
 * interaction (TTY vs piped, backspace, SIGINT, etc.) which can't be
 * reproduced in a unit test without spawning a subprocess and faking a
 * TTY. The testable surface is:
 *
 *   1. PromptAbortError is exported and throws with the right name
 *   2. closeSession() is safe to call when no session is open
 *   3. closeSession() is idempotent (repeat calls don't throw)
 *   4. The module's public API surface is stable
 *
 * The real regression coverage for the TTY backspace bug (#16) is a
 * manual smoke test documented in CONTRIBUTING.md. CI cannot reproduce
 * an interactive terminal without a raw-mode harness.
 */

const { test } = require('node:test');
const assert = require('node:assert');

const prompts = require('../../cli/lib/prompts.cjs');

test('module exports the documented public API', () => {
  assert.strictEqual(typeof prompts.askChoice, 'function');
  assert.strictEqual(typeof prompts.askConfirm, 'function');
  assert.strictEqual(typeof prompts.askText, 'function');
  assert.strictEqual(typeof prompts.closeSession, 'function');
  assert.strictEqual(typeof prompts.PromptAbortError, 'function');
});

test('PromptAbortError is an Error subclass with correct name', () => {
  const err = new prompts.PromptAbortError('aborted');
  assert.ok(err instanceof Error);
  assert.strictEqual(err.name, 'PromptAbortError');
  assert.strictEqual(err.message, 'aborted');
});

test('PromptAbortError default message is set', () => {
  const err = new prompts.PromptAbortError();
  assert.strictEqual(err.message, 'Prompt aborted');
});

test('closeSession is a no-op when no session was opened', () => {
  // Should not throw, regardless of whether a session exists
  assert.doesNotThrow(() => prompts.closeSession());
});

test('closeSession is idempotent — calling it twice in a row is safe', () => {
  assert.doesNotThrow(() => {
    prompts.closeSession();
    prompts.closeSession();
  });
});
