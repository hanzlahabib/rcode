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

/**
 * Return command-hint pairs [cmd, desc] for a sprint, based on its status.
 * Ported from sprintHints() in client-render.js.
 *
 * @param {object} s — sprint object (id, status, stories, phaseId)
 * @returns {Array<[string, string]>}
 */
export function sprintHints(s) {
  const stories = Array.isArray(s.stories) ? s.stories : [];
  const st = s.status || 'planned';
  const sid = s.id || '';
  if (st === 'completed' || st === 'complete' || st === 'done') {
    return [
      ['/rihal-verify-work',   'Verify UAT for Sprint ' + sid],
      ['/rihal-audit',         'Audit completed Sprint ' + sid],
      ['/rihal-session-report','Generate session report'],
      ['/rihal-code-review',   'Review code from Sprint ' + sid],
    ];
  } else if (st === 'active' || st === 'in_progress') {
    return [
      ['/rihal-progress',     'Check Sprint ' + sid + ' progress'],
      ['/rihal-sprint-status','Status report for Sprint ' + sid],
      ['/rihal-pause-work',   'Pause and save context'],
    ];
  } else if (st === 'blocked') {
    return [
      ['/rihal-debug',         'Debug blocker in Sprint ' + sid],
      ['/rihal-correct-course','Course-correct Sprint ' + sid],
    ];
  } else {
    if (!stories.length) {
      return [
        ['/rihal-sprint-planning','Groom Sprint ' + sid + ' — add stories'],
        ['/rihal-create-story',   'Create a story for Sprint ' + sid],
        ['/rihal-discuss-phase',  'Discuss approach before planning'],
      ];
    }
    return [
      ['/rihal-execute',        'Execute Sprint ' + sid],
      ['/rihal-discuss-phase',  'Discuss before executing'],
      ['/rihal-sprint-planning','Refine Sprint ' + sid + ' plan'],
    ];
  }
}

/**
 * Return command-hint pairs [cmd, desc] for a phase, based on its status.
 * Ported from phaseHints() in client-render.js.
 *
 * @param {object} p — phase object (id, status, sprints)
 * @returns {Array<[string, string]>}
 */
export function phaseHints(p) {
  const sps = Array.isArray(p.sprints) ? p.sprints : [];
  const st = p.status || 'planned';
  const pid = p.id || '';
  if (st === 'completed' || st === 'complete' || st === 'done') {
    return [
      ['/rihal-validate-phase','Validate Phase ' + pid + ' deliverables'],
      ['/rihal-audit',        'Audit Phase ' + pid + ' completion'],
      ['/rihal-code-review',  'Review Phase ' + pid + ' code'],
    ];
  } else if (st === 'active' || st === 'in_progress') {
    return [
      ['/rihal-progress',     'Check Phase ' + pid + ' progress'],
      ['/rihal-sprint-status','Current sprint status'],
      ['/rihal-code-review',  'Review code in Phase ' + pid],
    ];
  } else {
    if (!sps.length) {
      return [
        ['/rihal-plan',         'Create sprint plan for Phase ' + pid],
        ['/rihal-discuss-phase','Discuss Phase ' + pid + ' approach'],
        ['/rihal-research-phase','Research Phase ' + pid + ' before planning'],
      ];
    }
    return [
      ['/rihal-execute',        'Start executing Phase ' + pid],
      ['/rihal-sprint-planning','Plan next sprint in Phase ' + pid],
    ];
  }
}
