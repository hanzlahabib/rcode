/**
 * Shared pure helpers — ported from client-render.js.
 *
 * All functions are stateless: no module-global phase state (_phases).
 * `allSprints` and `allTasks` take `phases` as an explicit argument.
 *
 * Import here; do NOT duplicate in component files.
 */

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
 * Display name for the store's `currentPhase`, which may be the contract
 * object { id, name, status, milestones[] }, a legacy plain string/number
 * (raw state.json current_phase), or null. Returns '' when absent —
 * never "[object Object]".
 */
export function currentPhaseName(cp) {
  if (cp == null) return '';
  if (typeof cp === 'object') return cp.name || (cp.id != null ? String(cp.id) : '');
  return String(cp);
}

/**
 * Identifier for the store's `currentPhase` (same shapes as currentPhaseName).
 * Prefers the phase id (what commands and phase-card comparisons use);
 * falls back to the name. Returns '' when absent.
 */
export function currentPhaseId(cp) {
  if (cp == null) return '';
  if (typeof cp === 'object') return cp.id != null ? String(cp.id) : (cp.name || '');
  return String(cp);
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
      (s.stories || []).map(t => Object.assign({}, t, { sprintId: s.id, phaseId: p.id, phaseName: p.name, file: s.file || null }))
    )
  );
}

/**
 * Map a numeric phase id to its milestone bucket.
 * Single source of truth — imported by PhasesView and SprintsView so that
 * milestone boundaries (19, 33) never diverge between the two views.
 * M1 = phases 1–19, M2 = 20–33, M3 = 34+.
 *
 * @param {number|string} id — phase id
 * @returns {'M1'|'M2'|'M3'}
 */
export function phaseMilestone(id) {
  const n = Number(id);
  if (n <= 19) return 'M1';
  if (n <= 33) return 'M2';
  return 'M3';
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
 * Return a status chip descriptor for orchestrator session statuses.
 * Session objects use a different vocabulary than phases/sprints
 * ('running', 'stopped', 'starting', 'error'), so a separate normaliser
 * keeps the two status domains from coupling inside chip().
 *
 * Mapping:
 *   running  → 'sess-running'  (accent-blue — live activity)
 *   starting → 'sess-starting' (amber — transient / pending)
 *   stopped  → 'sess-stopped'  (text-secondary — idle / muted)
 *   error    → 'sess-error'    (accent-red — needs attention)
 *
 * @param {string} status
 * @returns {{ cls: string, label: string }}
 */
export function sessionChip(status) {
  const s = String(status || '').toLowerCase();
  const cls =
    s === 'running'  ? 'sess-running'  :
    s === 'starting' ? 'sess-starting' :
    s === 'error'    ? 'sess-error'    :
    s === 'stopped'  ? 'sess-stopped'  : 'sess-stopped';
  return { cls, label: status };
}

/**
 * Human-readable elapsed time since an ISO timestamp.
 * Ported from _orchElapsed() in client-main.js.
 *
 * @param {string|null} iso — ISO 8601 start time
 * @returns {string}
 */
export function orchElapsed(iso) {
  if (!iso) return '—';
  let s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 0) s = 0;
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + (s % 60) + 's';
  return Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
}

/**
 * Return command-hint pairs [cmd, desc] for a sprint, based on its status.
 * Ported from sprintHints() in client-render.js.
 *
 * @param {object} s — sprint object (id, status, stories, phaseId)
 * @returns {Array<[string, string]>}
 */
export function sprintHints(s) {
  if (!s) return [];
  const stories = Array.isArray(s.stories) ? s.stories : [];
  const st = s.status || 'planned';
  const sid = s.id || '';
  if (st === 'completed' || st === 'complete' || st === 'done') {
    return [
      ['/rcode-verify-work',   'Verify UAT for Sprint ' + sid],
      ['/rcode-audit',         'Audit completed Sprint ' + sid],
      ['/rcode-session-report','Generate session report'],
      ['/rcode-review',   'Review code from Sprint ' + sid],
    ];
  } else if (st === 'active' || st === 'in_progress') {
    return [
      ['/rcode-progress',     'Check Sprint ' + sid + ' progress'],
      ['/rcode-sprint-status','Status report for Sprint ' + sid],
      ['/rcode-pause-work',   'Pause and save context'],
    ];
  } else if (st === 'blocked') {
    return [
      ['/rcode-debug',         'Debug blocker in Sprint ' + sid],
      ['/rcode-correct-course','Course-correct Sprint ' + sid],
    ];
  } else {
    if (!stories.length) {
      return [
        ['/rcode-sprint-planning','Groom Sprint ' + sid + ' — add stories'],
        ['/rcode-create-story',   'Create a story for Sprint ' + sid],
        ['/rcode-discuss-phase',  'Discuss approach before planning'],
      ];
    }
    return [
      ['/rcode-execute-sprint ' + sid, 'Execute Sprint ' + sid],
      ['/rcode-discuss-phase',  'Discuss before executing'],
      ['/rcode-sprint-planning','Refine Sprint ' + sid + ' plan'],
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
  if (!p) return [];
  const sps = Array.isArray(p.sprints) ? p.sprints : [];
  const st = p.status || 'planned';
  const pid = p.id || '';
  if (st === 'completed' || st === 'complete' || st === 'done') {
    return [
      ['/rcode-validate-phase','Validate Phase ' + pid + ' deliverables'],
      ['/rcode-audit',        'Audit Phase ' + pid + ' completion'],
      ['/rcode-review',  'Review Phase ' + pid + ' code'],
    ];
  } else if (st === 'active' || st === 'in_progress') {
    return [
      ['/rcode-progress',     'Check Phase ' + pid + ' progress'],
      ['/rcode-sprint-status','Current sprint status'],
      ['/rcode-review',  'Review code in Phase ' + pid],
    ];
  } else {
    if (!sps.length) {
      return [
        ['/rcode-plan',         'Create sprint plan for Phase ' + pid],
        ['/rcode-discuss-phase','Discuss Phase ' + pid + ' approach'],
        ['/rcode-research-phase','Research Phase ' + pid + ' before planning'],
      ];
    }
    return [
      ['/rcode-execute ' + pid, 'Start executing Phase ' + pid],
      ['/rcode-sprint-planning','Plan next sprint in Phase ' + pid],
    ];
  }
}

// ---- Markdown helpers (moved from FilesView so AgentsView can share) ----

/** Strip a leading YAML frontmatter block from a markdown string. */
export function stripFrontmatter(md) {
  if (!md.startsWith('---')) return md;
  const end = md.indexOf('\n---', 3);
  return end === -1 ? md : md.slice(end + 4).trimStart();
}

/**
 * Minimal HTML sanitizer for rendered markdown. No DOMPurify dependency on
 * the client, so we strip the dangerous primitives via regex after marked
 * emits HTML: script/iframe/object/embed tags, inline event handlers, and
 * javascript:/data: URLs in href/src. Markdown content comes from the project
 * dir (semi-trusted) but may include attacker-controlled text checked into a
 * repo, so we cannot trust raw HTML passthrough.
 */
export function sanitizeHtml(html) {
  return String(html)
    .replace(/<\s*(script|iframe|object|embed|link|meta|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|link|meta|style)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|xlink:href)\s*=\s*(["'])\s*(?:javascript|data|vbscript):[^"']*\2/gi, '$1=$2#blocked$2');
}

/** Render markdown to sanitized HTML via the global `marked` CDN lib. */
export function renderMd(md) {
  const clean = stripFrontmatter(md);
  if (typeof marked === 'undefined') {
    return '<pre>' + clean.replace(/</g, '&lt;') + '</pre>';
  }
  return sanitizeHtml(marked.parse(clean));
}
