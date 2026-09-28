'use strict';

/**
 * keyword-value-helpers.cjs — generic numeric/string aggregation primitives
 * used across seo-keyword-preprocess.cjs's dedupe and grouping stages. Split
 * out of the main script (Karpathy file-size discipline) — no behavior
 * change, pure extraction. See seo-keyword-preprocess.cjs's module doc for
 * the aggregation rules (which field uses which of these).
 */

function isDefinedNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/** @param {number[]} values */
function maxDefined(values) {
  const defined = values.filter(isDefinedNumber);
  return defined.length === 0 ? null : Math.max(...defined);
}

/** @param {number[]} values */
function minDefined(values) {
  const defined = values.filter(isDefinedNumber);
  return defined.length === 0 ? null : Math.min(...defined);
}

/**
 * Sums only the defined (finite-number) values — never substitutes 0 for a
 * missing one. `missingCount` tells the caller how many members had no
 * value, so a group's `volumeIncomplete` flag can be set honestly.
 * @param {Array<number|null|undefined>} values
 */
function sumDefined(values) {
  const defined = values.filter(isDefinedNumber);
  const value = defined.length === 0 ? null : defined.reduce((sum, v) => sum + v, 0);
  return { value, missingCount: values.length - defined.length };
}

function firstNonEmpty(values) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return '';
}

module.exports = {
  isDefinedNumber,
  maxDefined,
  minDefined,
  sumDefined,
  firstNonEmpty,
};
