/**
 * CompletedTasks — Overview redesign, Row 2 Card 1 (Completed Tasks list).
 *
 * Empty placeholder slot. Another agent fills in the list, reading
 * `tasks.completed[{ title, date }]` from the store.
 * See .planning/campaign/DATA-CONTRACT.md. Reads props/store only — no fetch.
 */

import { html } from '../../preact.js';

export function CompletedTasks() {
  return html`
    <section class="dash-card">
      <p class="dash-card-title">Completed Tasks</p>
      <div class="dash-slot">Completed list slot</div>
    </section>
  `;
}
