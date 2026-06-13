/**
 * StatusSummaryBar — aggregate count chips for phases, sprints, and sessions
 * grouped by status. Reads from the shared store; renders a flex row of
 * labelled count chips.
 *
 * No props required — all data comes from useStore().
 * Rendered above views in 34.2 once wired into App.js.
 */

import { html } from '../preact.js';
import { useStore } from '../store.js';
import { allSprints, chip, sessionChip } from '../util.js';

/**
 * Build a `{ [cls]: count }` map from an array of items by normalising each
 * item's status through `chip()` and incrementing the corresponding cls bucket.
 *
 * @param {Array<{ status: string }>} items
 * @returns {Object.<string, number>}
 */
function countByStatus(items) {
  const map = {};
  for (const item of items) {
    const { cls } = chip(item.status || '');
    map[cls] = (map[cls] || 0) + 1;
  }
  return map;
}

/**
 * Build a `{ [cls]: count }` map from session objects using `sessionChip()`
 * rather than the phase/sprint-oriented `chip()`. Sessions carry a distinct
 * status vocabulary ('running', 'stopped', 'starting', 'error') that maps to
 * separate CSS classes so they can be styled independently.
 *
 * @param {Array<{ status: string }>} sessions
 * @returns {Object.<string, number>}
 */
function countSessionsByStatus(sessions) {
  const map = {};
  for (const session of sessions) {
    const { cls } = sessionChip(session.status || '');
    map[cls] = (map[cls] || 0) + 1;
  }
  return map;
}

/**
 * Render a single group of count chips.
 *
 * @param {{ label: string, counts: Object.<string, number> }} props
 */
function SummaryGroup({ label, counts }) {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (entries.length === 0) return null;
  return html`
    <div class="summary-group">
      <span class="summary-group-label">${label}</span>
      ${entries.map(([cls, count]) => html`
        <span class=${'summary-count-chip ' + cls}>${count} ${cls}</span>
      `)}
    </div>
  `;
}

/**
 * StatusSummaryBar — row of count chips for phases, sprints, and sessions.
 * Suppresses a group entirely when its source array is empty.
 */
export function StatusSummaryBar() {
  const S = useStore();

  const phases   = S.phases || [];
  const sprints  = allSprints(phases);
  const sessions = S.activeSessions || [];

  const phaseCounts   = countByStatus(phases);
  const sprintCounts  = countByStatus(sprints);
  const sessionCounts = countSessionsByStatus(sessions);

  const hasPhases   = phases.length > 0;
  const hasSprints  = sprints.length > 0;
  const hasSessions = sessions.length > 0;

  if (!hasPhases && !hasSprints && !hasSessions) return null;

  return html`
    <div class="summary-bar">
      ${hasPhases   ? html`<${SummaryGroup} label="Phases"   counts=${phaseCounts}   />` : null}
      ${hasSprints  ? html`<${SummaryGroup} label="Sprints"  counts=${sprintCounts}  />` : null}
      ${hasSessions ? html`<${SummaryGroup} label="Sessions" counts=${sessionCounts} />` : null}
    </div>
  `;
}
