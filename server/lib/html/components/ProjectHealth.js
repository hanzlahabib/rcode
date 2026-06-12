/**
 * ProjectHealth — health detail card (sidebar mini-card has its own slot;
 * this is the fuller health component other agents may surface in the grid).
 *
 * Placeholder slot. Reads props only — never fetches.
 *   health { pct, label, points: [] }  from state.health
 */

import { html } from '../vendor/preact.js';

export function ProjectHealth({ health }) {
  const h = health || {};
  const points = h.points || [];
  return html`
    <section class="rd-card">
      <p class="rd-card-title">Project Health</p>
      <p class="rd-card-sub">${h.label || '—'} · ${h.pct ?? '—'}%</p>
      <div class="rd-slot">Health chart slot — ${points.length} point(s)</div>
    </section>
  `;
}
