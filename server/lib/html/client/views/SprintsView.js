/**
 * SprintsView — Preact component.
 *
 * Ports renderSprints(subId) from client-render.js.
 * List mode: filter + sprint cards.
 * Detail mode: breadcrumb chain, entity header, attr grid, progress bar,
 *   Run/Terminal action bar, task cards, acceptance-criteria section,
 *   command hints.
 */

import { html, useState } from '../preact.js';
import { useStore } from '../store.js';
import { pct, humanDate, allSprints, sprintHints, chip, phaseMilestone } from '../util.js';
import {
  Chip, ProgressBar, Breadcrumb, CmdHints, RunningBadge, SprintCard, TaskCard,
} from '../components/shared.js';
import { openTermPanel, runningInSprint } from '../orchestrator.js';
import { openFileViewer } from '../store.js';
import { openRunnerPicker } from '../components/RunnerPicker.js';
import { Icon } from '../icons-client.js';
import { StatusSummaryBar } from '../components/StatusSummaryBar.js';
import { FilterChips } from '../components/FilterChips.js';

function AttrItem({ label, value }) {
  return html`
    <div class="attr-item">
      <span class="attr-label">${label}</span>
      <span class="attr-value">${value}</span>
    </div>
  `;
}

function SprintDetail({ sprint: s, S }) {
  const rawStories = Array.isArray(s.stories) ? s.stories : [];
  const stories = rawStories.map(t =>
    Object.assign({}, t, {
      sprintId: s.id,
      sprintGoal: s.goal || '',
      phaseId: s.phaseId,
      phaseName: s.phaseName,
      file: s.file || null,
    }),
  );
  const done = stories.filter(t => t.status === 'done' || t.status === 'completed').length;
  const running = runningInSprint(s);
  const hints = sprintHints(s);

  // Acceptance criteria section
  const storiesWithAc = stories.filter(t => t.acceptance);

  // Breadcrumb includes both "All Sprints" and optional "Phase N" link
  const breadcrumbItems = [{ label: 'All Sprints', hash: 'sprints' }];
  if (s.phaseId) breadcrumbItems.push({ label: 'Phase ' + s.phaseId, hash: 'phases/' + s.phaseId });

  function handleRun(e) {
    e.stopPropagation();
    openRunnerPicker(e.currentTarget, {
      kind: 'session', storyId: 'sprint-' + s.id, cmd: '/rcode-execute-sprint ' + s.id, title: 'Sprint ' + s.id,
    });
  }
  function handleTerm(e) {
    e.stopPropagation();
    openTermPanel('sprint-' + s.id, 'Sprint ' + s.id);
  }
  function handleViewPlan(e) {
    e.stopPropagation();
    openFileViewer(s.file, 'Sprint ' + s.id);
  }

  return html`
    <div>
      <${Breadcrumb} items=${breadcrumbItems}/>
      <div class="entity-header">
        <div class="entity-title">
          <${Icon} name="zap" size=${18}/> Sprint ${s.id}
          <${RunningBadge} count=${running}/>
        </div>
        <div class="attr-grid">
          <${AttrItem} label="Goal" value=${s.goal || '—'}/>
          <${AttrItem} label="Status" value=${html`<${Chip} status=${s.status}/>`}/>
          <${AttrItem} label="Phase" value=${'P' + s.phaseId + (s.phaseName ? ' — ' + s.phaseName : '')}/>
          <${AttrItem} label="Velocity"
            value=${(s.velocity_actual != null ? s.velocity_actual : '—') + ' / ' +
                    (s.velocity_target != null ? s.velocity_target : '—') + ' pts'}/>
          <${AttrItem} label="Tasks Done" value=${done + '/' + stories.length}/>
          <${AttrItem} label="Progress" value=${pct(done, stories.length)}/>
          ${s.started_at ? html`<${AttrItem} label="Started" value=${humanDate(s.started_at)}/>` : null}
          ${s.completed_at ? html`<${AttrItem} label="Completed" value=${humanDate(s.completed_at)}/>` : null}
        </div>
      </div>
      <div style="margin-bottom:var(--space-4);">
        <${ProgressBar} done=${done} total=${stories.length}/>
      </div>
      <div class="term-action-bar">
        <button class="term-run-btn" onClick=${handleRun}>▶ Run Sprint</button>
        <button class="term-run-btn outline" onClick=${handleTerm}><${Icon} name="monitor" size=${14}/> Terminal</button>
        ${s.file ? html`
          <button class="back-btn" onClick=${handleViewPlan}><${Icon} name="file-text" size=${14}/> View plan file →</button>
        ` : null}
      </div>
      <div class="view-title" style="margin-top:var(--space-4)">Tasks</div>
      <div class="phase-list">
        ${stories.length
          ? stories.map(t => html`<${TaskCard} key=${t.id || t.title} task=${t}/>`)
          : html`
              <div class="empty">
                No tasks in this sprint yet.
                <div class="empty-action">Run /rcode-create-story to add tasks</div>
              </div>
            `}
      </div>
      ${storiesWithAc.length ? html`
        <div class="view-title" style="margin-top:var(--space-6)">Acceptance Criteria</div>
        <div class="phase-list">
          ${storiesWithAc.map(t => html`
            <div key=${t.id || t.title} class="item">
              <div class="item-title">${t.title}</div>
              <div style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px;">
                ✓ ${t.acceptance}
              </div>
            </div>
          `)}
        </div>
      ` : null}
      <${CmdHints} hints=${hints}/>
    </div>
  `;
}

export function SprintsView({ subId, filters }) {
  const S = useStore();
  const sprints = allSprints(S.phases || []);
  const [filter, setFilter] = useState('');

  if (subId) {
    const s = sprints.find(sp => String(sp.id) === String(subId));
    if (!s) {
      return html`
        <div id="view-sprints" class="view active">
          <${Breadcrumb} items=${[{ label: 'All Sprints', hash: 'sprints' }]}/>
          <div class="empty">Sprint not found.</div>
        </div>
      `;
    }
    return html`
      <div id="view-sprints" class="view active">
        <${SprintDetail} sprint=${s} S=${S}/>
      </div>
    `;
  }

  // List mode — normalise incoming filter prop
  const f = filters || { status: '', milestone: '', date: '' };

  // Build option lists for FilterChips
  const distinctStatus = [...new Set(sprints.map(s => chip(s.status).cls))].filter(Boolean);
  const statusOptions = distinctStatus.map(cls => ({ value: cls, label: cls }));
  const milestoneOptions = [
    { value: 'M1', label: 'M1' },
    { value: 'M2', label: 'M2' },
    { value: 'M3', label: 'M3' },
  ];
  const dateOptions = [
    { value: 'has-completed', label: 'Completed' },
    { value: 'no-completed', label: 'In progress' },
  ];

  const curSp = sprints.find(sp => sp.id === S.currentSprint);
  const slHints = [
    ['/rcode-sprint-planning','Plan a new sprint'],
    ['/rcode-stats',          'Project statistics'],
  ];
  if (curSp) {
    slHints.push(['/rcode-execute',      'Execute current sprint ' + curSp.id]);
    slHints.push(['/rcode-sprint-status','Status of Sprint ' + curSp.id]);
  }

  const q = filter.toLowerCase();
  let filtered = q
    ? sprints.filter(s =>
        String(s.id).includes(q) ||
        (s.goal || '').toLowerCase().includes(q) ||
        (s.phaseName || '').toLowerCase().includes(q),
      )
    : sprints;

  // Apply chip filters
  if (f.status)    filtered = filtered.filter(s => chip(s.status).cls === f.status);
  if (f.milestone) filtered = filtered.filter(s => phaseMilestone(s.phaseId) === f.milestone);
  if (f.date === 'has-completed') filtered = filtered.filter(s => !!s.completed_at);
  if (f.date === 'no-completed')  filtered = filtered.filter(s => !s.completed_at);

  return html`
    <div id="view-sprints" class="view active">
      <div class="view-title">Sprints</div>
      <${StatusSummaryBar}/>
      <${FilterChips}
        filters=${f}
        statusOptions=${statusOptions}
        milestoneOptions=${milestoneOptions}
        dateOptions=${dateOptions}
      />
      <div class="filter-bar">
        <input class="filter-input" type="text" placeholder="Filter…"
          value=${filter} onInput=${e => setFilter(e.target.value)}/>
      </div>
      <div id="sprints-inner" class="phase-list">
        ${filtered.length
          ? filtered.map(s => html`<${SprintCard} key=${s.id} sprint=${s} S=${S}/>`)
          : html`
              <div class="empty">
                No sprints yet.
                <div class="empty-action">Run /rcode-plan to create sprints</div>
              </div>
            `}
      </div>
      <${CmdHints} hints=${slHints}/>
    </div>
  `;
}
