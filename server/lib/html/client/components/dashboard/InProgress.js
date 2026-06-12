/**
 * InProgress — Overview redesign, Row 2 Card 2 (In Progress list + % badges).
 *
 * Empty placeholder slot. Another agent fills in the list, reading
 * `tasks.inProgress[{ title, pct }]` from the store.
 * See .planning/campaign/DATA-CONTRACT.md. Reads props/store only — no fetch.
 */

import { html } from '../../preact.js';

export function InProgress() {
  return html`
    <section class="dash-card">
      <p class="dash-card-title">In Progress</p>
      <div class="dash-slot">In-progress list slot</div>
    </section>
  `;
}
