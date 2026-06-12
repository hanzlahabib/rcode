/**
 * CurrentPhase — Overview redesign, Row 1 Card 2 (Current Phase stepper).
 *
 * Reads `currentPhase { name, status, milestones[{name,state}] }` from the
 * store. Renders a rocket tile, the phase name in purple with an "In Progress"
 * status pill, a muted subtitle, a "Started N days ago • X% complete" line,
 * then a horizontal 5-step milestone stepper with a connecting line.
 *
 * Pure: reads props/store only — never fetches. Falls back to a representative
 * sample when the slice is undefined so the card renders standalone.
 * See .planning/campaign/DATA-CONTRACT.md.
 */

import { html } from '../../preact.js';
import { useStore } from '../../store.js';

// Representative fallback so the card renders before data agent A10 populates
// the real store (DATA-CONTRACT.md § currentPhase).
const SAMPLE = {
  name: 'Phase 8 — Foundation',
  status: 'in_progress',
  startedDaysAgo: 6,
  milestones: [
    { name: 'Vendor Preact', state: 'done' },
    { name: 'Design tokens', state: 'done' },
    { name: 'Build shell', state: 'active' },
    { name: 'Wire API', state: 'todo' },
    { name: 'Ship cards', state: 'todo' },
  ],
};

// Humanise a free-form status into a short pill label.
function statusLabel(status) {
  if (!status) return 'In Progress';
  return String(status)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function CurrentPhase() {
  const S = useStore();
  const phase = S.currentPhase || SAMPLE;
  const milestones = (phase.milestones && phase.milestones.length)
    ? phase.milestones
    : SAMPLE.milestones;

  const done = milestones.filter(m => m.state === 'done').length;
  const pct = milestones.length
    ? Math.round((done / milestones.length) * 100)
    : 0;
  const days = phase.startedDaysAgo;

  return html`
    <section class="dash-card cp-card">
      <p class="dash-card-title">Current Phase</p>

      <div class="cp-head">
        <div class="cp-rocket" aria-hidden="true">🚀</div>
        <div class="cp-headtext">
          <div class="cp-titlerow">
            <span class="cp-name">${phase.name}</span>
            <span class="cp-pill">● ${statusLabel(phase.status)}</span>
          </div>
          <p class="cp-sub">Active development phase</p>
        </div>
      </div>

      <p class="cp-progress">
        ${days != null ? html`Started ${days} day${days === 1 ? '' : 's'} ago` : 'In progress'}
        <span class="cp-dot">•</span>
        <span class="cp-pct">${pct}% complete</span>
      </p>

      <ol class="cp-stepper">
        ${milestones.map((m, i) => html`
          <li class=${'cp-step cp-' + (m.state || 'todo')} key=${i}>
            <span class="cp-node">${m.state === 'done' ? '✓' : ''}</span>
            <span class="cp-label">${m.name}</span>
          </li>
        `)}
      </ol>
    </section>
  `;
}
