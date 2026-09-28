#!/usr/bin/env node
/**
 * seo-opportunity-score.cjs — deterministic implementation of the weighted
 * opportunity rubric defined in ../references/OPPORTUNITY-SCORING.md. That
 * file is the single source of truth for the numbers below; if you change a
 * weight, penalty, or band there, change it here too (and vice versa) — do
 * not let the two drift.
 *
 * This is decision support, not objective truth (spec §18). The script does
 * no research itself — it takes sub-scores + risk flags an agent already
 * gathered evidence for, and returns a total/band/breakdown that PRESERVES
 * that evidence verbatim so the score stays inspectable and auditable.
 *
 * Zero I/O beyond reading the one input JSON file passed on the command
 * line. No network calls, no project-state mutation.
 *
 * Usage:
 *   node seo-opportunity-score.cjs <input.json>
 *
 * Input shape:
 *   {
 *     "project": "optional label",
 *     "scores": {
 *       "intentFit": 18,                                  // bare number, or:
 *       "serpOpportunity": { "value": 12, "evidence": "..." },
 *       "clickPotential": ...,
 *       "commercialValue": ...,
 *       "topicalExpansion": ...,
 *       "utilityAdvantage": ...,
 *       "authorityFeasibility": ...,
 *       "domainFit": ...,
 *       "technicalFeasibility": ...
 *     },
 *     "riskFlags": [
 *       "heavyZeroClickSerp",                             // bare flag name, or:
 *       { "flag": "trademarkImpersonationRisk", "evidence": "..." }
 *     ],
 *     "config": { "weights": {...}, "penalties": {...}, "bands": [...] }   // optional override
 *   }
 *
 * Output (stdout, one JSON blob):
 *   { project, total, band, subtotal, breakdown: { scores: [...], penalties: [...] } }
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Mirrors OPPORTUNITY-SCORING.md's "Weighted rubric (100 points)" table exactly.
const DEFAULT_WEIGHTS = {
  intentFit: 20,
  serpOpportunity: 15,
  clickPotential: 15,
  commercialValue: 15,
  topicalExpansion: 10,
  utilityAdvantage: 10,
  authorityFeasibility: 5,
  domainFit: 5,
  technicalFeasibility: 5,
};

// Mirrors OPPORTUNITY-SCORING.md's "Risk penalties" table exactly.
const DEFAULT_PENALTIES = {
  ymylWithoutAuthority: -25,
  heavyZeroClickSerp: -20,
  officialEntityDomination: -30,
  trademarkImpersonationRisk: -40,
  thinContentDependency: -20,
  noRealisticMonetization: -15,
  extremeLinkDependency: -15,
  impossibleProductAdvantage: -10,
};

// Mirrors OPPORTUNITY-SCORING.md's "Decision bands" table exactly. Checked
// top-down; the first band whose `min` the total meets or exceeds wins.
const DEFAULT_BANDS = [
  { min: 75, band: 'strong candidate' },
  { min: 60, band: 'promising — manual review required' },
  { min: 45, band: 'weak / experimental' },
  { min: -Infinity, band: 'normally skip' },
];

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalize a `scores[dimension]` entry (bare number or {value, evidence})
 * into { value, evidence }. Throws with a clear, dimension-specific message
 * on anything malformed — this is the boundary of untrusted input.
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
 * Normalize a `riskFlags[]` entry (bare string or {flag, evidence}) into
 * { flag, evidence }.
 */
function normalizeRiskFlagEntry(raw, index) {
  if (typeof raw === 'string') {
    return { flag: raw, evidence: null };
  }
  if (isPlainObject(raw) && typeof raw.flag === 'string') {
    return { flag: raw.flag, evidence: typeof raw.evidence === 'string' ? raw.evidence : null };
  }
  throw new Error(`riskFlags[${index}] must be a string or { "flag": string, "evidence"?: string }, got: ${JSON.stringify(raw)}`);
}

/**
 * Score an opportunity. Pure function — no I/O, no globals mutated.
 *
 * @param {object} input - { project?, scores, riskFlags?, config? }
 * @param {object} [overrideConfig] - explicit config, takes precedence over input.config
 * @returns {{project: (string|null), total: number, band: string, subtotal: number, breakdown: object}}
 */
function scoreOpportunity(input, overrideConfig) {
  if (!isPlainObject(input)) {
    throw new Error('Input must be a JSON object.');
  }
  if (!isPlainObject(input.scores)) {
    throw new Error('Input must include a "scores" object.');
  }

  const config = { ...(isPlainObject(input.config) ? input.config : {}), ...(overrideConfig || {}) };
  const weights = { ...DEFAULT_WEIGHTS, ...(isPlainObject(config.weights) ? config.weights : {}) };
  const penalties = { ...DEFAULT_PENALTIES, ...(isPlainObject(config.penalties) ? config.penalties : {}) };
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

  const subtotal = scoreBreakdown.reduce((sum, row) => sum + row.points, 0);

  const riskFlagsInput = Array.isArray(input.riskFlags) ? input.riskFlags : [];
  const penaltyBreakdown = riskFlagsInput.map((raw, index) => {
    const { flag, evidence } = normalizeRiskFlagEntry(raw, index);
    if (!(flag in penalties)) {
      throw new Error(`Unknown riskFlags entry "${flag}". Known flags: ${Object.keys(penalties).join(', ')}`);
    }
    return { flag, amount: penalties[flag], evidence };
  });

  const totalPenalty = penaltyBreakdown.reduce((sum, row) => sum + row.amount, 0);
  const rawTotal = subtotal + totalPenalty;
  const total = Math.max(0, Math.min(100, rawTotal));

  const bandMatch = bands.find((b) => total >= b.min) || bands[bands.length - 1];

  return {
    project: typeof input.project === 'string' ? input.project : null,
    total,
    band: bandMatch.band,
    subtotal,
    breakdown: {
      scores: scoreBreakdown,
      penalties: penaltyBreakdown,
      rawTotal,
    },
  };
}

function main(argv) {
  const inputPath = argv[2];
  if (!inputPath) {
    throw new Error('Usage: node seo-opportunity-score.cjs <input.json>');
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

  const result = scoreOpportunity(input);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (err) {
    process.stderr.write(`seo-opportunity-score: ${err.message}\n`);
    process.exit(1);
  }
}

module.exports = { scoreOpportunity, DEFAULT_WEIGHTS, DEFAULT_PENALTIES, DEFAULT_BANDS };
