/**
 * Tests for rcode/skills/seo/seo-os/scripts/seo-page-opportunity-score.cjs —
 * the post-launch page opportunity score (spec §43), mirroring the shape of
 * seo-opportunity-score.cjs's tests.
 *
 * Run: node --test test/seo-page-opportunity-score.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'rcode', 'skills', 'seo', 'seo-os', 'scripts', 'seo-page-opportunity-score.cjs');
const { scorePageOpportunity, DEFAULT_WEIGHTS } = require(SCRIPT);

const FULL_MAX_SCORES = {
  impressionPotential: 20,
  positionGap: 20,
  ctrGap: 15,
  businessValue: 15,
  internalLinkDeficit: 10,
  contentGapDecay: 10,
  conversionPotential: 10,
};

test('DEFAULT_WEIGHTS sum to 100', () => {
  const total = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.strictEqual(total, 100);
});

test('DEFAULT_WEIGHTS mirror OPPORTUNITY-SCORING.md Part 2 1:1', () => {
  assert.deepStrictEqual(DEFAULT_WEIGHTS, {
    impressionPotential: 20,
    positionGap: 20,
    ctrGap: 15,
    businessValue: 15,
    internalLinkDeficit: 10,
    contentGapDecay: 10,
    conversionPotential: 10,
  });
});

test('a full-max score bands as "Top priority — act this cycle"', () => {
  const result = scorePageOpportunity({ project: 'acme', url: '/pricing', scores: FULL_MAX_SCORES });
  assert.strictEqual(result.total, 100);
  assert.strictEqual(result.band, 'Top priority — act this cycle');
  assert.strictEqual(result.url, '/pricing');
});

test('preserves evidence verbatim on a {value, evidence} score entry', () => {
  const result = scorePageOpportunity({
    url: '/calculator',
    scores: { ...FULL_MAX_SCORES, impressionPotential: { value: 20, evidence: '1,900 impressions/mo, position 10.7' } },
  });
  const row = result.breakdown.scores.find((r) => r.dimension === 'impressionPotential');
  assert.strictEqual(row.evidence, '1,900 impressions/mo, position 10.7');
});

test('a low score bands as "Low priority / monitor only"', () => {
  const result = scorePageOpportunity({
    url: '/low-value-page',
    scores: {
      impressionPotential: 2,
      positionGap: 2,
      ctrGap: 1,
      businessValue: 1,
      internalLinkDeficit: 1,
      contentGapDecay: 1,
      conversionPotential: 0,
    },
  });
  assert.strictEqual(result.total, 8);
  assert.strictEqual(result.band, 'Low priority / monitor only');
});

test('a config override changes weights/bands without mutating the module default', () => {
  const result = scorePageOpportunity({
    url: '/x',
    scores: { ...FULL_MAX_SCORES, impressionPotential: 30 },
    config: { weights: { impressionPotential: 30 }, bands: [{ min: 0, band: 'custom-band' }] },
  });
  assert.strictEqual(result.band, 'custom-band');
  assert.strictEqual(DEFAULT_WEIGHTS.impressionPotential, 20, 'module-level default must remain unmutated');
});

test('rejects a score above its dimension max', () => {
  assert.throws(
    () => scorePageOpportunity({ url: '/x', scores: { ...FULL_MAX_SCORES, impressionPotential: 21 } }),
    /out of range 0\.\.20/
  );
});

test('rejects a missing required dimension', () => {
  const { ctrGap, ...rest } = FULL_MAX_SCORES;
  assert.throws(() => scorePageOpportunity({ url: '/x', scores: rest }), /Missing required score dimension/);
});

test('rejects an unknown score dimension', () => {
  assert.throws(
    () => scorePageOpportunity({ url: '/x', scores: { ...FULL_MAX_SCORES, notReal: 1 } }),
    /Unknown score dimension/
  );
});

test('rejects a missing or empty url', () => {
  assert.throws(() => scorePageOpportunity({ scores: FULL_MAX_SCORES }), /non-empty "url"/);
  assert.throws(() => scorePageOpportunity({ url: '  ', scores: FULL_MAX_SCORES }), /non-empty "url"/);
});

test('rejects non-object input', () => {
  assert.throws(() => scorePageOpportunity(null), /Input must be a JSON object/);
});

test('CLI: reads an input file and prints the score as JSON', () => {
  const tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'seo-page-score-cli-')), 'input.json');
  fs.writeFileSync(tmpFile, JSON.stringify({ project: 'acme', url: '/pricing', scores: FULL_MAX_SCORES }));

  const result = spawnSync(process.execPath, [SCRIPT, tmpFile], { encoding: 'utf8' });

  assert.strictEqual(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.strictEqual(parsed.url, '/pricing');
  assert.strictEqual(parsed.total, 100);
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
