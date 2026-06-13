/**
 * ProgressDonut — Overview redesign, Row 1 Card 1 (Project Progress donut).
 *
 * Reads the `progress { completed, inProgress, notStarted, total, pct }` slice
 * from the store and renders a teal-gradient donut ring with the percentage
 * centered, a colored-dot legend, and a thin segmented progress bar.
 * See .planning/campaign/DATA-CONTRACT.md. Reads store only — no fetch.
 */

import { html } from '../../preact.js';
import { useStore } from '../../store.js';

function pctOf(n, total) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

export function ProgressDonut() {
  const S = useStore();
  const p = S.progress;
  // Live orchestrator sessions (derived map, refreshed by the 4s poll).
  const liveCount = Object.keys(S.runningByStory || {}).length;

  // No tracked work yet (or no project) — honest empty state, no sample donut.
  if (!p || !p.total) {
    return html`
      <section class="dash-card donut-card">
        <p class="dash-card-title">Project Progress</p>
        <div class="dash-empty">
          <span>No tasks tracked yet</span>
          <code class="dash-empty-hint">/rcode-plan</code>
        </div>
      </section>
    `;
  }
  const completed = p.completed ?? 0;
  const inProgress = p.inProgress ?? 0;
  const notStarted = p.notStarted ?? 0;
  const total = p.total ?? (completed + inProgress + notStarted);
  const pct = p.pct ?? pctOf(completed, total);

  // Donut geometry — track + teal-gradient arc for the completed percentage.
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  const legend = [
    { label: 'Completed',   cls: 'donut-dot--done',  pct: pctOf(completed, total) },
    { label: 'In Progress', cls: 'donut-dot--prog',  pct: pctOf(inProgress, total) },
    { label: 'Not Started', cls: 'donut-dot--idle',  pct: pctOf(notStarted, total) },
  ];

  // Segmented bar widths — teal (completed) then purple (in progress).
  const tealW = pctOf(completed, total);
  const purpleW = pctOf(inProgress, total);

  return html`
    <section class="dash-card donut-card">
      <p class="dash-card-title">Project Progress</p>
      <div class="donut-body">
        <div class="donut-ring">
          <svg width="132" height="132" viewBox="0 0 132 132">
            <defs>
              <linearGradient id="donutTeal" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="var(--dash-teal)"/>
                <stop offset="100%" stop-color="var(--dash-purple)"/>
              </linearGradient>
            </defs>
            <circle cx="66" cy="66" r=${r} fill="none"
              stroke="var(--dash-border)" stroke-width="10"/>
            <circle cx="66" cy="66" r=${r} fill="none"
              stroke="url(#donutTeal)" stroke-width="10" stroke-linecap="round"
              stroke-dasharray=${c} stroke-dashoffset=${offset}
              transform="rotate(-90 66 66)"/>
          </svg>
          <div class="donut-center">
            <span class="donut-pct">${pct}%</span>
            <span class="donut-pct-label">complete</span>
          </div>
        </div>
        <ul class="donut-legend">
          ${legend.map(item => html`
            <li class="donut-legend-row" key=${item.label}>
              <span class=${'donut-dot ' + item.cls}></span>
              <span class="donut-legend-label">${item.label}</span>
              <span class="donut-legend-pct">${item.pct}%</span>
            </li>
          `)}
        </ul>
      </div>
      <p class="donut-summary">
        <strong>${completed}/${total}</strong> tasks completed
        ${liveCount > 0 ? html` <span class="donut-live">· ${liveCount} running now</span>` : null}
      </p>
      <svg class="donut-bar" width="100%" height="6" viewBox="0 0 100 6" preserveAspectRatio="none">
        <rect x="0" y="0" width="100" height="6" rx="3" fill="var(--dash-border)"/>
        <rect x="0" y="0" width=${tealW} height="6" fill="var(--dash-teal)"/>
        <rect x=${tealW} y="0" width=${purpleW} height="6" fill="var(--dash-purple)"/>
      </svg>
    </section>
  `;
}
