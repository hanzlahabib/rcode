/**
 * CompletedTasks — Row 2, card 1. Completed Tasks list.
 *
 * Placeholder slot. Reads props only — never fetches.
 *   tasks { completed: [{ title, date }], inProgress: [...] }  from state.tasks
 */

import { html } from '../vendor/preact.js';

export function CompletedTasks({ tasks }) {
  const completed = (tasks && tasks.completed) || [];
  return html`
    <section class="rd-card">
      <p class="rd-card-title">Completed Tasks</p>
      <div class="rd-slot">List slot — ${completed.length} completed task(s)</div>
    </section>
  `;
}
