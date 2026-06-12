/**
 * Timeline — Overview redesign, Row 1 Card 3 (Timeline line chart).
 *
 * Empty placeholder slot. Another agent fills in the line chart, reading
 * `timeline { launchDate, onTrack, points[] }` from the store.
 * See .planning/campaign/DATA-CONTRACT.md. Reads props/store only — no fetch.
 */

import { html } from '../../preact.js';

export function Timeline() {
  return html`
    <section class="dash-card">
      <p class="dash-card-title">Timeline</p>
      <div class="dash-slot">Line chart slot</div>
    </section>
  `;
}
