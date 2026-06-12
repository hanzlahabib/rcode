/**
 * CurrentPhase — Overview redesign, Row 1 Card 2 (Current Phase stepper).
 *
 * Reads `currentPhase { id, name, status, next, startedDaysAgo, currentTask,
 * milestones[{name,state}] }` from the store (null when the project has no
 * phases; a legacy plain string from old state.json is tolerated). Renders a
 * rocket tile, the phase name with a status pill ("Up Next" when nothing is
 * active and this is the upcoming phase), the in-flight sprint goal as
 * subtitle, a completion line, then a horizontal milestone stepper built from
 * the phase's real sprints.
 *
 * Honest states: null phase → "No active phase" + command hint; a phase with
 * no sprints → "No sprints planned yet" instead of a fabricated stepper.
 * Pure: reads props/store only — never fetches. See DATA-CONTRACT.md.
 */

import { html } from '../../preact.js';
import { useStore } from '../../store.js';

// Humanise a free-form status into a short pill label.
function statusLabel(status) {
  if (!status) return 'Planned';
  return String(status)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Subtitle derived from the real phase status — never claims "active" for a
// phase that isn't. "executing" is what /rcode-execute writes mid-phase.
function statusSubtitle(status) {
  const s = String(status || '').toLowerCase();
  if (/complete|done/.test(s)) return 'Completed phase';
  if (/active|progress|executing/.test(s)) return 'Active development phase';
  return 'Not started yet';
}

export function CurrentPhase() {
  const S = useStore();
  const cp = S.currentPhase;
  // Tolerate the legacy plain-string shape from old state.json snapshots.
  const phase = cp == null ? null : (typeof cp === 'object' ? cp : { name: String(cp), status: '' });

  if (!phase || !phase.name) {
    return html`
      <section class="dash-card cp-card">
        <p class="dash-card-title">Current Phase</p>
        <div class="dash-empty">
          <span>No active phase</span>
          <code class="dash-empty-hint">/rcode-plan</code>
        </div>
      </section>
    `;
  }

  const milestones = Array.isArray(phase.milestones) ? phase.milestones : [];
  const done = milestones.filter(m => m.state === 'done').length;
  const pct = milestones.length
    ? Math.round((done / milestones.length) * 100)
    : null;
  const days = phase.startedDaysAgo;

  return html`
    <section class="dash-card cp-card">
      <p class="dash-card-title">Current Phase</p>

      <div class="cp-head">
        <div class="cp-rocket" aria-hidden="true">${phase.next ? '🧭' : '🚀'}</div>
        <div class="cp-headtext">
          <div class="cp-titlerow">
            <span class="cp-name">${phase.name}</span>
            <span class=${'cp-pill' + (phase.next ? ' cp-pill--next' : '')}>
              ● ${phase.next ? 'Up Next' : statusLabel(phase.status)}
            </span>
          </div>
          <p class="cp-sub">${phase.next
            ? 'No phase is active yet — this one is next in line'
            : (phase.currentTask || statusSubtitle(phase.status))}</p>
        </div>
      </div>

      ${pct != null ? html`
        <p class="cp-progress">
          ${days != null ? html`${days === 0 ? 'Started today' : `Started ${days} day${days === 1 ? '' : 's'} ago`}<span class="cp-dot">•</span>` : null}
          <span class="cp-pct">${done}/${milestones.length} sprints done<span class="cp-dot">•</span>${pct}% complete</span>
        </p>
      ` : null}

      ${milestones.length
        ? html`
          <ol class="cp-stepper">
            ${milestones.map((m, i) => html`
              <li class=${'cp-step cp-' + (m.state || 'todo')} key=${i}>
                <span class="cp-node">${m.state === 'done' ? '✓' : ''}</span>
                <span class="cp-label">${m.name}</span>
              </li>
            `)}
          </ol>
        `
        : html`
          <div class="dash-empty">
            <span>No sprints planned yet</span>
            <code class="dash-empty-hint">/rcode-sprint-planning</code>
          </div>
        `}
    </section>
  `;
}
