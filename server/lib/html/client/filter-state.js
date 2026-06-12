/**
 * filter-state.js — owns the `?status=&milestone=&date=` filter query suffix
 * of location.hash. Does NOT touch the view/subId routing segment.
 *
 * Hash anatomy:  #<viewPath>[?status=<s>&milestone=<m>&date=<d>]
 * This module only reads/writes everything after the first `?`.
 */

/** Recognised filter keys, in fixed serialisation order. */
const FILTER_KEYS = ['status', 'milestone', 'date'];

/**
 * Parse filter state from a raw hash string.
 *
 * @param {string} hash — raw hash string, with or without leading `#`.
 * @returns {{ status: string, milestone: string, date: string }}
 *   Each value is a string or `''` when absent. Unknown keys are ignored.
 *   Never throws on malformed input.
 */
export function parseFilters(hash) {
  const result = { status: '', milestone: '', date: '' };
  try {
    const raw = String(hash || '').replace(/^#/, '');
    const qMark = raw.indexOf('?');
    if (qMark === -1) return result;
    const qs = raw.slice(qMark + 1);
    const params = new URLSearchParams(qs);
    for (const key of FILTER_KEYS) {
      const val = params.get(key);
      if (val !== null) result[key] = val;
    }
  } catch {
    // malformed input — return all-empty
  }
  return result;
}

/**
 * Serialise a filter object to a query string (no leading `?`).
 *
 * @param {{ status?: string, milestone?: string, date?: string }} filters
 * @returns {string} Query string without leading `?`, or `''` when no active filter.
 *   Keys are appended in fixed order: status, milestone, date.
 */
export function serialiseFilters(filters) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const val = filters[key];
    if (typeof val === 'string' && val !== '') {
      params.append(key, val);
    }
  }
  return params.toString();
}

/**
 * Build the full hash body for a given view path and filter state.
 * Used by FilterChips (sprint 34.2) to update `location.hash` without
 * disturbing the view/subId segment.
 *
 * @param {string} viewPath — e.g. `'phases'` or `'sprints/3'` (no leading `#`).
 * @param {{ status?: string, milestone?: string, date?: string }} filters
 * @returns {string} Hash body ready for assignment to `location.hash`,
 *   e.g. `'phases'` or `'sprints/3?status=active'`.
 */
export function applyFilters(viewPath, filters) {
  const qs = serialiseFilters(filters);
  return qs ? `${viewPath}?${qs}` : viewPath;
}
