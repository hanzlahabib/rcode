#!/usr/bin/env node
/**
 * seo-page-opportunity-score.cjs — post-launch page opportunity score (spec
 * §43), mirroring the shape of seo-opportunity-score.cjs (Part 1: pre-launch
 * build-or-not) but scoring an EXISTING page's "what to fix next" priority.
 *
 * OPPORTUNITY-SCORING.md's "Part 2" section is the single source of truth for
 * the weights and decision bands below (same rule as Part 1) — this script
 * mirrors that doc's numbers 1:1. If the doc changes, update this file to
 * match it, not the other way around.
 *
 * Same evidence-preservation discipline as Part 1: this is decision support,
 * not objective truth. No penalties system here (Part 2 doesn't define one)
 * — dimensions can go negative-signal via a low score, that's it.
 *
 * Usage:
 *   node seo-page-opportunity-score.cjs <input.json>
 *
 * Input shape:
 *   {
 *     "project": "optional label",
 *     "url": "/path/or/full-url",
 *     "scores": {
 *       "impressionPotential": 20,                        // bare number, or:
 *       "positionGap": { "value": 15, "evidence": "..." },
 *       "ctrGap": ...,
 *       "businessValue": ...,
 *       "internalLinkDeficit": ...,
 *       "contentGapDecay": ...,
 *       "conversionPotential": ...
 *     },
 *     "config": { "weights": {...}, "bands": [...] }        // optional override
 *   }
 *
 * Output (stdout): { project, url, total, band, breakdown: { scores: [...], rawTotal } }
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Mirrors OPPORTUNITY-SCORING.md Part 2's rubric 1:1. Sums to 100.
const DEFAULT_WEIGHTS = {
  impressionPotential: 20,
  positionGap: 20,
  ctrGap: 15,
  businessValue: 15,
  internalLinkDeficit: 10,
  contentGapDecay: 10,
  conversionPotential: 10,
};

// Mirrors OPPORTUNITY-SCORING.md Part 2's decision bands 1:1.
const DEFAULT_BANDS = [
  { min: 75, band: 'Top priority — act this cycle' },
  { min: 60, band: 'Worth doing this review cycle if capacity allows' },
  { min: 45, band: 'Backlog — revisit next review' },
  { min: -Infinity, band: 'Low priority / monitor only' },
];

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalize a `scores[dimension]` entry (bare number or {value, evidence}).
 * @param {string} dimension
 * @param {*} raw
 */
function normalizeScoreEntry(dimension, raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { value: raw, evidence: null };
  }
  if (isPlainObject(raw) && typeof raw.value === 'number' && Number.isFinite(raw.value)) {
    return { value: raw.value, evidence: typeof raw.evidence === 'string' ? raw.evidence : null };
  }
  throw new Error(
    `scores.${dimension} must be a finite number or { "value": finite number, "evidence"?: string }, got: ${JSON.stringify(raw)}`
  );
}

/**
 * Score a page's post-launch opportunity. Pure function — no I/O.
 *
 * @param {object} input - { project?, url, scores, config? }
 * @param {object} [overrideConfig]
 * @returns {{project: (string|null), url: string, total: number, band: string, breakdown: object}}
 */
function scorePageOpportunity(input, overrideConfig) {
  if (!isPlainObject(input)) {
    throw new Error('Input must be a JSON object.');
  }
  if (typeof input.url !== 'string' || input.url.trim() === '') {
    throw new Error('Input must include a non-empty "url" string.');
  }
  if (!isPlainObject(input.scores)) {
    throw new Error('Input must include a "scores" object.');
  }

  const config = { ...(isPlainObject(input.config) ? input.config : {}), ...(overrideConfig || {}) };
  const weights = { ...DEFAULT_WEIGHTS, ...(isPlainObject(config.weights) ? config.weights : {}) };
  const bands = Array.isArray(config.bands) && config.bands.length > 0 ? config.bands : DEFAULT_BANDS;

  const dimensions = Object.keys(weights);
  const missing = dimensions.filter((dim) => !(dim in input.scores));
  if (missing.length > 0) {
    throw new Error(`Missing required score dimension(s): ${missing.join(', ')}`);
  }
  const unknown = Object.keys(input.scores).filter((dim) => !dimensions.includes(dim));
  if (unknown.length > 0) {
    throw new Error(`Unknown score dimension(s): ${unknown.join(', ')}. Known dimensions: ${dimensions.join(', ')}`);
  }

  const scoreBreakdown = dimensions.map((dimension) => {
    const { value, evidence } = normalizeScoreEntry(dimension, input.scores[dimension]);
    const maxPoints = weights[dimension];
    if (value < 0 || value > maxPoints) {
      throw new Error(`scores.${dimension} = ${value} is out of range 0..${maxPoints}`);
    }
    return { dimension, points: value, maxPoints, evidence };
  });

  const rawTotal = scoreBreakdown.reduce((sum, row) => sum + row.points, 0);
  const total = Math.max(0, Math.min(100, rawTotal));
  const bandMatch = bands.find((b) => total >= b.min) || bands[bands.length - 1];

  return {
    project: typeof input.project === 'string' ? input.project : null,
    url: input.url,
    total,
    band: bandMatch.band,
    breakdown: { scores: scoreBreakdown, rawTotal },
  };
}

function main(argv) {
  const inputPath = argv[2];
  if (!inputPath) {
    throw new Error('Usage: node seo-page-opportunity-score.cjs <input.json>');
  }
  const resolvedPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Input file not found: ${resolvedPath}`);
  }

  let input;
  try {
    input = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  } catch (err) {
    throw new Error(`Input file is not valid JSON: ${resolvedPath} (${err.message})`);
  }

  const result = scorePageOpportunity(input);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (err) {
    process.stderr.write(`seo-page-opportunity-score: ${err.message}\n`);
    process.exit(1);
  }
}

module.exports = { scorePageOpportunity, DEFAULT_WEIGHTS, DEFAULT_BANDS };
