/**
 * ProgressTimeline — Overview redesign, Row 3 Card 2 (horizontal phases).
 *
 * "Progress Timeline" card + "View full timeline" link. A horizontal track with
 * date ticks across the top and one segment per phase (Planning, Design,
 * Development, Testing, Launch). Each segment shows its date range and a state
 * badge: Completed → green, In Progress → purple, Upcoming → gray.
 * Reads `phases[{ name, range, state }]` from the store; falls back to
 * representative sample data so the card renders standalone.
 * See .planning/campaign/DATA-CONTRACT.md. Reads props/store only — no fetch.
 */

import { html } from '../../preact.js';
import { useStore } from '../../store.js';

// Representative sample used when the store slice is empty/undefined.
const SAMPLE = [
  { name: 'Planning',    range: 'Jun 1 – Jun 7',   state: 'done'   },
  { name: 'Design',      range: 'Jun 8 – Jun 14',  state: 'done'   },
  { name: 'Development', range: 'Jun 15 – Jul 5',  state: 'active' },
  { name: 'Testing',     range: 'Jul 6 – Jul 19',  state: 'todo'   },
  { name: 'Launch',      range: 'Jul 20 – Aug 1',  state: 'todo'   },
];

// Map phase state → label + badge/segment modifier.
function stateMeta(state) {
  const s = String(state || '').toLowerCase();
  if (s === 'done')   return { label: 'Completed',   mod: 'pt-seg--done'   };
  if (s === 'active') return { label: 'In Progress', mod: 'pt-seg--active' };
  return { label: 'Upcoming', mod: 'pt-seg--todo' };
}

export function ProgressTimeline() {
  const S = useStore();
  const phases = (S.phases && S.phases.length) ? S.phases : SAMPLE;

  // Date ticks across the top — the start of each phase range, plus the end of
  // the last range, so the axis brackets the whole timeline.
  const ticks = phases.map(p => String(p.range || '').split('–')[0].trim());
  const lastEnd = String(phases[phases.length - 1]?.range || '').split('–')[1];
  if (lastEnd) ticks.push(lastEnd.trim());

  return html`
    <section class="dash-card">
      <div class="pt-head">
        <p class="dash-card-title">Progress Timeline</p>
        <button class="pt-viewall" onClick=${() => { location.hash = 'timeline'; }}>
          View full timeline
        </button>
      </div>

      <div class="pt-ticks">
        ${ticks.map((t, i) => html`<span class="pt-tick" key=${'tick' + i}>${t}</span>`)}
      </div>

      <div class="pt-track">
        ${phases.map((p, i) => {
          const m = stateMeta(p.state);
          return html`
            <div class=${'pt-seg ' + m.mod} key=${p.name + i}>
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
