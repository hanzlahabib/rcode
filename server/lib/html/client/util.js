/**
 * Shared pure helpers — ported from client-render.js.
 *
 * All functions are stateless: no module-global phase state (_phases).
 * `allSprints` and `allTasks` take `phases` as an explicit argument.
 *
 * Import here; do NOT duplicate in component files.
 */

/** HTML-escape a value for safe rendering. */
export function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Percentage string. Returns '—' if total is 0. */
export function pct(done, total) {
  return total > 0 ? Math.round(done / total * 100) + '%' : '—';
}

/** Percentage as a number (0–100). Returns 0 if total is 0. */
export function pctNum(done, total) {
  return total > 0 ? Math.round(done / total * 100) : 0;
}

/** Slice an ISO date string to YYYY-MM-DD, or null. */
export function dateStr(s) {
  return s ? String(s).slice(0, 10) : null;
}

/** Human-readable date string, e.g. "May 16, 2026". */
export function humanDate(s) {
  if (!s) return null;
  try {
    const d = new Date(s);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr(s);
  }
}

/**
 * Flatten all sprints across phases.
 * @param {Array} phases — the phases array from the store.
 * @returns {Array} sprints with phaseId and phaseName injected.
 */
export function allSprints(phases) {
  return (phases || []).flatMap(p =>
    (p.sprints || []).map(s => Object.assign({}, s, { phaseId: p.id, phaseName: p.name }))
  );
}

/**
 * Flatten all tasks (stories) across phases and sprints.
 * @param {Array} phases — the phases array from the store.
 * @returns {Array} tasks with sprintId, phaseId, and phaseName injected.
 */
export function allTasks(phases) {
  return (phases || []).flatMap(p =>
    (p.sprints || []).flatMap(s =>
      (s.stories || []).map(t => Object.assign({}, t, { sprintId: s.id, phaseId: p.id, phaseName: p.name }))
    )
  );
}

/**
 * Return a status chip descriptor — NOT an HTML string.
 * Components decide how to render the CSS class and label.
 *
 * @param {string} status
 * @returns {{ cls: string, label: string }}
 */
export function chip(status) {
  const s = String(status || '').toLowerCase();
  const cls =
    (s === 'complete' || s === 'completed' || s === 'done') ? 'complete' :
    (s === 'active'   || s === 'in_progress')               ? 'active'   :
    s === 'blocked'   ? 'blocked' :
    s === 'planned'   ? 'planned' :
    s === 'todo'      ? 'todo'    : 'other';
  return { cls, label: status };
}
