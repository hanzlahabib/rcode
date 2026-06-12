/**
 * StatusSummaryBar — renders aggregate count chips for phases, sprints, and
 * active sessions grouped by status.
 *
 * Reads from useStore(): phases (for phase and sprint counts) and
 * activeSessions (for session counts). Uses the same status normalisation
 * as chip() so chip colours stay consistent across the dashboard.
 */

import { html } from '../preact.js';
import { useStore } from '../store.js';
import { allSprints, chip } from '../util.js';

/**
 * Build a count map from an array of items.
 * Each item's `status` is normalised via chip() to a `cls` key.
 *
 * @param {Array} items — array of objects with a `status` field.
 * @returns {Map<string, { cls: string, label: string, count: number }>}
 */
function buildCountMap(items) {
  const map = new Map();
  for (const item of (items || [])) {
    const { cls, label } = chip(item.status);
    if (map.has(cls)) {
      map.get(cls).count++;
    } else {
      map.set(cls, { cls, label, count: 1 });
    }
  }
  return map;
}

/**
 * Render a group of count chips for a labelled entity type.
 * Returns null when the countMap is empty.
 *
 * @param {string} label — group label (e.g. 'Phases').
 * @param {Map}    countMap — output of buildCountMap().
 */
function SummaryGroup({ label, countMap }) {
  if (!countMap.size) return null;
  const chips = [];
  for (const { cls, label: statusLabel, count } of countMap.values()) {
    chips.push(html`
      <span key=${cls} class=${`summary-count-chip ${cls}`}>
        ${count} ${statusLabel}
      </span>
    `);
  }
  return html`
    <div class="summary-group">
      <span class="summary-group-label">${label}</span>
      ${chips}
    </div>
  `;
}

/**
 * StatusSummaryBar — a flex row of count chips for phases, sprints, and
 * active sessions grouped by status. Groups with zero items are omitted.
 */
export function StatusSummaryBar() {
  const S = useStore();

  const phaseMap   = buildCountMap(S.phases || []);
  const sprintMap  = buildCountMap(allSprints(S.phases));
  // Sessions: group by raw status (running, exited, etc.) since chip()
  // normalises these to 'active'/'other'; keep the full map but still use
  // the cls for colour accenting.
  const sessionMap = buildCountMap(S.activeSessions || []);

  const hasContent = phaseMap.size || sprintMap.size || sessionMap.size;
  if (!hasContent) return null;

  return html`
    <div class="summary-bar">
      <${SummaryGroup} label="Phases"   countMap=${phaseMap}   />
      <${SummaryGroup} label="Sprints"  countMap=${sprintMap}  />
      ${S.activeSessions && S.activeSessions.length
        ? html`<${SummaryGroup} label="Sessions" countMap=${sessionMap} />`
        : null}
    </div>
  `;
}
