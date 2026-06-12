/**
 * Timeline — Row 1, card 3. Timeline line chart.
 *
 * Placeholder slot. Reads props only — never fetches.
 *   timeline { launchDate, onTrack, points: [] }  from state.timeline
 */

import { html } from '../vendor/preact.js';

export function Timeline({ timeline }) {
  const t = timeline || {};
  const points = t.points || [];
  return html`
    <section class="rd-card">
      <p class="rd-card-title">Timeline</p>
      <p class="rd-card-sub">
        Launch ${t.launchDate || '—'} ·
        <span class=${t.onTrack ? 'rd-accent-teal' : 'rd-sev-medium'}>
          ${t.onTrack ? 'On track' : 'At risk'}
        </span>
      </p>
      <div class="rd-slot">Line chart slot — ${points.length} point(s)</div>
    </section>
  `;
}
