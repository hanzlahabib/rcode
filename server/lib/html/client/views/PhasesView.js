/**
 * PhasesView — Preact component.
 *
 * Ports renderPhases(subId) from client-render.js.
 * List mode: filter + phase cards.
 * Detail mode: entity header, attr grid, progress bar, Run/Terminal/View-plan
 *   buttons, sprint velocity bars, sprint cards, command hints accordion.
 */

import { html, useState } from '../preact.js';
import { useStore } from '../store.js';
import { pct, humanDate, phaseHints } from '../util.js';
import {
  Chip, ProgressBar, Breadcrumb, CmdHints, RunningBadge, SprintCard, PhaseCard,
} from '../components/shared.js';
import { openTermPanel, runningInPhase } from '../orchestrator.js';
import { openRunnerPicker } from '../components/RunnerPicker.js';
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
  const sprintsWithVel = sprints.filter(s => s.velocity_actual != null || s.velocity_target != null);
  if (!sprintsWithVel.length) return null;
  const maxV = Math.max(
    ...sprintsWithVel.map(s => Math.max(s.velocity_actual || 0, s.velocity_target || 0)),
    1,
  );
  return html`
    <div>
      <div class="view-title" style="margin-top:var(--space-6)">Sprint Velocity</div>
      <div style="max-width:600px;">
        ${sprintsWithVel.map(s => html`
          <div key=${s.id} class="velocity-bar">
            <div class="velocity-bar-label">S${s.id}</div>
            <div class="velocity-bar-track">
              <div class="velocity-bar-fill"
                style=${'width:' + ((s.velocity_actual || 0) / maxV * 100) + '%;'}></div>
            </div>
            <div class="velocity-bar-val">${s.velocity_actual || 0}/${s.velocity_target || '—'}</div>
          </div>
        `)}
      </div>
    </div>
  `;
}

function PhaseDetail({ phase: p, S }) {
  const sps = Array.isArray(p.sprints) ? p.sprints : [];
  const stories = sps.flatMap(s => (s && Array.isArray(s.stories) ? s.stories : []));
  const done = stories.filter(t => t.status === 'done' || t.status === 'completed').length;
  const running = runningInPhase(p);
  const hints = phaseHints(p);

  function handleRun(e) {
    e.stopPropagation();
    openRunnerPicker(e.currentTarget, {
      kind: 'session', storyId: 'phase-' + p.id, cmd: '/rcode-execute ' + p.id, title: 'Phase ' + p.id,
    });
  }
  function handleTerm(e) {
    e.stopPropagation();
    openTermPanel('phase-' + p.id, 'Phase ' + p.id);
  }
  function handleViewPlan(e) {
    e.stopPropagation();
    // Navigate to files view — viewPlanFile was a legacy DOM function
    window.location.hash = 'files';
  }

  return html`
    <div>
      <${Breadcrumb} items=${[{ label: 'All Phases', hash: 'phases' }]}/>
      <div class="entity-header">
        <div class="entity-title">
          <${Icon} name="clipboard-list" size=${18}/> Phase ${p.id} — ${p.name}
          <${RunningBadge} count=${running}/>
        </div>
        <div class="attr-grid">
          <${AttrItem} label="Status" value=${html`<${Chip} status=${p.status}/>`}/>
          <${AttrItem} label="Sprints" value=${sps.length}/>
          <${AttrItem} label="Tasks Done" value=${done + '/' + stories.length}/>
          <${AttrItem} label="Progress" value=${pct(done, stories.length)}/>
          ${p.completed_at ? html`<${AttrItem} label="Completed" value=${humanDate(p.completed_at)}/>` : null}
        </div>
      </div>
      <div style="margin-bottom:var(--space-4);">
        <${ProgressBar} done=${done} total=${stories.length}/>
      </div>
      <div class="term-action-bar">
        <button class="term-run-btn" onClick=${handleRun}>▶ Run Phase</button>
        <button class="term-run-btn outline" onClick=${handleTerm}><${Icon} name="monitor" size=${14}/> Terminal</button>
        <button class="back-btn" onClick=${handleViewPlan}><${Icon} name="file-text" size=${14}/> View plan file →</button>
      </div>
      <${VelocityBars} sprints=${sps}/>
      <div class="view-title" style="margin-top:var(--space-6)">Sprints</div>
      <div class="phase-list">
        ${sps.length
          ? sps.map(s => html`
              <${SprintCard} key=${s.id}
                sprint=${Object.assign({}, s, { phaseId: p.id, phaseName: p.name })}
                S=${S}/>
            `)
          : html`
              <div class="empty">
                No sprints in this phase yet.
                <div class="empty-action">Run /rcode-plan to create sprints</div>
              </div>
            `}
      </div>
      <${CmdHints} hints=${hints}/>
    </div>
  `;
}

export function PhasesView({ subId }) {
  const S = useStore();
  const phases = S.phases || [];
  const [filter, setFilter] = useState('');

  if (subId) {
    const p = phases.find(
      ph => String(ph.id) === String(subId) || String(ph.number) === String(subId),
    );
    if (!p) {
      return html`
        <div id="view-phases" class="view active">
          <${Breadcrumb} items=${[{ label: 'Phases', hash: 'phases' }]}/>
          <div class="empty">Phase not found.</div>
        </div>
      `;
    }
    return html`
      <div id="view-phases" class="view active">
        <${PhaseDetail} phase=${p} S=${S}/>
      </div>
    `;
  }

  // List mode
  const allComplete =
    phases.length > 0 &&
    phases.every(ph => ph.status === 'complete' || ph.status === 'completed' || ph.status === 'done');
  const plHints = [
    ['/rcode-add-phase', 'Add a new phase'],
    ['/rcode-stats',     'Project statistics'],
    ['/rcode-progress',  'Overall progress'],
  ];
  if (allComplete) {
    plHints.push(['/rcode-audit-milestone',    'Audit milestone completion']);
    plHints.push(['/rcode-complete-milestone', 'Complete and archive milestone']);
    plHints.push(['/rcode-ship',               'Create PR and ship']);
  }

  const q = filter.toLowerCase();
  const filtered = q
    ? phases.filter(p => (p.name || '').toLowerCase().includes(q) || String(p.id).includes(q))
    : phases;

  return html`
    <div id="view-phases" class="view active">
      <div class="view-title">Phases</div>
      <div class="filter-bar">
        <input class="filter-input" type="text" placeholder="Filter…"
          value=${filter} onInput=${e => setFilter(e.target.value)}/>
      </div>
      <div id="phases-inner" class="phase-list">
        ${filtered.length
          ? filtered.map(p => html`<${PhaseCard} key=${p.id} phase=${p} S=${S}/>`)
          : html`
              <div class="empty">
                No phases yet.
                <div class="empty-action">Run /rcode-new-project to start</div>
              </div>
            `}
      </div>
      <${CmdHints} hints=${plHints}/>
    </div>
  `;
}
