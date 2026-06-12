/**
 * ProgressDonut — Row 1, card 1. Project Progress donut.
 *
 * Placeholder slot. Reads props only — never fetches.
 *   progress { completed, inProgress, notStarted, total, pct }  from state.progress
 */

import { html } from '../vendor/preact.js';

export function ProgressDonut({ progress }) {
  const p = progress || {};
  return html`
    <section class="rd-card">
      <p class="rd-card-title">Project Progress</p>
      <div class="rd-slot">
        Donut slot — ${p.pct ?? '—'}% complete
        (${p.completed ?? '—'}/${p.total ?? '—'} tasks)
      </div>
    </section>
  `;
}
