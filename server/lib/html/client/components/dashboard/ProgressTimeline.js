/**
 * ProgressTimeline — Overview redesign, Row 3 Card 2 (horizontal phases).
 *
 * Empty placeholder slot. Another agent fills in the horizontal phase track,
 * reading `phases[{ name, range, state }]` from the store.
 * See .planning/campaign/DATA-CONTRACT.md. Reads props/store only — no fetch.
 */

import { html } from '../../preact.js';

export function ProgressTimeline() {
  return html`
    <section class="dash-card">
      <p class="dash-card-title">Progress Timeline</p>
      <div class="dash-slot">Horizontal phases slot</div>
    </section>
  `;
}
