/**
 * RecentDecisions — Row 3, card 1. Recent Decisions list with status badges.
 *
 * Placeholder slot. Reads props only — never fetches.
 *   decisions [{ title, status, date }]  from state.decisions
 */

import { html } from '../vendor/preact.js';

export function RecentDecisions({ decisions }) {
  const items = decisions || [];
  return html`
    <section class="rd-card">
      <p class="rd-card-title">Recent Decisions</p>
      <div class="rd-slot">List slot — ${items.length} decision(s)</div>
    </section>
  `;
}
