/**
 * MilestonesView — Preact component.
 *
 * Ports renderMilestones(subId) from client-render.js.
 * List mode: single M1 card with completion ring + summary tags.
 * Detail mode (subId = 'M1'): velocity bars, phase timeline, ring,
 *   attr grid, and phase cards.
 */

import { html } from '../preact.js';
import { useStore } from '../store.js';
import { pct, humanDate, allSprints, allTasks } from '../util.js';
import { CompletionRing, Breadcrumb, Tag, PhaseCard } from '../components/shared.js';
import { runningTotal } from '../orchestrator.js';
import { Icon } from '../icons-client.js';

function AttrItem({ label, value }) {
  return html`
    <div class="attr-item">
      <span class="attr-label">${label}</span>
      <span class="attr-value">${value}</span>
    </div>
  `;
}

function VelocityBars({ sprints }) {
  if (!sprints.length) return null;
  const maxV = Math.max(...sprints.map(s => Math.max(s.velocity_actual || 0, s.velocity_target || 0)), 1);
  return html`
    <div>
      <div class="view-title" style="margin-top:var(--space-6)">Velocity History</div>
      <div style="max-width:600px;">
        ${sprints.map(s => html`
          <div key=${s.id} class="velocity-bar">
            <div class="velocity-bar-label">S${s.id}</div>
            <div class="velocity-bar-track">
              <div class="velocity-bar-fill" style=${'width:' + ((s.velocity_actual || 0) / maxV * 100) + '%;background:var(--accent-blue);'}></div>
            </div>
            <div class="velocity-bar-val">${s.velocity_actual || 0}/${s.velocity_target || '—'}</div>
          </div>
        `)}
      </div>
    </div>
  `;
}

function PhaseTimeline({ phases }) {
  const phasesWithDates = phases.filter(p => (p.sprints || []).some(s => s.started_at));
  if (!phasesWithDates.length) return null;
  return html`
    <div>
      <div class="view-title" style="margin-top:var(--space-6)">Phase Timeline</div>
      <div class="phase-list">
        ${phasesWithDates.map(p => {
          const sps = p.sprints || [];
          const startDates = sps.map(s => s.started_at).filter(Boolean).sort();
          const endDates = sps.map(s => s.completed_at).filter(Boolean).sort().reverse();
          return html`
            <div key=${p.id} class="item">
              <div class="item-title">P${p.id} — ${p.name}</div>
              <div class="item-meta">
                ${startDates[0] ? humanDate(startDates[0]) : '?'} → ${endDates[0] ? humanDate(endDates[0]) : 'ongoing'}
              </div>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}

export function MilestonesView({ subId }) {
  const S = useStore();
  const phases = S.phases || [];
  const ms = S.milestone || 'M1';
  const total = allTasks(phases);
  const done = total.filter(t => t.status === 'done' || t.status === 'completed');

  if (subId) {
    const doneP = phases.filter(p => p.status === 'complete' || p.status === 'completed').length;
    const sprints = allSprints(phases).filter(s => s.velocity_actual != null);
    const runningNow = runningTotal();

    return html`
      <div id="view-milestones" class="view active">
        <${Breadcrumb} items=${[{ label: 'Milestones', hash: 'milestones' }]}/>
        <div class="entity-header">
          <div style="display:flex;align-items:center;gap:var(--space-6);">
            <div>
              <div class="entity-title"><${Icon} name="flag" size=${18}/> ${ms}</div>
            </div>
            <${CompletionRing} done=${done.length} total=${total.length}/>
          </div>
          <div class="attr-grid">
            <${AttrItem} label="Total Phases" value=${phases.length}/>
            <${AttrItem} label="Completed Phases" value=${doneP}/>
            <${AttrItem} label="Current Phase" value=${S.currentPhase || '—'}/>
            <${AttrItem} label="Current Sprint" value=${S.currentSprint || '—'}/>
            <${AttrItem} label="Tasks Done" value=${done.length + '/' + total.length}/>
            <${AttrItem} label="Progress" value=${pct(done.length, total.length)}/>
            <${AttrItem} label="Running now" value=${runningNow}/>
          </div>
        </div>
        <${VelocityBars} sprints=${sprints}/>
        <${PhaseTimeline} phases=${phases}/>
        <div class="view-title" style="margin-top:var(--space-6)">Phases under this milestone</div>
        <div class="phase-list">
          ${phases.map(p => html`<${PhaseCard} key=${p.id} phase=${p} S=${S}/>`)}
        </div>
      </div>
    `;
  }

  // List mode
  return html`
    <div id="view-milestones" class="view active">
      <div class="view-title">Milestones</div>
      <div class="phase-list">
        <div class="item item-clickable" onClick=${() => { location.hash = 'milestones/M1'; }}>
          <div style="display:flex;align-items:center;gap:var(--space-4);">
            <${CompletionRing} done=${done.length} total=${total.length}/>
            <div>
              <div class="item-title"><${Icon} name="flag" size=${18}/> ${ms}</div>
              <div class="item-meta">
                <${Tag}>${phases.length} phases</${Tag}>
                <${Tag}>${allSprints(phases).length} sprints</${Tag}>
                <${Tag}>${done.length}/${total.length} tasks done</${Tag}>
                <${Tag}>${pct(done.length, total.length)} complete</${Tag}>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
