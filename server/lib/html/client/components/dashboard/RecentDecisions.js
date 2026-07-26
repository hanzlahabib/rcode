/**
 * RecentDecisions — Overview redesign, Row 3 Card 1 (Recent Decisions list).
 *
 * "Recent Decisions" card + "View all" link. Each row is a decision title with
 * a status badge (only when the decision actually records a status — no
 * default "Approved") and the date on the right. An empty array renders an
 * honest "No decisions recorded yet" state, never sample data.
 * See .planning/campaign/DATA-CONTRACT.md. Reads props/store only — no fetch.
 */

import { html } from '../../preact.js';
import { useStore, openDecisionViewer } from '../../store.js';
import { humanDate } from '../../util.js';
import { pressable } from '../shared.js';

// Map a free-form status string to a badge modifier class.
function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'rd-badge--approved';
  if (s === 'rejected') return 'rd-badge--rejected';
  return 'rd-badge--proposed';
}

export function RecentDecisions() {
  const S = useStore();
  const decisions = Array.isArray(S.decisions) ? S.decisions : [];

  return html`
    <section class="dash-card">
      <div class="rd-head">
        <p class="dash-card-title">Recent Decisions</p>
        <button class="rd-viewall" onClick=${() => { location.hash = 'decisions'; }}>
          View all
        </button>
      </div>
      ${decisions.length === 0
        ? html`
          <div class="dash-empty">
            <span>No decisions recorded yet</span>
            <code class="dash-empty-hint">/rcode-council</code>
          </div>
        `
        : html`
          <ul class="rd-list">
            ${decisions.map((d, i) => html`
              <li class="rd-row ovr-link" key=${d.title + i} ...${pressable(() => openDecisionViewer(d))}>
                <span class="rd-title">${d.title}</span>
                ${d.status
                  ? html`<span class=${'rd-badge ' + statusClass(d.status)}>${d.status}</span>`
                  : html`<span class="rd-status-none">—</span>`}
                <span class="rd-date">${humanDate(d.date) || ''}</span>
              </li>
            `)}
          </ul>
        `}
    </section>
  `;
}
