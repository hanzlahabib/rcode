/**
 * InProgress — Row 2, card 2. In Progress list with % badges.
 *
 * Placeholder slot. Reads props only — never fetches.
 *   tasks { completed: [...], inProgress: [{ title, pct }] }  from state.tasks
 */

import { html } from '../vendor/preact.js';

export function InProgress({ tasks }) {
  const inProgress = (tasks && tasks.inProgress) || [];
  return html`
    <section class="rd-card">
      <p class="rd-card-title">In Progress</p>
      <div class="rd-slot">List slot — ${inProgress.length} in-progress task(s)</div>
    </section>
  `;
}
