/**
 * filter-state.js — hash query-string filter module.
 *
 * This module owns the `?status=&milestone=&date=` filter query segment of
 * `location.hash` and nothing else. It does NOT own the `view`/`subId` path
 * segment — that belongs to App.js parseHash.
 *
 * Three pure exported functions:
 *   parseFilters(hash)             — hash string → { status, milestone, date }
 *   serialiseFilters(filters)      — { status, milestone, date } → query string
 *   applyFilters(viewPath, filters) — build full hash body with optional query
 */

const KNOWN_KEYS = ['status', 'milestone', 'date'];

/**
 * Parse the filter query string from a raw hash string.
 *
 * Accepts a hash with or without a leading `#`. Splits on the first `?` and
 * parses everything after it with URLSearchParams. Recognises only the keys
 * `status`, `milestone`, and `date` — all others are silently ignored.
 * Never throws on malformed input; returns an all-empty object when there is
 * no `?` or the query is empty.
 *
 * @param {string} hash — e.g. `#phases/3?status=done&date=2026-05`
 * @returns {{ status: string, milestone: string, date: string }}
 */
export function parseFilters(hash) {
  const result = { status: '', milestone: '', date: '' };
  try {
    const raw = typeof hash === 'string' ? hash.replace(/^#/, '') : '';
    const qIdx = raw.indexOf('?');
    if (qIdx === -1) return result;
    const qs = raw.slice(qIdx + 1);
    if (!qs) return result;
    const params = new URLSearchParams(qs);
    for (const key of KNOWN_KEYS) {
      const val = params.get(key);
      if (val !== null) result[key] = val;
    }
  } catch {
    // Malformed input — return all-empty
  }
  return result;
}

/**
 * Serialise a filters object to a query string (without a leading `?`).
 *
 * Only keys with non-empty string values are appended. Keys are always
 * appended in the fixed order `status`, `milestone`, `date` so the output
 * is stable across calls with the same logical state.
 *
 * @param {{ status?: string, milestone?: string, date?: string }} filters
 * @returns {string} — e.g. `status=done&date=2026-05` or `''` when no active filter
 */
export function serialiseFilters(filters) {
  const params = new URLSearchParams();
  for (const key of KNOWN_KEYS) {
    const val = filters && typeof filters[key] === 'string' ? filters[key] : '';
    if (val !== '') params.append(key, val);
  }
  return params.toString();
}

/**
 * Build the full hash body string (everything after the leading `#`) from a
 * view path segment and a filters object.
 *
 * Used by FilterChips (Sprint 34.2) to update `location.hash` without
 * disturbing the active view segment.
 *
 * @param {string} viewPath — e.g. `phases` or `sprints/3`
 * @param {{ status?: string, milestone?: string, date?: string }} filters
 * @returns {string} — e.g. `phases` or `phases?status=done`
 */
export function applyFilters(viewPath, filters) {
  const qs = serialiseFilters(filters);
  return qs ? `${viewPath}?${qs}` : viewPath;
}
