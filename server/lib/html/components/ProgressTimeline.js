/**
 * ProgressTimeline — Row 3, card 2. Horizontal phase timeline.
 *
 * Placeholder slot. Reads props only — never fetches.
 *   phases [{ name, range, state }]  from state.phases
 *   state is one of "done" | "active" | "todo".
 */

import { html } from '../vendor/preact.js';

export function ProgressTimeline({ phases }) {
  const items = phases || [];
  return html`
    <section class="rd-card">
      <p class="rd-card-title">Progress Timeline</p>
      <div class="rd-slot">Horizontal phases slot — ${items.length} phase(s)</div>
    </section>
  `;
}
