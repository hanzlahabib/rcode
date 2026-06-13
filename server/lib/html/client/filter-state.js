/**
 * filter-state.js — URL hash query-string filter module.
 *
 * This module owns the `?status=&milestone=&date=` filter query portion of
 * location.hash ONLY. It never touches the `view` or `subId` path segments.
 *
 * Hash shape: `#view/subId?status=done&milestone=M3&date=2026-05`
 *   - The path segment (`view/subId`) is managed by App.js parseHash.
 *   - The query segment (`status=...`) is managed here.
 *
 * Recognised filter keys: `status`, `milestone`, `date`. All others are ignored.
 */

const FILTER_KEYS = ['status', 'milestone', 'date'];

/**
 * Parse filter state from a raw hash string.
 *
 * @param {string} hash — raw hash string (with or without leading `#`).
 * @returns {{ status: string, milestone: string, date: string }} — each value
 *   is a string or `''` when absent. Never throws on malformed input.
 */
export function parseFilters(hash) {
  const result = { status: '', milestone: '', date: '' };
  try {
    const raw = typeof hash === 'string' ? hash.replace(/^#/, '') : '';
    const qIdx = raw.indexOf('?');
    if (qIdx === -1) return result;
    const queryStr = raw.slice(qIdx + 1);
    const params = new URLSearchParams(queryStr);
    for (const key of FILTER_KEYS) {
      const val = params.get(key);
      if (val !== null) result[key] = val;
    }
  } catch {
    // Malformed input — return all-empty object.
  }
  return result;
}

/**
 * Serialise a filter object into a query string.
 *
 * @param {{ status: string, milestone: string, date: string }} filters
 * @returns {string} — query string WITHOUT a leading `?`. Empty string when no
 *   active filter. Keys are always appended in fixed order: status, milestone, date.
 */
export function serialiseFilters(filters) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const val = filters?.[key];
    if (typeof val === 'string' && val !== '') {
      params.append(key, val);
    }
  }
  return params.toString();
}

/**
 * Build a full hash body from a view path and filter object.
 *
 * Used by FilterChips (34.2) to update `location.hash` without disturbing
 * the view path segment.
 *
 * @param {string} viewPath — view path segment, e.g. `phases` or `sprints/3`.
 * @param {{ status: string, milestone: string, date: string }} filters
 * @returns {string} — hash body: `viewPath` or `viewPath?query`.
 */
export function applyFilters(viewPath, filters) {
  const query = serialiseFilters(filters);
  return query ? `${viewPath}?${query}` : viewPath;
}
