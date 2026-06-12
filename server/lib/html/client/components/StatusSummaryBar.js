/**
 * StatusSummaryBar — aggregate count-chip summary bar.
 *
 * Renders a row of count chips showing how many phases, sprints, and active
 * sessions fall into each status bucket. Groups with an empty source array
 * are omitted entirely. The Sessions group is omitted when activeSessions is
 * empty.
 *
 * Read from the store — does NOT accept data props. Mount in any view.
 * Sprint 34.1 (DSH-1 foundation). Interactive filter chips come in 34.2.
 */

import { html } from '../preact.js';
import { useStore } from '../store.js';
import { allSprints, chip } from '../util.js';

/**
 * Build a count map keyed by the `cls` value returned by chip().
 * Each entry in `items` is inspected with `statusFn` to get its raw status
 * string, which is then normalised via chip() to a cls bucket.
 *
 * @param {Array} items
 * @param {(item: object) => string} statusFn
 * @returns {Array<{ cls: string, label: string, count: number }>}
 */
function buildCountMap(items, statusFn) {
  const byClass = {};
  for (const item of items) {
    const { cls, label } = chip(statusFn(item));
    if (!byClass[cls]) byClass[cls] = { cls, label, count: 0 };
    byClass[cls].count += 1;
  }
  return Object.values(byClass).filter(e => e.count > 0);
}

/**
 * A single group of count chips (e.g. "Phases 3 complete 1 active").
 *
 * @param {{ label: string, chips: Array<{ cls: string, label: string, count: number }> }} props
 */
function SummaryGroup({ label, chips }) {
  if (!chips || chips.length === 0) return null;
  return html`
    <div class="summary-group">
      <span class="summary-group-label">${label}</span>
      ${chips.map(({ cls, label: chipLabel, count }) => html`
        <span key=${cls} class=${'summary-count-chip ' + cls}>
          ${count} ${chipLabel}
        </span>
      `)}
    </div>
  `;
}

/**
 * StatusSummaryBar — renders aggregate count chips for phases, sprints, and
 * sessions, each grouped by status. Omits groups with no items.
 */
export function StatusSummaryBar() {
  const S = useStore();

  const phases   = S.phases         || [];
  const sprints  = allSprints(phases);
  const sessions = S.activeSessions || [];

  const phaseChips   = buildCountMap(phases,   p => p.status || '');
  const sprintChips  = buildCountMap(sprints,  s => s.status || '');
  const sessionChips = buildCountMap(sessions, s => s.status || '');

  // Omit the entire bar when all source arrays are empty.
  if (phases.length === 0 && sprints.length === 0 && sessions.length === 0) {
    return null;
  }

  return html`
    <div class="summary-bar">
      ${phases.length > 0
        ? html`<${SummaryGroup} label="Phases"   chips=${phaseChips}   />`
        : null}
      ${sprints.length > 0
        ? html`<${SummaryGroup} label="Sprints"  chips=${sprintChips}  />`
        : null}
      ${sessions.length > 0
        ? html`<${SummaryGroup} label="Sessions" chips=${sessionChips} />`
        : null}
    </div>
  `;
}
