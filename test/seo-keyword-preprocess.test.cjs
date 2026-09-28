/**
 * Tests for rcode/skills/seo/seo-os/scripts/seo-keyword-preprocess.cjs.
 *
 * Covers exact/variant duplicate removal, candidate grouping (shared URL +
 * token overlap), the intent-divergence hard boundary (flagged, not
 * merged), missing-metric handling (never zero-filled), lossless member
 * preservation, malformed-input fail-loud behavior, and a 5,000-row
 * synthetic performance run.
 *
 * Run: node --test test/seo-keyword-preprocess.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'rcode', 'skills', 'seo', 'seo-os', 'scripts', 'seo-keyword-preprocess.cjs');
const {
  preprocessKeywords,
  dedupeKeywords,
  buildCandidateGroups,
  assembleGroups,
  jaccardSimilarity,
  tokenize,
  normalizeKeywordText,
  sumDefined,
  DEFAULT_OPTIONS,
} = require(SCRIPT);

function row(keyword, overrides = {}) {
  return {
    keyword,
    volume: 100,
    difficulty: 20,
    cpc: 1,
    position: 10,
    url: '',
    serpFeatures: '',
    parentTopic: '',
    country: 'us',
    ...overrides,
  };
}

function makeTempFile(name, obj) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-kw-preprocess-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(obj));
  return file;
}

// --- normalization / dedup -------------------------------------------------

test('exact duplicate rows are merged into one unit', () => {
  const rows = [row('running shoes'), row('running shoes')];
  const { units, duplicatesRemoved } = dedupeKeywords(rows);
  assert.strictEqual(units.length, 1);
  assert.strictEqual(duplicatesRemoved, 1);
  assert.strictEqual(units[0].variants.length, 2);
});

test('case and whitespace variants collapse to one unit', () => {
  const rows = [row('Running Shoes'), row('running   shoes'), row('  running shoes  ')];
  const { units, duplicatesRemoved } = dedupeKeywords(rows);
  assert.strictEqual(units.length, 1);
  assert.strictEqual(duplicatesRemoved, 2);
});

test('hyphen and space are treated as the same formatting variant', () => {
  assert.strictEqual(normalizeKeywordText('e-bike'), normalizeKeywordText('e bike'));
  const rows = [row('e-bike'), row('e bike')];
  const { units } = dedupeKeywords(rows);
  assert.strictEqual(units.length, 1);
});

test('dedup aggregation: volume/difficulty/cpc take max, position takes min, never zero-filled', () => {
  const rows = [
    row('running shoes', { volume: 100, difficulty: 20, cpc: 1, position: 12 }),
    row('Running Shoes', { volume: 150, difficulty: 25, cpc: 0.5, position: 8 }),
  ];
  const { units } = dedupeKeywords(rows);
  assert.strictEqual(units[0].metrics.volume, 150);
  assert.strictEqual(units[0].metrics.difficulty, 25);
  assert.strictEqual(units[0].metrics.cpc, 1);
  assert.strictEqual(units[0].metrics.position, 8);
});

// --- candidate grouping: token overlap -------------------------------------

test('"running shoes for flat feet" and "best running shoes for flat feet" land in the same candidate group', () => {
  const rows = [row('running shoes for flat feet'), row('best running shoes for flat feet')];
  const result = preprocessKeywords(rows, { full: true });
  assert.strictEqual(result.candidateGroups.length, 1);
  const group = result.candidateGroups[0];
  assert.strictEqual(group.memberCount, 2);
  assert.ok(group.memberKeywords.includes('running shoes for flat feet'));
  assert.ok(group.memberKeywords.includes('best running shoes for flat feet'));
});

test('"running shoes for flat feet" and "flat feet exercises" are NOT merged (low token overlap, different intent)', () => {
  const rows = [row('running shoes for flat feet'), row('flat feet exercises')];
  const result = preprocessKeywords(rows, { full: true });
  assert.strictEqual(result.candidateGroups.length, 0);
  assert.strictEqual(result.singletons.length, 2);
});

test('"how to calculate mortgage" and "mortgage rates" are NOT merged (low token overlap)', () => {
  const rows = [row('how to calculate mortgage'), row('mortgage rates')];
  const result = preprocessKeywords(rows, { full: true });
  assert.strictEqual(result.candidateGroups.length, 0);
});

test('high token overlap but diverging intent cue ("jobs") is flagged, not silently merged', () => {
  const rows = [row('mortgage calculator'), row('mortgage calculator jobs')];
  const result = preprocessKeywords(rows, { full: true });
  assert.strictEqual(result.candidateGroups.length, 0, 'must not merge across a diverging intent cue');
  assert.strictEqual(result.flaggedPairs.length, 1);
  assert.ok(result.flaggedPairs[0].divergingCues.includes('jobs'));
  const keywords = [result.flaggedPairs[0].keywordA, result.flaggedPairs[0].keywordB].sort();
  assert.deepStrictEqual(keywords, ['mortgage calculator', 'mortgage calculator jobs'].sort());
});

test('jaccardSimilarity is symmetric and bounded [0,1]', () => {
  const a = tokenize(normalizeKeywordText('running shoes flat feet'));
  const b = tokenize(normalizeKeywordText('best running shoes flat feet'));
  const sim = jaccardSimilarity(a, b);
  assert.ok(sim >= 0 && sim <= 1);
  assert.strictEqual(sim, jaccardSimilarity(b, a));
});

// --- candidate grouping: shared ranking URL --------------------------------

test('shared ranking URL groups two otherwise-dissimilar keywords', () => {
  const rows = [
    row('best crm software', { url: '/blog/crm-software' }),
    row('top rated crm tools', { url: '/blog/crm-software' }),
  ];
  const result = preprocessKeywords(rows, { full: true });
  assert.strictEqual(result.candidateGroups.length, 1);
  const group = result.candidateGroups[0];
  assert.strictEqual(group.memberCount, 2);
  assert.deepStrictEqual(group.signals.sharedUrls, ['/blog/crm-software']);
  assert.strictEqual(group.confidence, 'high');
});

test('shared URL group with a diverging cue is still grouped but flagged intent-divergence-risk', () => {
  const rows = [
    row('crm software price', { url: '/blog/crm' }),
    row('crm software', { url: '/blog/crm' }),
  ];
  const result = preprocessKeywords(rows, { full: true });
  assert.strictEqual(result.candidateGroups.length, 1);
  const group = result.candidateGroups[0];
  assert.strictEqual(group.confidence, 'low');
  assert.ok(group.flags.some((f) => f.includes('intent-divergence-risk')));
});

// --- missing metrics --------------------------------------------------------

test('sumDefined never zero-fills a missing value and reports missingCount', () => {
  const result = sumDefined([100, null, undefined, 50, NaN]);
  assert.strictEqual(result.value, 150);
  assert.strictEqual(result.missingCount, 3);
});

test('sumDefined returns null (not 0) when every value is missing', () => {
  const result = sumDefined([null, undefined]);
  assert.strictEqual(result.value, null);
  assert.strictEqual(result.missingCount, 2);
});

test('group aggregation flags volumeIncomplete instead of zero-filling a missing member volume', () => {
  // volume/difficulty/cpc/position are REQUIRED by the ahrefs-organic-keywords
  // schema, so preprocessKeywords()'s validateRows() correctly fails loud on a
  // null volume (see the "throws on a row with a non-numeric volume" test
  // above) — a real seo-csv-normalize.cjs export can never produce one. This
  // test instead drives the internal pipeline directly (dedupeKeywords ->
  // buildCandidateGroups -> assembleGroups, which do NOT re-validate) to prove
  // the aggregation helper itself is defensively correct — never zero-fills —
  // independent of the input-validation gate.
  const rows = [
    row('best crm software', { volume: 500, url: '/blog/crm' }),
    row('top crm software', { volume: null, url: '/blog/crm' }),
  ];
  const { units } = dedupeKeywords(rows);
  const { dsu, edgeSignals } = buildCandidateGroups(units, DEFAULT_OPTIONS);
  const { groups } = assembleGroups(units, dsu, edgeSignals);
  assert.strictEqual(groups.length, 1);
  assert.strictEqual(groups[0].aggregated.totalVolume, 500);
  assert.strictEqual(groups[0].aggregated.volumeIncomplete, true);
});

// --- lossless preservation --------------------------------------------------

test('every original keyword is preserved across groups + singletons with full:true', () => {
  const rows = [
    row('running shoes for flat feet', { volume: 200 }),
    row('best running shoes for flat feet', { volume: 90 }),
    row('flat feet exercises', { volume: 300 }),
    row('Flat Feet Exercises'), // case variant of the row above
  ];
  const result = preprocessKeywords(rows, { full: true });

  const recovered = [];
  for (const g of result.candidateGroups) {
    for (const member of g.members) {
      for (const variant of member.variants) recovered.push(variant.keyword);
    }
  }
  for (const s of result.singletons) {
    for (const variant of s.members) recovered.push(variant.keyword);
  }

  assert.deepStrictEqual(
    recovered.sort(),
    ['running shoes for flat feet', 'best running shoes for flat feet', 'flat feet exercises', 'Flat Feet Exercises'].sort()
  );
});

test('default (compact) output omits full member metrics but keeps memberKeywords', () => {
  const rows = [row('running shoes for flat feet'), row('best running shoes for flat feet')];
  const result = preprocessKeywords(rows); // full defaults to false
  const json = JSON.parse(JSON.stringify(result));
  assert.strictEqual(json.candidateGroups[0].members, undefined);
  assert.strictEqual(json.candidateGroups[0].memberKeywords.length, 2);
});

// --- malformed input fails loud ---------------------------------------------

test('throws on a row missing the keyword field', () => {
  const rows = [{ volume: 1, difficulty: 1, cpc: 1, position: 1 }];
  assert.throws(() => preprocessKeywords(rows), /missing a non-empty "keyword"/);
});

test('throws on a row with a non-numeric volume', () => {
  const rows = [row('shoes', { volume: 'lots' })];
  assert.throws(() => preprocessKeywords(rows), /missing\/invalid "volume"/);
});

test('throws when rows is not an array', () => {
  assert.throws(() => preprocessKeywords({ not: 'an array' }), /expects rows to be an array/);
});

test('CLI: rejects input with the wrong schema', () => {
  const inputFile = makeTempFile('wrong-schema.json', { schema: 'gsc-queries', rows: [] });
  const result = spawnSync(process.execPath, [SCRIPT, inputFile], { encoding: 'utf8' });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /schema "ahrefs-organic-keywords"/);
});

test('CLI: exits non-zero with a clear message on missing input file', () => {
  const result = spawnSync(process.execPath, [SCRIPT, path.join(os.tmpdir(), 'does-not-exist.json')], { encoding: 'utf8' });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Input file not found/);
});

// --- CLI end-to-end ----------------------------------------------------------

test('CLI: end-to-end from a normalized ahrefs-organic-keywords JSON file', () => {
  const inputFile = makeTempFile('normalized.json', {
    schema: 'ahrefs-organic-keywords',
    rows: [row('running shoes for flat feet'), row('best running shoes for flat feet')],
    validCount: 2,
    skipped: [],
    warnings: [],
  });

  const result = spawnSync(process.execPath, [SCRIPT, inputFile, '--jaccardThreshold=0.5'], { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.strictEqual(parsed.candidateGroups.length, 1);
  assert.strictEqual(parsed.candidateGroups[0].members, undefined, 'default CLI output stays compact');
});

test('CLI: --full includes inline member metrics', () => {
  const inputFile = makeTempFile('normalized-full.json', {
    schema: 'ahrefs-organic-keywords',
    rows: [row('running shoes for flat feet'), row('best running shoes for flat feet')],
    validCount: 2,
    skipped: [],
    warnings: [],
  });

  const result = spawnSync(process.execPath, [SCRIPT, inputFile, '--full'], { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.ok(Array.isArray(parsed.candidateGroups[0].members));
  assert.strictEqual(parsed.candidateGroups[0].members.length, 2);
});

// --- performance -------------------------------------------------------------

test('5,000-row synthetic export processes in well under 2s with compact output', () => {
  const topics = ['crm software', 'project management tool', 'email marketing platform', 'invoice generator', 'seo audit tool'];
  const modifiers = ['best', 'top rated', 'affordable', 'for small business', 'reviews 2026'];
  const rows = [];
  for (let i = 0; i < 5000; i += 1) {
    const topic = topics[i % topics.length];
    const modifier = modifiers[Math.floor(i / topics.length) % modifiers.length];
    // Every ~7th row is an exact-case-variant duplicate to exercise dedup at scale.
    const keyword = i % 7 === 0 ? `${modifier} ${topic}`.toUpperCase() : `${modifier} ${topic} ${i}`;
    rows.push(
      row(keyword, {
        volume: 50 + (i % 500),
        difficulty: 10 + (i % 90),
        cpc: Number((0.5 + (i % 10) / 2).toFixed(2)),
        position: 1 + (i % 50),
      })
    );
  }

  const start = Date.now();
  const result = preprocessKeywords(rows);
  const elapsedMs = Date.now() - start;

  assert.strictEqual(result.summary.totalInputRows, 5000);
  assert.ok(elapsedMs < 2000, `expected < 2000ms, got ${elapsedMs}ms`);

  const compactSize = JSON.stringify(result).length;
  assert.ok(compactSize < 200000, `expected compact output well under 200KB, got ${compactSize} bytes`);
});
