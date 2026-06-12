/**
 * CurrentPhase — Row 1, card 2. Current Phase stepper.
 *
 * Placeholder slot. Reads props only — never fetches.
 *   currentPhase { name, status, milestones: [{ name, state }] }  from state.currentPhase
 */

import { html } from '../vendor/preact.js';

export function CurrentPhase({ currentPhase }) {
  const c = currentPhase || {};
  const milestones = c.milestones || [];
  return html`
    <section class="rd-card">
      <p class="rd-card-title">Current Phase</p>
      <p class="rd-card-sub">${c.name || 'No active phase'} · ${c.status || '—'}</p>
      <div class="rd-slot">Stepper slot — ${milestones.length} milestone(s)</div>
    </section>
  `;
}
