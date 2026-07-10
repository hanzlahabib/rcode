/**
 * Unit tests for resolveActivePhase() in rcode/bin/lib/state-reader.cjs (#955).
 *
 * Covers the bug: a stale 'executing' phase earlier in the roadmap must never
 * shadow the real current phase (current_phase match, or the highest-numbered
 * non-complete phase).
 *
 * Run: node --test test/state-reader-resolve-active-phase.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { resolveActivePhase } = require('../rcode/bin/lib/state-reader.cjs');

test('prefers current_phase name match over a stale earlier executing phase', () => {
  const state = {
    current_phase: 'Ship rcode/data to consumers (#952)',
    phases: [
      { number: '35', name: 'Old work A', status: 'executing' },
      { number: '36', name: 'Old work B', status: 'executing' },
      { number: '37', name: 'Old work C', status: 'executing' },
      { number: '42', name: 'Ambient adoption hooks', status: 'executed' },
      { number: '43', name: 'Ship rcode/data to consumers (#952)', status: 'executed' },
    ],
  };
  const { activePhase, phaseLabel } = resolveActivePhase(state);
  assert.strictEqual(activePhase.number, '43');
  assert.strictEqual(phaseLabel, '43');
});

test('prefers current_phase number match over stale executing phase', () => {
  const state = {
    current_phase: '43',
    phases: [
      { number: '37', name: 'Old work', status: 'executing' },
      { number: '43', name: 'Newer work', status: 'planned' },
    ],
  };
  const { activePhase } = resolveActivePhase(state);
  assert.strictEqual(activePhase.number, '43');
});

test('falls back to highest-numbered non-complete phase when current_phase does not match anything', () => {
  const state = {
    current_phase: 'Some phase name not present in phases[]',
    phases: [
      { number: '20', name: 'Done', status: 'complete' },
      { number: '35', name: 'Stale executing', status: 'executing' },
      { number: '42', name: 'Legacy executed alias', status: 'executed' },
      { number: '43', name: 'Newest', status: 'planned' },
    ],
  };
  const { activePhase, phaseLabel } = resolveActivePhase(state);
  assert.strictEqual(activePhase.number, '43');
  assert.strictEqual(phaseLabel, '43');
});

test('treats legacy status aliases (executed/completed/verified) as complete in the fallback', () => {
  const state = {
    current_phase: null,
    phases: [
      { number: '10', name: 'A', status: 'completed' },
      { number: '11', name: 'B', status: 'verified' },
      { number: '12', name: 'C', status: 'executed' },
      { number: '13', name: 'D', status: 'executing' },
    ],
  };
  const { activePhase } = resolveActivePhase(state);
  assert.strictEqual(activePhase.number, '13', 'should skip all complete-alias phases and land on the executing one');
});

test('returns null activePhase and current_phase as label when phases[] is empty', () => {
  const state = { current_phase: 'Some Phase', phases: [] };
  const { activePhase, phaseLabel } = resolveActivePhase(state);
  assert.strictEqual(activePhase, null);
  assert.strictEqual(phaseLabel, 'Some Phase');
});

test('returns nulls when state is entirely absent', () => {
  const { activePhase, phaseLabel } = resolveActivePhase(null);
  assert.strictEqual(activePhase, null);
  assert.strictEqual(phaseLabel, null);
});

test('when every phase is complete, falls back to null (no non-complete candidate)', () => {
  const state = {
    current_phase: null,
    phases: [
      { number: '1', name: 'A', status: 'complete' },
      { number: '2', name: 'B', status: 'executed' },
    ],
  };
  const { activePhase, phaseLabel } = resolveActivePhase(state);
  assert.strictEqual(activePhase, null);
  assert.strictEqual(phaseLabel, null);
});

test('module path sanity — resolveActivePhase is exported as a function', () => {
  assert.strictEqual(typeof resolveActivePhase, 'function');
  assert.ok(path.basename(require.resolve('../rcode/bin/lib/state-reader.cjs')) === 'state-reader.cjs');
});
