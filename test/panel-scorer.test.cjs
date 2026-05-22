/**
 * Tests for council-panel.cjs — selectPanel(), applyPriorityBoosts(),
 * and MARKET_TRIGGERS coverage for Roman Urdu inputs.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const {
  selectPanel,
  explainSelection,
  MARKET_TRIGGERS,
  normalize,
  applyPriorityBoosts,
  scoreAgent,
  AGENT_IDS,
} = require('../rcode/bin/lib/council-panel.cjs');

test('market question includes mariam', () => {
  const panel = selectPanel('what market opportunity exists in UAE for fintech');
  assert.ok(panel.includes('mariam'), `expected mariam in panel, got: ${panel.join(', ')}`);
});

test('greenfield question — bnanai dubai → mariam included', () => {
  const panel = selectPanel('affiliate site bnanai hai dubai ma');
  assert.ok(panel.includes('mariam'), `expected mariam in panel, got: ${panel.join(', ')}`);
});

test('Roman Urdu bug-report question → mariam in panel', () => {
  const panel = selectPanel('yar aik affiliate site bnanai hai research kar kai btao mai dubai ma kar skn');
  assert.ok(panel.includes('mariam'), `expected mariam in panel, got: ${panel.join(', ')}`);
});

test('codebase question includes waleed', () => {
  const panel = selectPanel('we need to refactor the auth service architecture');
  assert.ok(panel.includes('waleed'), `expected waleed in panel, got: ${panel.join(', ')}`);
});

test('codebase question does not require mariam', () => {
  // mariam may or may not appear but shouldn't lead
  const panel = selectPanel('fix the database migration bug in auth layer');
  assert.ok(panel.length >= 3, 'panel should have at least 3 agents');
  if (panel.includes('mariam')) {
    // If mariam appears, she should not be index 0 for a pure codebase question
    assert.notStrictEqual(panel[0], 'mariam', 'mariam should not lead codebase panels');
  }
});

test('--agents override bypasses scoring', () => {
  const panel = selectPanel('some question', { agents: ['waleed', 'fatima'] });
  assert.deepStrictEqual(panel, ['waleed', 'fatima']);
});

test('--full returns all agents', () => {
  const panel = selectPanel('any question', { full: true });
  assert.deepStrictEqual(panel, AGENT_IDS);
});

test('MARKET_TRIGGERS includes dubai', () => {
  assert.ok(MARKET_TRIGGERS.includes('dubai'), 'MARKET_TRIGGERS should include dubai');
});

test('MARKET_TRIGGERS includes affiliate', () => {
  assert.ok(MARKET_TRIGGERS.includes('affiliate'), 'MARKET_TRIGGERS should include affiliate');
});

test('MARKET_TRIGGERS includes bnanai', () => {
  assert.ok(MARKET_TRIGGERS.includes('bnanai'), 'MARKET_TRIGGERS should include bnanai');
});

test('mariam score boost fires for dubai question', () => {
  const normalized = normalize('affiliate site bnanai hai dubai ma');
  const scores = {};
  for (const id of AGENT_IDS) scores[id] = scoreAgent(id, normalized);
  applyPriorityBoosts(scores, normalized);
  assert.ok(scores.mariam >= 6, `mariam score should be >= 6, got ${scores.mariam}`);
});
