/**
 * ProgressTimeline — Overview redesign, Row 3 Card 2 (horizontal phases).
 *
 * "Progress Timeline" card + "View full timeline" link. A horizontal track with
 * date ticks across the top and one segment per phase (Planning, Design,
 * Development, Testing, Launch). Each segment shows its date range and a state
 * badge: Completed → green, In Progress → purple, Upcoming → gray.
 * Reads `phases[{ name, range, state }]` from the store. An empty array is
 * real data — rendered as an honest "No phases yet" state with a command hint,
 * never substituted with sample phases.
 * See .planning/campaign/DATA-CONTRACT.md. Reads props/store only — no fetch.
 */

import { html } from '../../preact.js';
import { useStore, openFileViewer } from '../../store.js';
import { pressable } from '../shared.js';

// Map phase state → label + badge/segment modifier.
function stateMeta(state) {
  const s = String(state || '').toLowerCase();
  if (s === 'done')   return { label: 'Completed',   mod: 'pt-seg--done'   };
  if (s === 'active') return { label: 'In Progress', mod: 'pt-seg--active' };
  return { label: 'Upcoming', mod: 'pt-seg--todo' };
}

// Max segments shown at once — the mockup track is designed for ~5; real
// projects can have 20+ phases, which would cram into unreadable slivers.
const MAX_SEGMENTS = 6;

/** Window of at most MAX_SEGMENTS phases centered on the active one (or the
 *  done/todo boundary when nothing is active), so the card shows where the
 *  project currently is. "View full timeline" covers the rest. */
function visibleWindow(phases) {
  if (phases.length <= MAX_SEGMENTS) return phases;
  let center = phases.findIndex(p => String(p.state).toLowerCase() === 'active');
  if (center === -1) {
    const firstTodo = phases.findIndex(p => String(p.state).toLowerCase() !== 'done');
    center = firstTodo === -1 ? phases.length - 1 : firstTodo;
  }
  let start = Math.max(0, center - Math.floor(MAX_SEGMENTS / 2));
  start = Math.min(start, phases.length - MAX_SEGMENTS);
  return phases.slice(start, start + MAX_SEGMENTS);
}

export function ProgressTimeline() {
  const S = useStore();
  const all = Array.isArray(S.phases) ? S.phases : [];

  if (!all.length) {
    return html`
      <section class="dash-card">
        <div class="pt-head">
          <p class="dash-card-title">Progress Timeline</p>
        </div>
        <div class="dash-empty">
          <span>No phases yet</span>
          <code class="dash-empty-hint">/rcode-plan</code>
        </div>
      </section>
    `;
  }

  const phases = visibleWindow(all);

  // Date ticks across the top — the start of each visible phase range, plus
  // the end of the last range, so the axis brackets the visible window.
  const ticks = phases.map(p => String(p.range || '').split('–')[0].trim());
  const lastEnd = String(phases[phases.length - 1]?.range || '').split('–')[1];
  if (lastEnd) ticks.push(lastEnd.trim());

  return html`
    <section class="dash-card">
      <div class="pt-head">
        <p class="dash-card-title">Progress Timeline</p>
        <button class="pt-viewall" onClick=${() => { location.hash = 'phases'; }}>
          View full timeline
        </button>
      </div>

      <div class="pt-ticks">
        ${ticks.map((t, i) => html`<span class="pt-tick" key=${'tick' + i}>${t}</span>`)}
      </div>

      <div class="pt-track">
        ${phases.map((p, i) => {
          const m = stateMeta(p.state);
          // Same "first sprint with a resolved file" lookup PhasesView uses
          // for its "View plan file" button. Falls back to the phase detail
          // page when nothing resolved (e.g. phase has no SPRINT.md yet).
          const sps = Array.isArray(p.sprints) ? p.sprints : [];
          const planFile = (sps.find(s => s.file) || {}).file || null;
          const onActivate = planFile
            ? () => openFileViewer(planFile, 'Phase ' + (p.id != null ? p.id : '') + ' plan')
            : () => { location.hash = p.id != null ? 'phases/' + p.id : 'phases'; };
          return html`
            <div class=${'pt-seg ovr-link ' + m.mod} key=${p.name + i} ...${pressable(onActivate)}>
              <span class="pt-seg-name">${p.name}</span>
              <span class="pt-seg-range">${p.range || ''}</span>
              <span class="pt-seg-badge">${m.label}</span>
            </div>
          `;
        })}
      </div>
    </section>
  `;
}
