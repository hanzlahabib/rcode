/**
 * CompletedTasks — Overview redesign, Row 2 Card 1.
 *
 * "Completed Tasks" card with a "View all" link top-right and a list of rows,
 * each = green check icon + task title + right-aligned date.
 *
 * Reads `tasks.completed[{ title, date }]` from the store. Pure — never fetches.
 * An absent or empty slice renders an honest "No completed tasks yet" state —
 * never sample data. See .planning/campaign/DATA-CONTRACT.md.
 */

import { html } from '../../preact.js';
import { useStore } from '../../store.js';
import { humanDate } from '../../util.js';

export function CompletedTasks() {
  const S = useStore();
  const items = (S.tasks && Array.isArray(S.tasks.completed)) ? S.tasks.completed : [];

  return html`
    <section class="dash-card ct-card">
      <div class="ct-head">
        <p class="dash-card-title">Completed Tasks</p>
        <button class="ct-viewall" onClick=${() => { location.hash = 'tasks'; }}>
          View all
        </button>
      </div>
      ${items.length === 0
        ? html`<p class="dash-card-sub">No completed tasks yet</p>`
        : html`
          <ul class="ct-list">
            ${items.map((t, i) => html`
              <li class="ct-row" key=${t.title + i}>
                <svg class="ct-check" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span class="ct-title">${t.title}</span>
                <span class="ct-date">${humanDate(t.date)}</span>
              </li>
            `)}
          </ul>
        `}
    </section>
  `;
}
