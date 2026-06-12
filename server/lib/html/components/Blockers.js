/**
 * Blockers — Row 2, card 3. Blockers list with severity.
 *
 * Placeholder slot. Reads props only — never fetches.
 *   blockers [{ title, desc, severity }]  from state.blockers
 *   severity is one of "high" | "medium" | "low" (maps to --sev-* tokens).
 */

import { html } from '../vendor/preact.js';

export function Blockers({ blockers }) {
  const items = blockers || [];
  return html`
    <section class="rd-card">
      <p class="rd-card-title">Blockers</p>
      <div class="rd-slot">Severity list slot — ${items.length} blocker(s)</div>
    </section>
  `;
}
