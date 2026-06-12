/**
 * Blockers — Overview redesign, Row 2 Card 3 (Blockers list with severity).
 *
 * Empty placeholder slot. Another agent fills in the list, reading
 * `blockers[{ title, desc, severity }]` from the store. Severity maps to the
 * --dash-sev-high/medium/low tokens.
 * See .planning/campaign/DATA-CONTRACT.md. Reads props/store only — no fetch.
 */

import { html } from '../../preact.js';

export function Blockers() {
  return html`
    <section class="dash-card">
      <p class="dash-card-title">Blockers</p>
      <div class="dash-slot">Severity list slot</div>
    </section>
  `;
}
