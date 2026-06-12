/**
 * InProgress — Overview redesign, Row 2 Card 2.
 *
 * "In Progress" card with a "View all" link top-right and a list of rows,
 * each = task title + right-aligned percent badge (blue pill).
 *
 * Reads `tasks.inProgress[{ title, pct }]` from the store (pct is null when no
 * real per-task progress exists — the percent pill is simply omitted). Pure —
 * never fetches. An absent or empty slice renders an honest "Nothing in
 * progress" state — never sample data. See .planning/campaign/DATA-CONTRACT.md.
 */

import { html } from '../../preact.js';
import { useStore } from '../../store.js';
import { TaskPipeline } from '../TaskPipeline.js';

export function InProgress() {
  const S = useStore();
  const items = (S.tasks && Array.isArray(S.tasks.inProgress)) ? S.tasks.inProgress : [];

  return html`
    <section class="dash-card ip-card">
      <div class="ip-head">
        <p class="dash-card-title">In Progress</p>
        <button class="ip-viewall" onClick=${() => { location.hash = 'tasks'; }}>
          View all
        </button>
      </div>
      ${items.length === 0
        ? html`<p class="dash-card-sub">Nothing in progress</p>`
        : html`
          <ul class="ip-list">
            ${items.map((t, i) => html`
              <li class="ip-row" key=${t.title + i}>
                <span class="ip-title">${t.title}</span>
                <${TaskPipeline} task=${t} mini=${true}/>
                ${Number.isFinite(t.pct) ? html`<span class="ip-badge">${t.pct}%</span>` : null}
              </li>
            `)}
          </ul>
        `}
    </section>
  `;
}
