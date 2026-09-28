/**
 * Tests for rcode/skills/seo/seo-os/scripts/seo-csv-normalize.cjs.
 *
 * Covers header-alias mapping (case/whitespace-insensitive), numeric parsing
 * rules (thousands separators, percent CTR, bare-fraction CTR), malformed
 * input handling (missing required header/field, invalid numeric, column
 * count mismatch), and empty-data edge cases.
 *
 * Run: node --test test/seo-csv-normalize.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'rcode', 'skills', 'seo', 'seo-os', 'scripts', 'seo-csv-normalize.cjs');
const { normalizeCsv, parseNumericField } = require(SCRIPT);

function makeTempFile(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-csv-normalize-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}

test('gsc-queries: alias headers map case/whitespace-insensitively', () => {
  const csv = 'Top Queries,Clicks,Impressions,CTR,Position\nbest crm,10,200,5%,4.2\n';
  const result = normalizeCsv('gsc-queries', csv);
  assert.strictEqual(result.validCount, 1);
  assert.deepStrictEqual(result.rows[0], { query: 'best crm', clicks: 10, impressions: 200, ctr: 0.05, position: 4.2 });
  assert.deepStrictEqual(result.skipped, []);
});

test('gsc-queries: optional "page" column via Page/Landing Page/URL aliases', () => {
  for (const header of ['Page', 'Landing Page', 'URL']) {
    const csv = `Query,Clicks,Impressions,CTR,Position,${header}\nbest crm,10,200,5%,4.2,/pricing\n`;
    const result = normalizeCsv('gsc-queries', csv);
    assert.strictEqual(result.validCount, 1);
    assert.strictEqual(result.rows[0].page, '/pricing');
  }
});

test('gsc-queries: works without a page column at all (page stays absent, not an error)', () => {
  const csv = 'Top Queries,Clicks,Impressions,CTR,Position\nbest crm,10,200,5%,4.2\n';
  const result = normalizeCsv('gsc-queries', csv);
  assert.strictEqual(result.validCount, 1);
  assert.strictEqual(result.rows[0].page, undefined);
});

test('gsc-pages: "Page" alias maps to canonical "page"', () => {
  const csv = 'Page,Clicks,Impressions,CTR,Position\n/pricing,3,50,1.5%,9.1\n';
  const result = normalizeCsv('gsc-pages', csv);
  assert.strictEqual(result.rows[0].page, '/pricing');
});

test('ahrefs-organic-keywords: KD/Current URL/Current position aliases', () => {
  const csv = 'Keyword,Volume,KD,CPC,Current position,Current URL,SERP Features,Parent Topic,Country\n' +
    'best payroll software,1200,45,8.50,6.3,/payroll,Sitelinks,payroll,us\n';
  const result = normalizeCsv('ahrefs-organic-keywords', csv);
  assert.strictEqual(result.validCount, 1);
  assert.deepStrictEqual(result.rows[0], {
    keyword: 'best payroll software',
    volume: 1200,
    difficulty: 45,
    cpc: 8.5,
    position: 6.3,
    url: '/payroll',
    serpFeatures: 'Sitelinks',
    parentTopic: 'payroll',
    country: 'us',
  });
});

test('ahrefs-organic-keywords: blank optional fields (serpFeatures/parentTopic/country) do not fail the row', () => {
  const csv = 'Keyword,Volume,KD,CPC,Position,URL,SERP Features,Parent Topic,Country\n' +
    'best payroll software,1200,45,8.50,6.3,/payroll,,,\n';
  const result = normalizeCsv('ahrefs-organic-keywords', csv);
  assert.strictEqual(result.validCount, 1);
  assert.strictEqual(result.rows[0].serpFeatures, '');
  assert.strictEqual(result.rows[0].parentTopic, '');
});

test('numeric parsing: thousands separator is stripped', () => {
  assert.strictEqual(parseNumericField('1,234', false), 1234);
  assert.strictEqual(parseNumericField('12,345.5', false), 12345.5);
});

test('numeric parsing: percent CTR divides by 100; bare CTR is already a fraction', () => {
  assert.strictEqual(parseNumericField('0.8%', true), 0.008);
  assert.ok(Math.abs(parseNumericField('12.3%', true) - 0.123) < 1e-9);
  assert.strictEqual(parseNumericField('0.008', true), 0.008);
});

test('numeric parsing: a % sign on a non-CTR field is malformed', () => {
  assert.ok(Number.isNaN(parseNumericField('5%', false)));
});

test('numeric parsing: non-numeric garbage is NaN, not silently coerced', () => {
  assert.ok(Number.isNaN(parseNumericField('N/A', false)));
  assert.ok(Number.isNaN(parseNumericField('', false)));
});

test('a row with an invalid numeric value is skipped with a reason, not guessed', () => {
  const csv = 'Query,Clicks,Impressions,CTR,Position\nbroken row,abc,200,5%,4\n';
  const result = normalizeCsv('gsc-queries', csv);
  assert.strictEqual(result.validCount, 0);
  assert.strictEqual(result.skipped.length, 1);
  assert.strictEqual(result.skipped[0].line, 2);
  assert.match(result.skipped[0].reason, /invalid numeric value for "clicks"/);
});

test('a row with a missing required field is skipped with a reason', () => {
  const csv = 'Query,Clicks,Impressions,CTR,Position\n,10,200,5%,4\n';
  const result = normalizeCsv('gsc-queries', csv);
  assert.strictEqual(result.validCount, 0);
  assert.match(result.skipped[0].reason, /missing required field "query"/);
});

test('a row with mismatched column count is skipped, not misaligned', () => {
  const csv = 'Query,Clicks,Impressions,CTR,Position\nonly,three,cols\n';
  const result = normalizeCsv('gsc-queries', csv);
  assert.strictEqual(result.validCount, 0);
  assert.match(result.skipped[0].reason, /column\(s\), header has 5/);
});

test('an unmapped extra column is reported as a warning, not silently dropped without trace', () => {
  const csv = 'Query,Clicks,Impressions,CTR,Position,Extra Column\nq,1,2,1%,3,ignored\n';
  const result = normalizeCsv('gsc-queries', csv);
  assert.strictEqual(result.validCount, 1);
  assert.ok(result.warnings.some((w) => w.includes('Extra Column')));
});

test('a header missing a required field fails loudly at the header level', () => {
  const csv = 'Query,Clicks,Impressions\nq,1,2\n';
  assert.throws(() => normalizeCsv('gsc-queries', csv), /missing required field\(s\): ctr, position/);
});

test('an unknown schema name fails loudly', () => {
  assert.throws(() => normalizeCsv('not-a-real-schema', 'a,b\n1,2\n'), /Unknown schema/);
});

test('an entirely empty CSV (no header) fails loudly', () => {
  assert.throws(() => normalizeCsv('gsc-queries', ''), /no rows/);
});

test('a CSV with only a header and zero data rows normalizes to an empty result, not an error', () => {
  const csv = 'Query,Clicks,Impressions,CTR,Position\n';
  const result = normalizeCsv('gsc-queries', csv);
  assert.strictEqual(result.validCount, 0);
  assert.deepStrictEqual(result.rows, []);
  assert.deepStrictEqual(result.skipped, []);
});

test('CLI: reads a CSV file and prints normalized JSON, and writes it to --out', () => {
  const csvFile = makeTempFile('in.csv', 'Query,Clicks,Impressions,CTR,Position\nbest crm,10,200,5%,4.2\n');
  const outFile = path.join(path.dirname(csvFile), 'out.json');

  const result = spawnSync(process.execPath, [SCRIPT, `--schema=gsc-queries`, csvFile, `--out=${outFile}`], { encoding: 'utf8' });

  assert.strictEqual(result.status, 0, result.stderr);
  const stdoutJson = JSON.parse(result.stdout);
  assert.strictEqual(stdoutJson.validCount, 1);
  const fileJson = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  assert.deepStrictEqual(fileJson, stdoutJson);
});

test('CLI: exits non-zero with a clear message when --schema is missing', () => {
  const csvFile = makeTempFile('in2.csv', 'a,b\n1,2\n');
  const result = spawnSync(process.execPath, [SCRIPT, csvFile], { encoding: 'utf8' });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
});

test('CLI: exits non-zero with a clear message on missing input file', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--schema=gsc-queries', path.join(os.tmpdir(), 'does-not-exist.csv')], {
    encoding: 'utf8',
  });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Input file not found/);
});
