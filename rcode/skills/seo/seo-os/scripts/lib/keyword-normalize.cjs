'use strict';

/**
 * keyword-normalize.cjs — formatting-only keyword normalization, tokenization,
 * Jaccard similarity, intent-divergence cue detection, and Step 1 (exact +
 * variant duplicate removal) for seo-keyword-preprocess.cjs. Split out of the
 * main script (Karpathy file-size discipline) — no behavior change, pure
 * extraction. See seo-keyword-preprocess.cjs's module doc for the full
 * normalization/dedup rules and why each fold is safe (never changes intent).
 */

const { maxDefined, minDefined, firstNonEmpty, isDefinedNumber } = require('./keyword-value-helpers.cjs');

// Small, grouping-only stopword list. Deliberately excludes anything in
// DIVERGENCE_CUES below (e.g. "how", "near", "free") — those must survive
// tokenization so the divergence check can see them.
const STOPWORDS = new Set(['a', 'an', 'the', 'for', 'to', 'of', 'in', 'on', 'with', 'and', 'or', 'is', 'are', 'at']);

// Intent-divergence modifiers (see seo-keyword-preprocess.cjs's module doc,
// rule 3). Checked as space-padded substrings against the normalized keyword
// text, so multi-word cues ("near me", "how to") match correctly without a
// false hit on a shorter word inside a longer one (e.g. "vs" never matches
// inside "divs").
const DIVERGENCE_CUES = ['near me', 'free', 'vs', 'versus', 'how to', 'price', 'prices', 'cost', 'costs', 'jobs', 'job'];

/**
 * Formatting-only normalization used both as the exact/variant-duplicate
 * key and as the input to tokenize(). See seo-keyword-preprocess.cjs's
 * module doc for the exact rules and why each is safe (never changes intent).
 * @param {string} keyword
 */
function normalizeKeywordText(keyword) {
  return String(keyword)
    .replace(/[‘’ʼ]/g, "'") // curly/typographic apostrophe -> straight
    .replace(/-/g, ' ') // hyphen == space ("e-bike" / "e bike")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * @param {string} normKey - output of normalizeKeywordText
 * @returns {string[]} tokens with stopwords removed, for Jaccard grouping only
 */
function tokenize(normKey) {
  return normKey
    .split(' ')
    .map((t) => t.replace(/[^a-z0-9']/g, ''))
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

/**
 * @param {string[]} aTokens
 * @param {string[]} bTokens
 */
function jaccardSimilarity(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Which DIVERGENCE_CUES phrases appear in a normalized keyword string.
 * @param {string} normKey
 * @returns {Set<string>}
 */
function cuesIn(normKey) {
  const padded = ` ${normKey} `;
  const found = new Set();
  for (const cue of DIVERGENCE_CUES) {
    if (padded.includes(` ${cue} `)) found.add(cue);
  }
  return found;
}

/**
 * Symmetric-difference of two cue sets — non-empty means the two keywords
 * disagree on at least one intent-signalling modifier.
 * @param {Set<string>} cuesA
 * @param {Set<string>} cuesB
 */
function divergenceCuesDiffer(cuesA, cuesB) {
  const diff = new Set();
  for (const c of cuesA) if (!cuesB.has(c)) diff.add(c);
  for (const c of cuesB) if (!cuesA.has(c)) diff.add(c);
  return diff;
}

/**
 * Fails loud on structurally malformed input rather than silently skipping
 * (spec discipline: this stage trusts seo-csv-normalize.cjs already handled
 * per-row skip logic upstream; a row reaching here that still fails this
 * shape check means the caller bypassed normalization, which is an error,
 * not a data-quality nuance to paper over). `url`/`serpFeatures`/
 * `parentTopic`/`country` are treated as opportunistic here (degrade the
 * sharedUrl signal, never fail the run) — the same graceful-degradation
 * choice seo-gsc-striking-distance.cjs makes for its optional `page` field.
 * @param {object[]} rows
 */
function validateRows(rows) {
  rows.forEach((row, i) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      throw new Error(`Malformed input: row at index ${i} is not an object.`);
    }
    if (typeof row.keyword !== 'string' || row.keyword.trim() === '') {
      throw new Error(`Malformed input: row at index ${i} is missing a non-empty "keyword" string.`);
    }
    for (const field of ['volume', 'difficulty', 'cpc', 'position']) {
      if (!isDefinedNumber(row[field])) {
        throw new Error(
          `Malformed input: row at index ${i} ("${row.keyword}") has a missing/invalid "${field}" — ` +
            `expected seo-csv-normalize.cjs output with schema "ahrefs-organic-keywords".`
        );
      }
    }
  });
}

/**
 * Step 1: exact + variant duplicate removal. Rows whose normalized keyword
 * text is identical (case/whitespace/hyphen folds only) collapse into one
 * unit. Fully lossless — every original row is kept in `unit.variants`.
 * @param {object[]} rows
 * @returns {{units: object[], duplicatesRemoved: number}}
 */
function dedupeKeywords(rows) {
  const unitsByKey = new Map();
  const order = [];

  for (const row of rows) {
    const normKey = normalizeKeywordText(row.keyword);
    let unit = unitsByKey.get(normKey);
    if (!unit) {
      unit = { normKey, tokens: tokenize(normKey), cues: cuesIn(normKey), variants: [], variantCounts: new Map() };
      unitsByKey.set(normKey, unit);
      order.push(unit);
    }
    unit.variants.push(row);
    unit.variantCounts.set(row.keyword, (unit.variantCounts.get(row.keyword) || 0) + 1);
  }

  for (const unit of order) {
    // Representative spelling = most frequent original casing, tie-broken
    // by first-seen order.
    let bestKeyword = unit.variants[0].keyword;
    let bestCount = -1;
    const seen = new Set();
    for (const row of unit.variants) {
      if (seen.has(row.keyword)) continue;
      seen.add(row.keyword);
      const count = unit.variantCounts.get(row.keyword);
      if (count > bestCount) {
        bestCount = count;
        bestKeyword = row.keyword;
      }
    }
    unit.representative = bestKeyword;
    unit.metrics = {
      volume: maxDefined(unit.variants.map((r) => r.volume)),
      difficulty: maxDefined(unit.variants.map((r) => r.difficulty)),
      cpc: maxDefined(unit.variants.map((r) => r.cpc)),
      position: minDefined(unit.variants.map((r) => r.position)),
      url: firstNonEmpty(unit.variants.map((r) => r.url)),
      serpFeatures: firstNonEmpty(unit.variants.map((r) => r.serpFeatures)),
      parentTopic: firstNonEmpty(unit.variants.map((r) => r.parentTopic)),
      country: firstNonEmpty(unit.variants.map((r) => r.country)),
    };
  }

  return { units: order, duplicatesRemoved: rows.length - order.length };
}

module.exports = {
  STOPWORDS,
  DIVERGENCE_CUES,
  normalizeKeywordText,
  tokenize,
  jaccardSimilarity,
  cuesIn,
  divergenceCuesDiffer,
  validateRows,
  dedupeKeywords,
};
