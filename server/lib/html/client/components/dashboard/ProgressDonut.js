/**
 * ProgressDonut — Overview redesign, Row 1 Card 1 (Project Progress donut).
 *
 * Empty placeholder slot. Another agent fills in the donut chart, reading
 * `progress { completed, inProgress, notStarted, total, pct }` from the store.
 * See .planning/campaign/DATA-CONTRACT.md. Reads props/store only — no fetch.
 */

import { html } from '../../preact.js';

export function ProgressDonut() {
  return html`
    <section class="dash-card">
      <p class="dash-card-title">Project Progress</p>
      <div class="dash-slot">Donut chart slot</div>
    </section>
  `;
}
