/**
 * ProjectHealth — Overview redesign health card.
 *
 * Empty placeholder slot. Another agent fills in the health visual, reading
 * `health { pct, label, points[] }` from the store.
 * See .planning/campaign/DATA-CONTRACT.md. Reads props/store only — no fetch.
 */

import { html } from '../../preact.js';

export function ProjectHealth() {
  return html`
    <section class="dash-card">
      <p class="dash-card-title">Project Health</p>
      <div class="dash-slot">Health chart slot</div>
    </section>
  `;
}
