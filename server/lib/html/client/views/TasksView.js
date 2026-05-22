/**
 * TasksView — Preact component.
 *
 * Ports renderTasks() + renderTasksGrouped() from client-render.js.
 * Filter text, status filter, and sort are component useState — no DOM hacks.
 * Group-by-sprint is computed in render.
 */

import { html, useState, useMemo } from '../preact.js';
import { useStore } from '../store.js';
import { allTasks } from '../util.js';
import { CmdHints, TaskCard } from '../components/shared.js';

function TaskGrouped({ tasks }) {
  if (!tasks.length) return null;
  const groups = {};
  for (const t of tasks) {
    const key = t.sprintId || 'unassigned';
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  return html`
    ${Object.entries(groups).map(([sprintId, items]) => html`
      <div key=${sprintId} style="margin-bottom:var(--space-4);">
        <div style="font-size:var(--text-sm);font-weight:600;color:var(--text-muted);margin-bottom:var(--space-2);">
          Sprint ${sprintId}
        </div>
        ${items.map(t => html`<${TaskCard} key=${t.id || t.title} task=${t}/>`)}
      </div>
    `)}
  `;
}

export function TasksView() {
  const S = useStore();
  const rawTasks = allTasks(S.phases || []);

  const [textFilter, setTextFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('default');

  // Points totals
  const totalPts = rawTasks.reduce((sum, t) => sum + (t.points || 0), 0);
  const donePts = rawTasks
    .filter(t => t.status === 'done' || t.status === 'completed')
    .reduce((sum, t) => sum + (t.points || 0), 0);

  // Filtered + sorted tasks (computed in render — no DOM mutation)
  const tasks = useMemo(() => {
    let result = rawTasks;

    // Text filter
    const q = textFilter.toLowerCase().trim();
    if (q) {
      result = result.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.id || '').toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter) {
      result = result.filter(t => {
        const s = t.status || '';
        return statusFilter === 'done'
          ? (s === 'done' || s === 'completed')
          : s === statusFilter;
      });
    }

    // Sort
    if (sort === 'status') {
      result = [...result].sort((a, b) => (a.status || '').localeCompare(b.status || ''));
    } else if (sort === 'points-desc') {
      result = [...result].sort((a, b) => (b.points || 0) - (a.points || 0));
    } else if (sort === 'points-asc') {
      result = [...result].sort((a, b) => (a.points || 0) - (b.points || 0));
    }

    return result;
  }, [rawTasks, textFilter, statusFilter, sort]);

  // Command hints
  const allDone = rawTasks.length > 0 && rawTasks.every(t => t.status === 'done' || t.status === 'completed');
  const hasBlocked = rawTasks.some(t => t.status === 'blocked');
  const tHints = [
    ['/rcode-create-story',   'Add a new story/task'],
    ['/rcode-sprint-planning','Plan the next sprint'],
  ];
  if (allDone) {
    tHints.push(['/rcode-verify-work','Verify all tasks pass UAT']);
    tHints.push(['/rcode-audit-uat', 'Audit UAT coverage']);
  }
  if (hasBlocked) {
    tHints.push(['/rcode-debug',         'Debug blocked tasks']);
    tHints.push(['/rcode-correct-course','Course-correct blockers']);
  }

  // Empty state
  const phaseHint = S.currentPhase ? ' ' + S.currentPhase : '';

  return html`
    <div id="view-tasks" class="view active">
      <div class="view-title">Tasks</div>
      <div class="filter-bar">
        <input class="filter-input" type="text" placeholder="Filter…"
          value=${textFilter} onInput=${e => setTextFilter(e.target.value)}/>
        <select class="filter-select"
          value=${statusFilter}
          onChange=${e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
          <option value="blocked">Blocked</option>
        </select>
        <select class="filter-select"
          value=${sort}
          onChange=${e => setSort(e.target.value)}>
          <option value="default">Default order</option>
          <option value="status">By status</option>
          <option value="points-desc">Points ↓</option>
          <option value="points-asc">Points ↑</option>
        </select>
      </div>
      ${totalPts > 0 ? html`
        <div style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--space-4);">
          ${donePts}/${totalPts} points completed
        </div>
      ` : null}
      <div id="tasks-inner" class="phase-list">
        ${tasks.length
          ? (sort === 'default'
              ? html`<${TaskGrouped} tasks=${tasks}/>`
              : tasks.map(t => html`<${TaskCard} key=${t.id || t.title} task=${t}/>`))
          : html`
              <div class="empty">
                No tasks yet.
                <div class="empty-action">
                  Run <code>/rcode-plan${phaseHint}</code> to generate tasks for this project.
                </div>
              </div>
            `}
      </div>
      <${CmdHints} hints=${tHints}/>
    </div>
  `;
}
