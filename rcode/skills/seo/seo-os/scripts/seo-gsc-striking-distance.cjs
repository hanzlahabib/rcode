#!/usr/bin/env node
/**
 * seo-gsc-striking-distance.cjs — one pass over a normalized `gsc-queries`
 * dataset (see seo-csv-normalize.cjs) yielding three outputs per spec
 * §26-29/§53:
 *
 *   strikingDistance[] — queries in a configurable position band with
 *                        meaningful impressions (spec §27: "do not hard-code
 *                        100 impressions as universally required")
 *   ctrGaps[]          — queries whose actual CTR is well below what a
 *                        generic CTR-by-position curve would predict (spec
 *                        §29: "do not assume every low CTR is a meta-
 *                        description problem" — this script only flags the
 *                        gap, it never assigns a cause)
 *   cannibalization[]  — queries whose rows span more than one distinct
 *                        `page` (spec §28/§53's "is the URL Google currently
 *                        ranks actually the one we want?" signal)
 *
 * `page` (the ranking URL) is OPTIONAL on the input rows — it's only present
 * when the GSC export used the combined query+page dimension (see
 * seo-csv-normalize.cjs's module doc). When present, every `strikingDistance`
 * / `ctrGaps` entry carries its `page` so GSC-GROWTH-ENGINE.md's
 * ranking-page-mismatch check has something to act on, and rows are grouped
 * by `query` to detect cannibalization: a query with more than one distinct
 * `page` across its rows is a same-query-multiple-URLs signal, surfaced here
 * as a hypothesis (never auto-merged — see GSC-GROWTH-ENGINE.md's
 * cannibalization workflow). When `page` is absent from the input, `page` is
 * `null` on every candidate and `cannibalization` is always `[]` — the
 * script degrades gracefully rather than erroring.
 *
 * Token efficiency (spec §50): all three lists are sorted (by impressions,
 * or by total impressions for cannibalization) and truncated to `topN`
 * (default 50) rather than dumping every matching row — this is an
 * aggregated/prioritized view, not a row dump.
 *
 * The CTR-by-position table below is a generic, widely-cited industry-shape
 * benchmark used only to detect a *relative* gap — it is never presented as
 * this project's actual CTR curve, and is fully overridable via --config.
 *
 * Usage:
 *   node seo-gsc-striking-distance.cjs <normalized.json> [--positionMin=8]
 *     [--positionMax=20] [--minImpressions=10] [--ctrGapRatio=0.5]
 *     [--topN=50] [--config=f]
 *
 * Output (stdout): { strikingDistance, ctrGaps, cannibalization, config }
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Generic average-CTR-by-position shape (organic, no SERP features assumed).
// Overridable via --config's `ctrByPosition` map. Positions beyond 20 fall
// back to the position-20 value.
const DEFAULT_CTR_BY_POSITION = {
  1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06,
  6: 0.05, 7: 0.04, 8: 0.03, 9: 0.028, 10: 0.025,
  11: 0.02, 12: 0.018, 13: 0.016, 14: 0.014, 15: 0.012,
  16: 0.011, 17: 0.01, 18: 0.009, 19: 0.008, 20: 0.007,
};

const DEFAULT_CONFIG = {
  positionMin: 8,
  positionMax: 20,
  minImpressions: 10,
  ctrGapRatio: 0.5,
  topN: 50,
  ctrByPosition: DEFAULT_CTR_BY_POSITION,
};

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {number} position
 * @param {Record<number,number>} table
 */
function expectedCtrForPosition(position, table) {
  const bucket = Math.max(1, Math.min(20, Math.round(position)));
  if (typeof table[bucket] === 'number') return table[bucket];
  return typeof table[20] === 'number' ? table[20] : 0.007;
}

/**
 * @param {object[]} rows - normalized gsc-queries rows: {query,clicks,impressions,ctr,position,page?}
 * @param {object} config
 * @returns {{strikingDistance: object[], ctrGaps: object[], cannibalization: object[], config: object}}
 */
function analyzeStrikingDistance(rows, config) {
  const merged = { ...DEFAULT_CONFIG, ...config };
  const ctrByPosition = { ...DEFAULT_CTR_BY_POSITION, ...(config.ctrByPosition || {}) };

  const strikingDistance = [];
  const ctrGaps = [];
  // query -> Map<page, {impressions, clicks, bestPosition}>, only populated
  // for rows that carry a page — used to detect cannibalization below.
  const queryPageMap = new Map();

  // Single pass over the rows (spec §51's single-pass-compute discipline) —
  // all three outputs are built from the same iteration.
  for (const row of rows) {
    const page = typeof row.page === 'string' && row.page.trim() !== '' ? row.page : null;
    const inBand = row.position >= merged.positionMin && row.position <= merged.positionMax;
    const meetsImpressions = row.impressions >= merged.minImpressions;

    if (inBand && meetsImpressions) {
      strikingDistance.push({
        query: row.query,
        page,
        position: row.position,
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: row.ctr,
      });
    }

    if (meetsImpressions) {
      const expectedCtr = expectedCtrForPosition(row.position, ctrByPosition);
      if (row.ctr < expectedCtr * merged.ctrGapRatio) {
        ctrGaps.push({
          query: row.query,
          page,
          position: row.position,
          impressions: row.impressions,
          clicks: row.clicks,
          ctr: row.ctr,
          expectedCtr,
        });
      }
    }

    if (page) {
      let pageStats = queryPageMap.get(row.query);
      if (!pageStats) {
        pageStats = new Map();
        queryPageMap.set(row.query, pageStats);
      }
      const stats = pageStats.get(page) || { impressions: 0, clicks: 0, bestPosition: row.position };
      stats.impressions += row.impressions;
      stats.clicks += row.clicks;
      stats.bestPosition = Math.min(stats.bestPosition, row.position);
      pageStats.set(page, stats);
    }
  }

  strikingDistance.sort((a, b) => b.impressions - a.impressions);
  ctrGaps.sort((a, b) => b.impressions - a.impressions);

  // A query is a cannibalization candidate (spec §28/§53) when its rows span
  // more than one distinct page — surfaced as a hypothesis, never resolved
  // here (no auto-merge/redirect decision is made by this script).
  const cannibalization = [];
  for (const [query, pageStats] of queryPageMap.entries()) {
    if (pageStats.size < 2) continue;
    const pages = [...pageStats.entries()]
      .map(([page, stats]) => ({ page, impressions: stats.impressions, clicks: stats.clicks, position: stats.bestPosition }))
      .sort((a, b) => b.impressions - a.impressions);
    const totalImpressions = pages.reduce((sum, p) => sum + p.impressions, 0);
    cannibalization.push({ query, totalImpressions, pages });
  }
  cannibalization.sort((a, b) => b.totalImpressions - a.totalImpressions);

  return {
    strikingDistance: strikingDistance.slice(0, merged.topN),
    ctrGaps: ctrGaps.slice(0, merged.topN),
    cannibalization: cannibalization.slice(0, merged.topN),
    config: merged,
  };
}

function parseArgs(argv) {
  const args = { input: null, config: null, overrides: {} };
  const NUMERIC_FLAGS = new Set(['positionMin', 'positionMax', 'minImpressions', 'ctrGapRatio', 'topN']);
  for (const arg of argv) {
    if (arg.startsWith('--config=')) {
      args.config = arg.slice('--config='.length);
      continue;
    }
    const flagMatch = arg.match(/^--([a-zA-Z]+)=(.+)$/);
    if (flagMatch && NUMERIC_FLAGS.has(flagMatch[1])) {
      const value = Number(flagMatch[2]);
      if (Number.isNaN(value)) throw new Error(`--${flagMatch[1]} must be a number, got "${flagMatch[2]}"`);
      args.overrides[flagMatch[1]] = value;
      continue;
    }
    if (arg.startsWith('--')) throw new Error(`Unknown flag: ${arg}`);
    args.input = arg;
  }
  return args;
}

function main(argv) {
  const usage =
    'Usage: node seo-gsc-striking-distance.cjs <normalized.json> [--positionMin=8] [--positionMax=20] [--minImpressions=10] [--ctrGapRatio=0.5] [--topN=50] [--config=f]';
  const args = parseArgs(argv.slice(2));
  if (!args.input) throw new Error(usage);

  const resolvedInput = path.resolve(args.input);
  if (!fs.existsSync(resolvedInput)) throw new Error(`Input file not found: ${resolvedInput}`);

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(resolvedInput, 'utf8'));
  } catch (err) {
    throw new Error(`Input file is not valid JSON: ${resolvedInput} (${err.message})`);
  }
  if (!isPlainObject(parsed) || parsed.schema !== 'gsc-queries' || !Array.isArray(parsed.rows)) {
    throw new Error(`Input must be seo-csv-normalize.cjs output with schema "gsc-queries" (got schema: ${JSON.stringify(parsed && parsed.schema)}).`);
  }

  let fileConfig = {};
  if (args.config) {
    const resolvedConfig = path.resolve(args.config);
    if (!fs.existsSync(resolvedConfig)) throw new Error(`Config file not found: ${resolvedConfig}`);
    fileConfig = JSON.parse(fs.readFileSync(resolvedConfig, 'utf8'));
  }

  const config = { ...fileConfig, ...args.overrides };
  const result = analyzeStrikingDistance(parsed.rows, config);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (err) {
    process.stderr.write(`seo-gsc-striking-distance: ${err.message}\n`);
    process.exit(1);
  }
}

module.exports = { analyzeStrikingDistance, expectedCtrForPosition, DEFAULT_CTR_BY_POSITION, DEFAULT_CONFIG };
