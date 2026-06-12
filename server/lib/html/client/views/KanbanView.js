/**
 * KanbanView — Preact port of renderKanban() from client-kanban.js.
 *
 * Displays a 4-column board (todo / in_progress / blocked / done) with
 * draggable cards. Drag-and-drop is visual-only (not persisted).
 *
 * Run/Stop/View card buttons call imported orchestrator functions (Sprint 31.4).
 */

import { html, useState, useCallback } from '../preact.js';
import { useStore, refresh } from '../store.js';
import { allTasks, currentPhaseName } from '../util.js';
import { runStory, stopStory, openOrchPanel } from '../orchestrator.js';
import { showToast } from '../components/shared.js';

// ---- Column descriptors ----
const COLS = [
  { id: 'todo',        label: 'Todo',       cssClass: 'col-todo' },
  { id: 'in_progress', label: 'In Progress', cssClass: 'col-prog' },
  { id: 'blocked',     label: 'Blocked',    cssClass: 'col-blocked' },
  { id: 'done',        label: 'Done',       cssClass: 'col-done' },
];

/** Map a stored task status to a canonical column id. */
function kanbanCol(status) {
  if (status === 'done' || status === 'completed') return 'done';
  if (status === 'in_progress' || status === 'active' || status === 'running') return 'in_progress';
  if (status === 'blocked') return 'blocked';
  return 'todo';
}

/** Return the effective column, hoisting to in_progress if a live session exists. */
function effCol(task, activeSessions) {
  const running = Array.isArray(activeSessions)
    ? activeSessions.some(s => s.storyId === task.id && s.status === 'running')
    : false;
  return (task.id && running) ? 'in_progress' : kanbanCol(task.status);
}

// ---- Card component ----
function KanbanCard({ task, col, onDragStart, onDragEnd }) {
  const sid    = task.id || '';
  const c      = col;
  const isRunning = c === 'in_progress';
  const canRun    = c === 'todo' || c === 'blocked';
  const pts       = task.points ? task.points + 'p' : null;
  const phase     = task.phaseId ? 'P' + task.phaseId : null;
  const sprintMeta = [pts, phase].filter(Boolean).join(' · ');

  function handleRun(e) {
    e.stopPropagation();
    runStory(sid);
  }
  function handleStop(e) {
    e.stopPropagation();
    stopStory(sid);
  }
  function handleView(e) {
    e.stopPropagation();
    openOrchPanel(sid);
  }

  return html`
    <div
      class=${'kanban-card s-' + c + (isRunning ? ' running' : '')}
      data-story-id=${sid}
      draggable=${!!sid}
      onDragStart=${sid ? onDragStart : undefined}
      onDragEnd=${sid ? onDragEnd : undefined}
    >
      <div class="kanban-card-header">
        <div class="kanban-card-title">${task.title || task.id || 'Untitled'}</div>
        ${sid ? html`<div class="kanban-card-id">${sid.slice(0, 8)}</div>` : null}
      </div>
      ${sprintMeta ? html`
        <div class="kanban-card-meta">
          <span class="kanban-card-sprint">${sprintMeta}</span>
          <span class="kanban-card-status">${COLS.find(co => co.id === c)?.label || c}</span>
        </div>
      ` : null}
      ${isRunning ? html`
        <div class="card-run-indicator" id=${'run-ind-' + sid}>
          <span class="run-pulse"></span>running
        </div>
      ` : null}
      ${sid ? html`
        <div class="kanban-card-actions">
          ${canRun ? html`
            <button class="kanban-run-btn" onClick=${handleRun}>▶ Run</button>
          ` : isRunning ? html`
            <button class="kanban-stop-btn" onClick=${handleStop}>■ Stop</button>
            <button class="kanban-view-btn" onClick=${handleView}>↗ View</button>
          ` : html`
            <button class="kanban-view-btn" onClick=${handleView}>↗ Logs</button>
          `}
        </div>
      ` : null}
    </div>
  `;
}

// ---- Column component ----
function KanbanColumn({ col, cards, onDragStart, onDragEnd, onDragOver, onDrop }) {
  return html`
    <div class=${'kanban-col ' + col.cssClass} data-col=${col.id}>
      <div class="kanban-col-head">
        <span class="col-label">
          <span class="col-status-dot"></span>
          ${col.label}
        </span>
        <span class="kanban-count">${cards.length}</span>
      </div>
      <div
        class="kanban-col-body"
        onDragOver=${e => { e.preventDefault(); onDragOver(e, col.id); }}
        onDrop=${e => { e.preventDefault(); onDrop(e, col.id); }}
      >
        ${cards.map(t => html`
          <${KanbanCard}
            key=${t.id || t.title}
            task=${t}
            col=${col.id}
            onDragStart=${e => onDragStart(e, t)}
            onDragEnd=${onDragEnd}
          />
        `)}
      </div>
    </div>
  `;
}

// ---- Root KanbanView ----
export function KanbanView() {
  const { phases, activeSessions, currentPhase, milestone } = useStore();
  const tasks = allTasks(phases);

  // ---- Local column state (visual DnD overrides) ----
  // Map<taskId, colId> — overrides the store-derived column for visual-only moves.
  const [visualMoves, setVisualMoves] = useState({});
  const [dragging, setDragging] = useState(null); // task being dragged

  function getColFor(task) {
    if (visualMoves[task.id]) return visualMoves[task.id];
    return effCol(task, activeSessions);
  }

  // Build buckets
  const buckets = { todo: [], in_progress: [], blocked: [], done: [] };
  for (const t of tasks) {
    const c = getColFor(t);
    if (buckets[c]) buckets[c].push(t);
    else buckets.todo.push(t);
  }

  // ---- DnD handlers ----
  function handleDragStart(e, task) {
    if (e.target.tagName === 'BUTTON') { e.preventDefault(); return; }
    setDragging(task);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget) e.currentTarget.style.opacity = '0.5';
  }

  function handleDragEnd(e) {
    if (e.currentTarget) e.currentTarget.style.opacity = '';
    setDragging(null);
  }

  function handleDragOver(e, colId) {
    e.preventDefault();
  }

  function handleDrop(e, colId) {
    if (!dragging || !dragging.id) return;
    setVisualMoves(prev => ({ ...prev, [dragging.id]: colId }));
    setDragging(null);
    showToast('Moved (visual only — not persisted)'); // visual only — not persisted
  }

  // ---- Manual refresh ----
  function handleSync() {
    refresh();
  }

  function handleSessions() {
    window.location.hash = 'orchestration';
  }

  if (!tasks.length) {
    return html`
      <div class="view active" id="view-kanban">
        <div class="kanban-topbar">
          <div class="kanban-topbar-title">
            <span class="orch-status-dot" id="orch-dot"></span>
            Kanban
          </div>
          <div class="kanban-topbar-actions">
            <button class="kanban-refresh-btn" onClick=${handleSync}>⟳ Sync</button>
            <button class="kanban-refresh-btn" style="margin-left:4px;" onClick=${handleSessions}>⊞ Sessions</button>
          </div>
        </div>
        <div class="empty" style="margin:24px;">
          No stories yet.
          ${(milestone || currentPhaseName(currentPhase)) ? html`
            <div class="empty-action">
              ${milestone ? html`Milestone <strong>${milestone}</strong>` : null}
              ${milestone && currentPhaseName(currentPhase) ? ' · ' : null}
              ${currentPhaseName(currentPhase) ? html`Phase <strong>${currentPhaseName(currentPhase)}</strong>` : null}
              ${' is active.'}
            </div>
          ` : null}
          <div class="empty-action">
            Run <code>/rcode-plan</code> to generate sprint stories, or browse
            planning docs in the <a href="#files">Files</a> view.
          </div>
        </div>
      </div>
    `;
  }

  return html`
    <div class="view active" id="view-kanban">
      <div class="kanban-topbar">
        <div class="kanban-topbar-title">
          <span class="orch-status-dot" id="orch-dot"></span>
          Kanban
        </div>
        <div class="kanban-topbar-actions">
          <button class="kanban-refresh-btn" onClick=${handleSync}>⟳ Sync</button>
          <button class="kanban-refresh-btn" style="margin-left:4px;" onClick=${handleSessions}>⊞ Sessions</button>
        </div>
      </div>
      <div class="kanban-board">
        ${COLS.map(col => html`
          <${KanbanColumn}
            key=${col.id}
            col=${col}
            cards=${buckets[col.id] || []}
            onDragStart=${handleDragStart}
            onDragEnd=${handleDragEnd}
            onDragOver=${handleDragOver}
            onDrop=${handleDrop}
          />
        `)}
      </div>
    </div>
  `;
}
