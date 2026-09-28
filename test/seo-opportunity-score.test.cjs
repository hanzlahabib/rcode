/**
 * Tests for rcode/skills/seo/seo-os/scripts/seo-opportunity-score.cjs —
 * the deterministic implementation of the weighted rubric documented in
 * rcode/skills/seo/seo-os/references/OPPORTUNITY-SCORING.md.
 *
 * Fixtures cover the spec's three headline scenarios (a 75+ strong
 * candidate, a 45-59 weak/experimental candidate, and a YMYL-penalty
 * example) plus boundary/invalid-input handling.
 *
 * Run: node --test test/seo-opportunity-score.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'rcode', 'skills', 'seo', 'seo-os', 'scripts', 'seo-opportunity-score.cjs');
const { scoreOpportunity, DEFAULT_WEIGHTS, DEFAULT_PENALTIES } = require(SCRIPT);

const FULL_MAX_SCORES = {
  intentFit: 20,
  serpOpportunity: 15,
  clickPotential: 15,
  commercialValue: 15,
  topicalExpansion: 10,
  utilityAdvantage: 10,
  authorityFeasibility: 5,
  domainFit: 5,
  technicalFeasibility: 5,
};

test('DEFAULT_WEIGHTS sum to 100 and DEFAULT_PENALTIES match the spec', () => {
  const totalWeight = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.strictEqual(totalWeight, 100);
  assert.strictEqual(DEFAULT_PENALTIES.trademarkImpersonationRisk, -40);
  assert.strictEqual(DEFAULT_PENALTIES.officialEntityDomination, -30);
});

test('strong candidate (75+) scenario bands as "strong candidate"', () => {
  const result = scoreOpportunity({
    project: 'strong-example',
    scores: {
      intentFit: { value: 18, evidence: 'SERP dominated by dedicated tools matching our build' },
      serpOpportunity: 13,
      clickPotential: 12,
      commercialValue: 13,
      topicalExpansion: 9,
      utilityAdvantage: 8,
      authorityFeasibility: 4,
      domainFit: 4,
      technicalFeasibility: 5,
    },
    riskFlags: [],
  });

  assert.strictEqual(result.subtotal, 86);
  assert.strictEqual(result.total, 86);
  assert.strictEqual(result.band, 'strong candidate');
  // Evidence must be preserved verbatim, not discarded.
  const intentRow = result.breakdown.scores.find((r) => r.dimension === 'intentFit');
  assert.strictEqual(intentRow.evidence, 'SERP dominated by dedicated tools matching our build');
});

test('weak/experimental (45-59) scenario bands correctly', () => {
  const result = scoreOpportunity({
    project: 'weak-example',
    scores: {
      intentFit: 10,
      serpOpportunity: 8,
      clickPotential: 7,
      commercialValue: 8,
      topicalExpansion: 5,
      utilityAdvantage: 4,
      authorityFeasibility: 2,
      domainFit: 3,
      technicalFeasibility: 3,
    },
    riskFlags: [],
  });

  assert.strictEqual(result.total, 50);
  assert.strictEqual(result.band, 'weak / experimental');
});

test('YMYL-penalty scenario: a strong subtotal is dragged down by risk penalties', () => {
  const result = scoreOpportunity({
    project: 'ymyl-example',
    scores: FULL_MAX_SCORES, // 100 subtotal — would be "strong candidate" with no risk
    riskFlags: [{ flag: 'ymylWithoutAuthority', evidence: 'Health-advice niche, zero topical authority yet' }, 'heavyZeroClickSerp'],
  });

  assert.strictEqual(result.subtotal, 100);
  assert.strictEqual(result.breakdown.rawTotal, 100 - 25 - 20);
  assert.strictEqual(result.total, 55);
  assert.strictEqual(result.band, 'weak / experimental');
  const ymylPenalty = result.breakdown.penalties.find((p) => p.flag === 'ymylWithoutAuthority');
  assert.strictEqual(ymylPenalty.amount, -25);
  assert.strictEqual(ymylPenalty.evidence, 'Health-advice niche, zero topical authority yet');
});

test('total is clamped at 0 when penalties exceed the subtotal', () => {
  const result = scoreOpportunity({
    scores: {
      intentFit: 2,
      serpOpportunity: 1,
      clickPotential: 1,
      commercialValue: 1,
      topicalExpansion: 1,
      utilityAdvantage: 1,
      authorityFeasibility: 1,
      domainFit: 1,
      technicalFeasibility: 1,
    },
    riskFlags: ['trademarkImpersonationRisk', 'officialEntityDomination'],
  });

  assert.strictEqual(result.subtotal, 10);
  assert.strictEqual(result.breakdown.rawTotal, 10 - 40 - 30);
  assert.strictEqual(result.total, 0);
  assert.strictEqual(result.band, 'normally skip');
});

test('a config override changes weights/penalties/bands without touching the defaults', () => {
  const result = scoreOpportunity({
    scores: { ...FULL_MAX_SCORES, intentFit: 30 },
    config: { weights: { intentFit: 30 }, bands: [{ min: 0, band: 'custom-band' }] },
  });
  assert.strictEqual(result.band, 'custom-band');
  assert.strictEqual(DEFAULT_WEIGHTS.intentFit, 20, 'module-level default must remain unmutated');
});

test('rejects a score above its dimension max', () => {
  assert.throws(
    () => scoreOpportunity({ scores: { ...FULL_MAX_SCORES, intentFit: 21 } }),
    /out of range 0\.\.20/
  );
});

test('rejects a missing required dimension', () => {
  const { intentFit, ...rest } = FULL_MAX_SCORES;
  assert.throws(() => scoreOpportunity({ scores: rest }), /Missing required score dimension/);
});

test('rejects an unknown score dimension', () => {
  assert.throws(
    () => scoreOpportunity({ scores: { ...FULL_MAX_SCORES, notARealDimension: 1 } }),
    /Unknown score dimension/
  );
});

test('rejects an unknown risk flag', () => {
  assert.throws(
    () => scoreOpportunity({ scores: FULL_MAX_SCORES, riskFlags: ['madeUpFlag'] }),
    /Unknown riskFlags entry/
  );
});

test('rejects NaN and Infinity scores instead of silently propagating them', () => {
  assert.throws(
    () => scoreOpportunity({ scores: { ...FULL_MAX_SCORES, intentFit: NaN } }),
    /scores\.intentFit must be a finite number/
  );
  assert.throws(
    () => scoreOpportunity({ scores: { ...FULL_MAX_SCORES, intentFit: Infinity } }),
    /scores\.intentFit must be a finite number/
  );
  assert.throws(
    () => scoreOpportunity({ scores: { ...FULL_MAX_SCORES, intentFit: { value: NaN } } }),
    /scores\.intentFit must be a finite number/
  );
});

test('rejects non-object input', () => {
  assert.throws(() => scoreOpportunity(null), /Input must be a JSON object/);
  assert.throws(() => scoreOpportunity('nope'), /Input must be a JSON object/);
});

test('CLI: reads an input file and prints the score as JSON', () => {
  const tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'seo-score-cli-')), 'input.json');
  fs.writeFileSync(tmpFile, JSON.stringify({ project: 'cli-example', scores: FULL_MAX_SCORES }));

  const result = spawnSync(process.execPath, [SCRIPT, tmpFile], { encoding: 'utf8' });

  assert.strictEqual(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.strictEqual(parsed.project, 'cli-example');
  assert.strictEqual(parsed.total, 100);
  assert.strictEqual(parsed.band, 'strong candidate');
});

test('CLI: exits non-zero with a clear message on missing input file', () => {
  const result = spawnSync(process.execPath, [SCRIPT, path.join(os.tmpdir(), 'does-not-exist.json')], { encoding: 'utf8' });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Input file not found/);
});

test('CLI: exits non-zero with a clear message when no input path is given', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
});
