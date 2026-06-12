/**
 * CurrentPhase — Overview redesign, Row 1 Card 2 (Current Phase stepper).
 *
 * Empty placeholder slot. Another agent fills in the milestone stepper,
 * reading `currentPhase { name, status, milestones[] }` from the store.
 * See .planning/campaign/DATA-CONTRACT.md. Reads props/store only — no fetch.
 */

import { html } from '../../preact.js';

export function CurrentPhase() {
  return html`
    <section class="dash-card">
      <p class="dash-card-title">Current Phase</p>
      <div class="dash-slot">Phase stepper slot</div>
    </section>
  `;
}
