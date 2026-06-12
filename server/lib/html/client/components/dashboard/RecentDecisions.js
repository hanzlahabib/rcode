/**
 * RecentDecisions — Overview redesign, Row 3 Card 1 (Recent Decisions list).
 *
 * Empty placeholder slot. Another agent fills in the list + Approved badges,
 * reading `decisions[{ title, status, date }]` from the store.
 * See .planning/campaign/DATA-CONTRACT.md. Reads props/store only — no fetch.
 */

import { html } from '../../preact.js';

export function RecentDecisions() {
  return html`
    <section class="dash-card">
      <p class="dash-card-title">Recent Decisions</p>
      <div class="dash-slot">Decisions list slot</div>
    </section>
  `;
}
