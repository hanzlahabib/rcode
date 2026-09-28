/**
 * Tests for rcode/skills/seo/seo-os/scripts/seo-gsc-decay.cjs.
 *
 * Covers period-over-period join-by-page, decline-threshold edges, the
 * zero-baseline and missing-baseline skip cases, metric switching, and that
 * hypothesis fields are never pre-guessed.
 *
 * Run: node --test test/seo-gsc-decay.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(PROJECT_ROOT, 'rcode', 'skills', 'seo', 'seo-os', 'scripts', 'seo-gsc-decay.cjs');
const { analyzeDecay, HYPOTHESIS_FIELDS } = require(SCRIPT);

function makeTempFile(name, obj) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-decay-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(obj));
  return file;
}

test('flags a page as decaying when the decline exceeds the threshold', () => {
  const current = [{ page: '/a', clicks: 40, impressions: 500, ctr: 0.08, position: 5 }];
  const prior = [{ page: '/a', clicks: 100, impressions: 500, ctr: 0.2, position: 5 }];
  const result = analyzeDecay(current, prior, { declineThreshold: -0.2, metric: 'clicks' });
  assert.strictEqual(result.decaying.length, 1);
  assert.strictEqual(result.decaying[0].page, '/a');
  assert.strictEqual(result.decaying[0].deltaRatio, -0.6);
});

test('decline-threshold boundary is inclusive (exactly at threshold counts as decaying)', () => {
  const current = [{ page: '/a', clicks: 80, impressions: 100, ctr: 0.1, position: 5 }];
  const prior = [{ page: '/a', clicks: 100, impressions: 100, ctr: 0.1, position: 5 }];
  // deltaRatio = -0.2 exactly
  const result = analyzeDecay(current, prior, { declineThreshold: -0.2, metric: 'clicks' });
  assert.strictEqual(result.decaying.length, 1);
  assert.strictEqual(result.improving.length, 0);
});

test('a small decline that does not cross the threshold is neither decaying nor improving', () => {
  const current = [{ page: '/a', clicks: 95, impressions: 100, ctr: 0.1, position: 5 }];
  const prior = [{ page: '/a', clicks: 100, impressions: 100, ctr: 0.1, position: 5 }];
  const result = analyzeDecay(current, prior, { declineThreshold: -0.2, metric: 'clicks' });
  assert.strictEqual(result.decaying.length, 0);
  assert.strictEqual(result.improving.length, 0);
});

test('flags a page as improving when the metric increased', () => {
  const current = [{ page: '/a', clicks: 150, impressions: 100, ctr: 0.1, position: 5 }];
  const prior = [{ page: '/a', clicks: 100, impressions: 100, ctr: 0.1, position: 5 }];
  const result = analyzeDecay(current, prior, {});
  assert.strictEqual(result.improving.length, 1);
  assert.strictEqual(result.improving[0].deltaRatio, 0.5);
});

test('a page with a zero prior baseline is skipped (no meaningful percentage delta)', () => {
  const current = [{ page: '/a', clicks: 10, impressions: 100, ctr: 0.1, position: 5 }];
  const prior = [{ page: '/a', clicks: 0, impressions: 100, ctr: 0.1, position: 5 }];
  const result = analyzeDecay(current, prior, {});
  assert.strictEqual(result.decaying.length, 0);
  assert.strictEqual(result.improving.length, 0);
});

test('a page present only in current (no prior baseline) is skipped, not flagged', () => {
  const current = [{ page: '/new-page', clicks: 10, impressions: 100, ctr: 0.1, position: 5 }];
  const prior = [];
  const result = analyzeDecay(current, prior, {});
  assert.strictEqual(result.decaying.length, 0);
  assert.strictEqual(result.improving.length, 0);
});

test('a page present only in prior (absent from the current export) is skipped, not flagged as a 100% decay', () => {
  // Deliberately NOT auto-flagged as "went to zero" — a page missing from the
  // current export could mean genuinely zero traffic, or just fell outside
  // an export's row cutoff (e.g. GSC UI export size limits). Fabricating a
  // -100% delta from an absence would be exactly the kind of guess this
  // script's design avoids; that determination belongs to a content-
  // inventory/sitemap comparison, not this period-over-period join.
  const current = [];
  const prior = [{ page: '/dropped-page', clicks: 500, impressions: 5000, ctr: 0.1, position: 5 }];
  const result = analyzeDecay(current, prior, {});
  assert.strictEqual(result.decaying.length, 0);
  assert.strictEqual(result.improving.length, 0);
});

test('metric flag switches the comparison field between clicks and impressions', () => {
  const current = [{ page: '/a', clicks: 100, impressions: 40, ctr: 0.1, position: 5 }];
  const prior = [{ page: '/a', clicks: 100, impressions: 100, ctr: 0.1, position: 5 }];
  const byClicks = analyzeDecay(current, prior, { metric: 'clicks' });
  assert.strictEqual(byClicks.decaying.length, 0);
  const byImpressions = analyzeDecay(current, prior, { metric: 'impressions', declineThreshold: -0.2 });
  assert.strictEqual(byImpressions.decaying.length, 1);
});

test('rejects an unknown metric', () => {
  assert.throws(() => analyzeDecay([], [], { metric: 'revenue' }), /must be "clicks" or "impressions"/);
});

test('every returned record carries the full, unfilled hypothesis checklist — never a pre-guessed cause', () => {
  const current = [{ page: '/a', clicks: 40, impressions: 500, ctr: 0.08, position: 5 }];
  const prior = [{ page: '/a', clicks: 100, impressions: 500, ctr: 0.2, position: 5 }];
  const result = analyzeDecay(current, prior, { declineThreshold: -0.2 });
  const hypotheses = result.decaying[0].hypotheses;
  for (const field of HYPOTHESIS_FIELDS) {
    assert.strictEqual(hypotheses[field], null, `expected ${field} to be null, not pre-guessed`);
  }
});

test('decaying is sorted worst-first and improving is sorted best-first', () => {
  const current = [
    { page: '/mild-decline', clicks: 70, impressions: 100, ctr: 0.1, position: 5 },
    { page: '/severe-decline', clicks: 20, impressions: 100, ctr: 0.1, position: 5 },
    { page: '/small-gain', clicks: 110, impressions: 100, ctr: 0.1, position: 5 },
    { page: '/big-gain', clicks: 200, impressions: 100, ctr: 0.1, position: 5 },
  ];
  const prior = current.map((r) => ({ ...r, page: r.page, clicks: 100 }));
  const result = analyzeDecay(current, prior, { declineThreshold: -0.2 });
  assert.deepStrictEqual(result.decaying.map((r) => r.page), ['/severe-decline', '/mild-decline']);
  assert.deepStrictEqual(result.improving.map((r) => r.page), ['/big-gain', '/small-gain']);
});

test('CLI: end-to-end comparing two normalized gsc-pages JSON files', () => {
  const currentFile = makeTempFile('current.json', {
    schema: 'gsc-pages',
    rows: [{ page: '/a', clicks: 40, impressions: 500, ctr: 0.08, position: 5 }],
  });
  const priorFile = makeTempFile('prior.json', {
    schema: 'gsc-pages',
    rows: [{ page: '/a', clicks: 100, impressions: 500, ctr: 0.2, position: 5 }],
  });

  const result = spawnSync(process.execPath, [SCRIPT, currentFile, priorFile, '--declineThreshold=-0.2'], { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.strictEqual(parsed.decaying.length, 1);
});

test('CLI: rejects input with the wrong schema', () => {
  const currentFile = makeTempFile('current-wrong.json', { schema: 'gsc-queries', rows: [] });
  const priorFile = makeTempFile('prior-wrong.json', { schema: 'gsc-pages', rows: [] });
  const result = spawnSync(process.execPath, [SCRIPT, currentFile, priorFile], { encoding: 'utf8' });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /schema "gsc-pages"/);
});

test('CLI: exits non-zero with a clear message when a file argument is missing', () => {
  const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
});
