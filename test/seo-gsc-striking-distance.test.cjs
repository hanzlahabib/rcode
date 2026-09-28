/**
 * Tests for rcode/skills/seo/seo-os/scripts/seo-gsc-striking-distance.cjs.
 *
 * Covers threshold edges (position band boundaries, minImpressions boundary,
 * ctrGapRatio), sort-by-impressions + topN truncation (token efficiency),
 * empty-data handling, and CLI schema validation.
 *
 * Run: node --test test/seo-gsc-striking-distance.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'rcode', 'skills', 'seo', 'seo-os', 'scripts', 'seo-gsc-striking-distance.cjs');
const { analyzeStrikingDistance, expectedCtrForPosition, DEFAULT_CONFIG } = require(SCRIPT);

function makeTempFile(name, obj) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-striking-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(obj));
  return file;
}

test('position band boundaries are inclusive (positionMin and positionMax both qualify)', () => {
  const rows = [
    { query: 'at-min', clicks: 1, impressions: 100, ctr: 0.5, position: 8 },
    { query: 'at-max', clicks: 1, impressions: 100, ctr: 0.5, position: 20 },
    { query: 'below-min', clicks: 1, impressions: 100, ctr: 0.5, position: 7.9 },
    { query: 'above-max', clicks: 1, impressions: 100, ctr: 0.5, position: 20.1 },
  ];
  const result = analyzeStrikingDistance(rows, {});
  const queries = result.strikingDistance.map((r) => r.query).sort();
  assert.deepStrictEqual(queries, ['at-max', 'at-min']);
});

test('minImpressions boundary is inclusive', () => {
  const rows = [
    { query: 'exact', clicks: 1, impressions: 10, ctr: 0.5, position: 10 },
    { query: 'below', clicks: 1, impressions: 9, ctr: 0.5, position: 10 },
  ];
  const result = analyzeStrikingDistance(rows, { minImpressions: 10 });
  assert.deepStrictEqual(result.strikingDistance.map((r) => r.query), ['exact']);
});

test('thresholds are configurable, not hard-coded universal 100-impression floor', () => {
  const rows = [{ query: 'low-volume-niche', clicks: 1, impressions: 3, ctr: 0.5, position: 12 }];
  const result = analyzeStrikingDistance(rows, { minImpressions: 3 });
  assert.strictEqual(result.strikingDistance.length, 1);
});

test('ctrGaps flags a query whose CTR is well below the expected curve', () => {
  const rows = [{ query: 'weak-ctr', clicks: 0, impressions: 500, ctr: 0.001, position: 3 }];
  // expected CTR at position 3 is 0.11; ratio 0.5 -> threshold 0.055; 0.001 is well under it
  const result = analyzeStrikingDistance(rows, { minImpressions: 10, ctrGapRatio: 0.5 });
  assert.strictEqual(result.ctrGaps.length, 1);
  assert.strictEqual(result.ctrGaps[0].query, 'weak-ctr');
});

test('ctrGaps does not flag a query with a healthy CTR', () => {
  const rows = [{ query: 'healthy-ctr', clicks: 50, impressions: 500, ctr: 0.15, position: 3 }];
  const result = analyzeStrikingDistance(rows, { minImpressions: 10, ctrGapRatio: 0.5 });
  assert.strictEqual(result.ctrGaps.length, 0);
});

test('expectedCtrForPosition clamps to the position-20 value beyond position 20', () => {
  const table = DEFAULT_CONFIG.ctrByPosition;
  assert.strictEqual(expectedCtrForPosition(45, table), table[20]);
  assert.strictEqual(expectedCtrForPosition(1, table), table[1]);
});

test('results are sorted by impressions descending and truncated to topN', () => {
  const rows = [
    { query: 'low', clicks: 1, impressions: 10, ctr: 0.5, position: 10 },
    { query: 'high', clicks: 1, impressions: 1000, ctr: 0.5, position: 10 },
    { query: 'mid', clicks: 1, impressions: 100, ctr: 0.5, position: 10 },
  ];
  const result = analyzeStrikingDistance(rows, { minImpressions: 1, topN: 2 });
  assert.deepStrictEqual(result.strikingDistance.map((r) => r.query), ['high', 'mid']);
});

test('empty rows produce empty results, not an error', () => {
  const result = analyzeStrikingDistance([], {});
  assert.deepStrictEqual(result.strikingDistance, []);
  assert.deepStrictEqual(result.ctrGaps, []);
  assert.deepStrictEqual(result.cannibalization, []);
});

test('page is null on candidates when the input rows carry no page field', () => {
  const rows = [{ query: 'best crm', clicks: 1, impressions: 100, ctr: 0.5, position: 10 }];
  const result = analyzeStrikingDistance(rows, {});
  assert.strictEqual(result.strikingDistance[0].page, null);
  assert.deepStrictEqual(result.cannibalization, []);
});

test('page passes through to strikingDistance and ctrGaps candidates when present', () => {
  const rows = [{ query: 'best crm', clicks: 1, impressions: 100, ctr: 0.001, position: 10, page: '/crm' }];
  const result = analyzeStrikingDistance(rows, { minImpressions: 10 });
  assert.strictEqual(result.strikingDistance[0].page, '/crm');
  assert.strictEqual(result.ctrGaps[0].page, '/crm');
});

test('flags cannibalization when a query has rows for more than one distinct page', () => {
  const rows = [
    { query: 'best crm', clicks: 5, impressions: 300, ctr: 0.02, position: 6, page: '/crm-a' },
    { query: 'best crm', clicks: 2, impressions: 150, ctr: 0.01, position: 12, page: '/crm-b' },
    { query: 'unique query', clicks: 1, impressions: 50, ctr: 0.02, position: 9, page: '/only-page' },
  ];
  const result = analyzeStrikingDistance(rows, {});
  assert.strictEqual(result.cannibalization.length, 1);
  assert.strictEqual(result.cannibalization[0].query, 'best crm');
  assert.strictEqual(result.cannibalization[0].totalImpressions, 450);
  assert.deepStrictEqual(
    result.cannibalization[0].pages.map((p) => p.page),
    ['/crm-a', '/crm-b']
  );
});

test('does not flag cannibalization for a single-page query', () => {
  const rows = [{ query: 'best crm', clicks: 5, impressions: 300, ctr: 0.02, position: 6, page: '/crm-a' }];
  const result = analyzeStrikingDistance(rows, {});
  assert.deepStrictEqual(result.cannibalization, []);
});

test('a blank page string does not count toward cannibalization grouping', () => {
  const rows = [
    { query: 'best crm', clicks: 5, impressions: 300, ctr: 0.02, position: 6, page: '' },
    { query: 'best crm', clicks: 2, impressions: 150, ctr: 0.01, position: 12, page: '' },
  ];
  const result = analyzeStrikingDistance(rows, {});
  assert.deepStrictEqual(result.cannibalization, []);
});

test('CLI: end-to-end from a normalized gsc-queries JSON file', () => {
  const inputFile = makeTempFile('normalized.json', {
    schema: 'gsc-queries',
    rows: [{ query: 'best crm', clicks: 5, impressions: 200, ctr: 0.02, position: 9 }],
    validCount: 1,
    skipped: [],
    warnings: [],
  });

  const result = spawnSync(process.execPath, [SCRIPT, inputFile, '--positionMin=8', '--positionMax=20', '--minImpressions=10'], {
    encoding: 'utf8',
  });

  assert.strictEqual(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.strictEqual(parsed.strikingDistance.length, 1);
  assert.strictEqual(parsed.config.positionMin, 8);
});

test('CLI: rejects input with the wrong schema', () => {
  const inputFile = makeTempFile('wrong-schema.json', { schema: 'gsc-pages', rows: [] });
  const result = spawnSync(process.execPath, [SCRIPT, inputFile], { encoding: 'utf8' });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /schema "gsc-queries"/);
});

test('CLI: exits non-zero with a clear message on missing input file', () => {
  const result = spawnSync(process.execPath, [SCRIPT, path.join(os.tmpdir(), 'does-not-exist.json')], { encoding: 'utf8' });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Input file not found/);
});
