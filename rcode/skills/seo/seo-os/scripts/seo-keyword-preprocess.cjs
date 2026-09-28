#!/usr/bin/env node
/**
 * seo-keyword-preprocess.cjs — a deterministic PREPROCESSING stage between a
 * raw keyword export and the semantic clustering `TOPIC-CLUSTERING.md` owns
 * (see `../references/KEYWORD-INTELLIGENCE.md`'s pipeline). Consumes
 * `seo-csv-normalize.cjs`'s `ahrefs-organic-keywords` output — this script
 * does not parse CSV itself, same convention as
 * `seo-gsc-striking-distance.cjs`.
 *
 * This is NOT a replacement for AI semantic clustering. It only does the
 * cheap, string-level work that would otherwise waste model context:
 *
 *   raw rows
 *     -> normalize (case/whitespace/hyphen formatting only — never intent)
 *     -> exact + variant duplicate removal (same real keyword, merged)
 *     -> candidate grouping (cheap signals: shared ranking URL, token-set
 *        overlap) — HYPOTHESES for AI review, never a merge decision
 *     -> aggregate numeric data without inventing (sum/max as documented
 *        below; missing stays missing, never zero-filled)
 *     -> compact top-N candidate-group output for AI semantic review
 *
 * The script NEVER declares two keywords intent-equivalent and NEVER merges
 * rows because their strings merely look similar. Every `candidateGroups[]`
 * entry is labelled a hypothesis; every original keyword + its own metrics
 * is preserved losslessly (compact by default — memberKeywords only — full
 * per-member metrics available via `--full` or `--out=`, see Output below).
 *
 * Normalization rules (formatting-only, each justified — spec-style
 * discipline borrowed from seo-csv-normalize.cjs's numeric-parsing doc):
 *   - case folded to lowercase
 *   - internal whitespace collapsed to a single space, trimmed
 *   - curly/typographic apostrophes folded to a straight `'`
 *   - a hyphen is folded to a space ("e-bike" -> "e bike"): a hyphenated
 *     compound and its spaced form are the same phrase, so this is a safe
 *     formatting fold, not a meaning change. Nothing else is stripped —
 *     punctuation that changes meaning (question marks, "vs", numbers) is
 *     left alone.
 * Two rows whose normalized keyword text is identical after these folds are
 * exact/variant duplicates of the SAME keyword and are merged (Step 1).
 * Two DIFFERENT keywords that merely resemble each other are never merged
 * this way — they can only become a candidate GROUP (Step 2), which stays a
 * hypothesis.
 *
 * Candidate grouping signals (cheap, deterministic, documented — no ML):
 *   1. Shared ranking URL — rows whose `url` field (post variant-merge)
 *      matches are strong same-page evidence (this is exactly
 *      KEYWORD-INTELLIGENCE.md's "Same-intent detection" ranking-URL
 *      signal). This signal can union two keywords even when they differ
 *      on an intent-divergence cue (rule 3) — real ranking evidence
 *      outranks a string heuristic — but the resulting group is flagged
 *      `intent-divergence-risk` rather than presented as a clean match.
 *   2. Token-set overlap — Jaccard similarity of each keyword's token set
 *      (whitespace-split, punctuation-stripped, small-stopword-filtered;
 *      see STOPWORDS in lib/keyword-normalize.cjs) at or above
 *      `--jaccardThreshold` (default 0.5). Bounded via an inverted token
 *      index so this stays sub-quadratic on a multi-thousand-row export
 *      (see lib/keyword-grouping.cjs's `buildTokenIndex` doc) — a token
 *      whose posting list exceeds `--tokenBucketCap` (default 50) is
 *      dropped as a pairing key (a documented PERFORMANCE guard, not a
 *      correctness guarantee: a group could in theory be missed if every
 *      token it shares is that common, which is an accepted tradeoff for
 *      staying fast on a 5k+ row export).
 *   3. Intent-divergence cues (DIVERGENCE_CUES in lib/keyword-normalize.cjs:
 *      "near me", "free", "vs"/"versus", "how to", "price"/"cost"/"prices"/
 *      "costs", "job"/"jobs") are a HARD BOUNDARY for the token-overlap
 *      signal alone: two keywords with high token overlap that differ on
 *      one of these cues are never merged by token overlap — they are
 *      recorded in `flaggedPairs` instead, so the AI reviewer sees the
 *      near-miss explicitly rather than it silently vanishing. Reliable
 *      brand-term divergence detection is intentionally OUT OF SCOPE here:
 *      it would need either a hardcoded per-project brand list (doesn't
 *      generalize) or an NER pass (defeats this stage's cheap/deterministic
 *      design) — brand-heavy groups still reach the AI reviewer via their
 *      full member keyword strings, which is where that judgment belongs.
 *
 * Aggregation (spec-style: sum/max are the only two operations used, and
 * which one applies to which field is documented here, not implicit):
 *   - Within one deduped keyword (case/whitespace/hyphen variants of the
 *     SAME real keyword): volume/difficulty/cpc take the MAX across
 *     variants (guards against variant rows disagreeing), position takes
 *     the MIN (best rank already achieved is the most informative), url/
 *     serpFeatures/parentTopic/country take the first non-empty value.
 *   - Across a candidate GROUP (different keywords, a hypothesis): volume
 *     is SUMMED (a hypothesis about combined demand, for the AI to
 *     confirm), difficulty/cpc take the MAX (conservative), position takes
 *     the MIN (best rank already achieved by any member). A field missing
 *     on every member stays `null` — it is never zero-filled; `volumeIncomplete:
 *     true` marks a sum computed over an incomplete set of members.
 *
 * Implementation is split across scripts/lib/ (Karpathy file-size
 * discipline — this file stayed a 681-line single module before the split):
 *   - lib/keyword-value-helpers.cjs — generic numeric/string aggregation
 *     primitives (isDefinedNumber/maxDefined/minDefined/sumDefined/
 *     firstNonEmpty).
 *   - lib/keyword-normalize.cjs — formatting normalization, tokenization,
 *     Jaccard similarity, divergence-cue detection, row validation, and
 *     Step 1 (exact/variant dedup).
 *   - lib/keyword-grouping.cjs — Step 2 (union-find candidate grouping over
 *     token-overlap + shared-URL signals) and group assembly/aggregation.
 * This file keeps only the top-level orchestration (preprocessKeywords),
 * CLI parsing, and the CLI entrypoint — same public API as before the split
 * (module.exports is unchanged; every name below is a straight re-export).
 *
 * Usage:
 *   node seo-keyword-preprocess.cjs <normalized.json> [--topN=50]
 *     [--jaccardThreshold=0.5] [--tokenBucketCap=50] [--full] [--out=f]
 *
 * Output (stdout, and also written to --out if given):
 *   { schema, summary, candidateGroups, singletons, flaggedPairs, config, note }
 *   Compact by default (memberKeywords only); pass --full for full
 *   per-member metrics inline, or read the lossless data straight from
 *   `preprocessKeywords()`'s return value (module.exports) with
 *   `{ full: true }`.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  maxDefined,
  minDefined,
  sumDefined,
} = require('./lib/keyword-value-helpers.cjs');

const {
  DIVERGENCE_CUES,
  normalizeKeywordText,
  tokenize,
  jaccardSimilarity,
  cuesIn,
  divergenceCuesDiffer,
  validateRows,
  dedupeKeywords,
} = require('./lib/keyword-normalize.cjs');

const {
  buildTokenIndex,
  buildCandidateGroups,
  assembleGroups,
} = require('./lib/keyword-grouping.cjs');

const DEFAULT_OPTIONS = {
  jaccardThreshold: 0.5,
  tokenBucketCap: 50,
  topN: 50,
  full: false,
};

/**
 * Top-level orchestrator: dedupe -> candidate-group -> aggregate -> sort ->
 * truncate -> format. See module doc for the full pipeline and output
 * shape. `options.full` controls whether full per-member metrics are
 * included inline (lossless) or only representative + memberKeywords
 * strings (compact — the default, per DATA-WORKSPACE.md's "aggregate/
 * filter before context" discipline). The return value here is ALWAYS
 * fully lossless at the JS level regardless of `full` (JSON.stringify is
 * what drops the `members` key when compact) — call this function directly
 * with `{ full: true }` to inspect every original row.
 * @param {object[]} rows - seo-csv-normalize.cjs `ahrefs-organic-keywords` rows
 * @param {object} [options]
 */
function preprocessKeywords(rows, options = {}) {
  if (!Array.isArray(rows)) throw new Error('preprocessKeywords expects rows to be an array.');
  validateRows(rows);

  const config = { ...DEFAULT_OPTIONS, ...options };
  const { units, duplicatesRemoved } = dedupeKeywords(rows);
  const { dsu, edgeSignals, flaggedPairs } = buildCandidateGroups(units, config);
  const { groups, singletons } = assembleGroups(units, dsu, edgeSignals);

  groups.sort((a, b) => (b.aggregated.totalVolume ?? -1) - (a.aggregated.totalVolume ?? -1));
  singletons.sort((a, b) => (b.metrics.volume ?? -1) - (a.metrics.volume ?? -1));
  flaggedPairs.sort((a, b) => b.jaccard - a.jaccard);

  const summary = {
    totalInputRows: rows.length,
    afterExactDedup: units.length,
    duplicatesRemoved,
    candidateGroupCount: groups.length,
    singletonCount: singletons.length,
    flaggedPairCount: flaggedPairs.length,
  };

  const formatGroup = (g) => (config.full ? g : { ...g, members: undefined });
  const formatSingleton = (u) => ({
    keyword: u.representative,
    memberKeywords: [...new Set(u.variants.map((r) => r.keyword))],
    members: config.full ? u.variants : undefined,
    metrics: u.metrics,
  });

  return {
    schema: 'ahrefs-organic-keywords',
    summary,
    candidateGroups: groups.slice(0, config.topN).map(formatGroup),
    singletons: singletons.slice(0, config.topN).map(formatSingleton),
    flaggedPairs: flaggedPairs.slice(0, config.topN),
    config,
    note: 'Candidate groups are hypotheses for AI semantic review — never an intent-equivalence or page-merge decision.',
  };
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseArgs(argv) {
  const args = { input: null, out: null, full: false, overrides: {} };
  const NUMERIC_FLAGS = new Set(['topN', 'jaccardThreshold', 'tokenBucketCap']);
  for (const arg of argv) {
    if (arg === '--full') {
      args.full = true;
      continue;
    }
    if (arg.startsWith('--out=')) {
      args.out = arg.slice('--out='.length);
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
    'Usage: node seo-keyword-preprocess.cjs <normalized.json> [--topN=50] [--jaccardThreshold=0.5] [--tokenBucketCap=50] [--full] [--out=f]';
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
  if (!isPlainObject(parsed) || parsed.schema !== 'ahrefs-organic-keywords' || !Array.isArray(parsed.rows)) {
    throw new Error(
      `Input must be seo-csv-normalize.cjs output with schema "ahrefs-organic-keywords" (got schema: ${JSON.stringify(parsed && parsed.schema)}).`
    );
  }

  const options = { ...args.overrides, full: args.full };
  const result = preprocessKeywords(parsed.rows, options);
  const json = JSON.stringify(result, null, 2) + '\n';

  if (args.out) fs.writeFileSync(path.resolve(args.out), json);
  process.stdout.write(json);
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (err) {
    process.stderr.write(`seo-keyword-preprocess: ${err.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  preprocessKeywords,
  dedupeKeywords,
  buildCandidateGroups,
  assembleGroups,
  buildTokenIndex,
  normalizeKeywordText,
  tokenize,
  jaccardSimilarity,
  cuesIn,
  divergenceCuesDiffer,
  sumDefined,
  maxDefined,
  minDefined,
  DEFAULT_OPTIONS,
  DIVERGENCE_CUES,
};
