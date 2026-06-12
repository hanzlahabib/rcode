/**
 * RecentDecisions — Overview redesign, Row 3 Card 1 (Recent Decisions list).
 *
 * "Recent Decisions" card + "View all" link. Each row is a decision title with
 * a status badge (Approved → green) on the left and the date on the right.
 * Reads `decisions[{ title, status, date }]` from the store; falls back to
 * representative sample data so the card renders standalone.
 * See .planning/campaign/DATA-CONTRACT.md. Reads props/store only — no fetch.
 */

import { html } from '../../preact.js';
import { useStore } from '../../store.js';
import { humanDate } from '../../util.js';

// Representative sample used when the store slice is empty/undefined.
const SAMPLE = [
  { title: 'Adopt Preact for dashboard', status: 'Approved', date: '2026-06-09' },
  { title: 'Single GET /api/state contract', status: 'Approved', date: '2026-06-08' },
  { title: 'Namespace --dash-* design tokens', status: 'Approved', date: '2026-06-07' },
];

// Map a free-form status string to a badge modifier class.
function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'rd-badge--approved';
  if (s === 'rejected') return 'rd-badge--rejected';
  return 'rd-badge--proposed';
}

export function RecentDecisions() {
  const S = useStore();
  const decisions = (S.decisions && S.decisions.length) ? S.decisions : SAMPLE;

  return html`
    <section class="dash-card">
      <div class="rd-head">
        <p class="dash-card-title">Recent Decisions</p>
        <button class="rd-viewall" onClick=${() => { location.hash = 'decisions'; }}>
          View all
        </button>
      </div>
      <ul class="rd-list">
        ${decisions.map((d, i) => html`
          <li class="rd-row" key=${d.title + i}>
            <span class="rd-title">${d.title}</span>
            <span class=${'rd-badge ' + statusClass(d.status)}>${d.status || 'Proposed'}</span>
            <span class="rd-date">${humanDate(d.date) || ''}</span>
          </li>
        `)}
      </ul>
    </section>
  `;
}
