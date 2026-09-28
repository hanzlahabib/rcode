#!/usr/bin/env node
/**
 * seo-gsc-decay.cjs — period-over-period comparison of two normalized
 * `gsc-pages` datasets (spec §30), joined by `page`.
 *
 * This script only DETECTS a decline/improvement and its magnitude. It never
 * assigns a cause (spec §30: "never declare a cause before checking
 * evidence") — every returned record carries an empty hypothesis checklist
 * (outdatedContent, strongerCompetitors, serpIntentChanged, cannibalization,
 * lostBacklinks, aiAnswerReducedClicks, technicalProblem, seasonality), each
 * initialized to `null` ("not yet checked") for an agent to fill in after
 * investigation — not pre-guessed by this script.
 *
 * A page present in `current` but absent from `prior` (or vice versa) has no
 * baseline to compare against and is skipped — that is a "new data" or
 * "dropped from index" signal, not a decay/improvement signal, and this
 * script does not conflate the two.
 *
 * A page whose prior value is 0 is also skipped: division by zero cannot
 * produce a meaningful percentage delta (going from 0 to any positive number
 * is not "infinite decay" or "infinite improvement" — it's a different
 * question this script doesn't answer).
 *
 * Usage:
 *   node seo-gsc-decay.cjs <current.json> <prior.json>
 *     [--declineThreshold=-0.2] [--metric=clicks|impressions]
 *
 * Output (stdout): { decaying, improving, config }
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_CONFIG = {
  declineThreshold: -0.2,
  metric: 'clicks',
};

const HYPOTHESIS_FIELDS = [
  'outdatedContent',
  'strongerCompetitors',
  'serpIntentChanged',
  'cannibalization',
  'lostBacklinks',
  'aiAnswerReducedClicks',
  'technicalProblem',
  'seasonality',
];

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function emptyHypotheses() {
  const hypotheses = {};
  for (const field of HYPOTHESIS_FIELDS) hypotheses[field] = null;
  return hypotheses;
}

/**
 * @param {object[]} currentRows - normalized gsc-pages rows for the recent period
 * @param {object[]} priorRows - normalized gsc-pages rows for the comparison period
 * @param {object} config - { declineThreshold, metric }
 * @returns {{decaying: object[], improving: object[], config: object}}
 */
function analyzeDecay(currentRows, priorRows, config) {
  const merged = { ...DEFAULT_CONFIG, ...config };
  if (merged.metric !== 'clicks' && merged.metric !== 'impressions') {
    throw new Error(`--metric must be "clicks" or "impressions", got "${merged.metric}"`);
  }

  const priorByPage = new Map(priorRows.map((row) => [row.page, row]));

  const decaying = [];
  const improving = [];

  for (const cur of currentRows) {
    const prior = priorByPage.get(cur.page);
    if (!prior) continue; // no baseline for this page — not a decay/improvement signal

    const priorValue = prior[merged.metric];
    const currentValue = cur[merged.metric];
    if (!priorValue) continue; // zero baseline — percentage delta is not meaningful

    const deltaRatio = (currentValue - priorValue) / priorValue;
    const record = {
      page: cur.page,
      metric: merged.metric,
      current: currentValue,
      prior: priorValue,
      deltaRatio,
      hypotheses: emptyHypotheses(),
    };

    if (deltaRatio <= merged.declineThreshold) {
      decaying.push(record);
    } else if (deltaRatio > 0) {
      improving.push(record);
    }
  }

  decaying.sort((a, b) => a.deltaRatio - b.deltaRatio); // worst decline first
  improving.sort((a, b) => b.deltaRatio - a.deltaRatio); // biggest gain first

  return { decaying, improving, config: merged };
}

function loadNormalizedGscPages(filePath, label) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`${label} file not found: ${resolved}`);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (err) {
    throw new Error(`${label} file is not valid JSON: ${resolved} (${err.message})`);
  }
  if (!isPlainObject(parsed) || parsed.schema !== 'gsc-pages' || !Array.isArray(parsed.rows)) {
    throw new Error(`${label} must be seo-csv-normalize.cjs output with schema "gsc-pages" (got schema: ${JSON.stringify(parsed && parsed.schema)}).`);
  }
  return parsed.rows;
}

function parseArgs(argv) {
  const args = { current: null, prior: null, overrides: {} };
  const positional = [];
  for (const arg of argv) {
    if (arg.startsWith('--declineThreshold=')) {
      const value = Number(arg.slice('--declineThreshold='.length));
      if (Number.isNaN(value)) throw new Error(`--declineThreshold must be a number, got "${arg}"`);
      args.overrides.declineThreshold = value;
    } else if (arg.startsWith('--metric=')) {
      args.overrides.metric = arg.slice('--metric='.length);
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  [args.current, args.prior] = positional;
  return args;
}

function main(argv) {
  const usage = 'Usage: node seo-gsc-decay.cjs <current.json> <prior.json> [--declineThreshold=-0.2] [--metric=clicks|impressions]';
  const args = parseArgs(argv.slice(2));
  if (!args.current || !args.prior) throw new Error(usage);

  const currentRows = loadNormalizedGscPages(args.current, 'current');
  const priorRows = loadNormalizedGscPages(args.prior, 'prior');

  const result = analyzeDecay(currentRows, priorRows, args.overrides);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (err) {
    process.stderr.write(`seo-gsc-decay: ${err.message}\n`);
    process.exit(1);
  }
}

module.exports = { analyzeDecay, HYPOTHESIS_FIELDS, DEFAULT_CONFIG };
