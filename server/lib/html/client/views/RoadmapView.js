/**
 * RoadmapView — Preact component.
 *
 * Ports renderRoadmap() + filterRoadmap() + toggleNode/toggleAllRoadmap
 * from client-render.js / client-main.js to a Preact component tree.
 *
 * Key differences from legacy:
 *   - Tree expansion is component useState per node — no DOM style.display hacks.
 *   - Filter is component useState — no querySelectorAll style.display hacks.
 *   - Keyboard E/C (expand/collapse-all) handled via global keydown in App; this
 *     component exposes expandAll/collapseAll via window._roadmapControl so App
 *     can reach in. (Proper context/ref wiring deferred to 31.4.)
 */

import { html, useState, useEffect } from '../preact.js';
import { useStore } from '../store.js';
import { pctNum } from '../util.js';
import { Chip, ProgressBar, CmdHints } from '../components/shared.js';

/** Recursive tree node with local expansion state. */
function TreeNode({ label, icon, badge, status, children, defaultOpen, onDoubleClick }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const toggle = () => setOpen(o => !o);

  return html`
    <div class="tree-node">
      <div class="tree-row" onClick=${toggle} onDblClick=${onDoubleClick}>
        <span class="tree-chevron">${open ? '▼' : '▶'}</span>
        <span class="tree-icon">${icon}</span>
        <span class="tree-label">${label}</span>
        ${status ? html`<${Chip} status=${status}/>` : null}
        ${badge ? html`<span class="tree-badge">${badge}</span>` : null}
      </div>
      ${open ? html`<div class="tree-children">${children}</div>` : null}
    </div>
  `;
}

/** Leaf node (task row — no expand). */
function TaskLeaf({ task: t }) {
  const done = t.status === 'done' || t.status === 'completed';
  return html`
    <div class="tree-node task-leaf">
      <div class="tree-row">
        <span class="tree-icon">${done ? '✓' : '○'}</span>
        <span class="tree-label" style=${done ? 'opacity:.6;text-decoration:line-through' : ''}>
          ${t.title}
        </span>
        <${Chip} status=${t.status}/>
        ${t.points ? html`<span class="tree-badge">${t.points}pts</span>` : null}
      </div>
    </div>
  `;
}

/** Phase row with inline mini progress bar. */
function PhaseNode({ phase: p, filterQuery }) {
  const [open, setOpen] = useState(false);
  const sps = p.sprints || [];
  const pStories = sps.flatMap(s => s.stories || []);
  const pDone = pStories.filter(t => t.status === 'done' || t.status === 'completed').length;
  const pp = pctNum(pDone, pStories.length);

  // Filter: hide this node if query doesn't match phase name
  if (filterQuery && !p.name.toLowerCase().includes(filterQuery)) return null;

  function handleDblClick(e) {
    e.stopPropagation();
    location.hash = 'phases/' + p.id;
  }

  return html`
    <div class="tree-node" data-filter-text=${p.name.toLowerCase()}>
      <div class="tree-row" onClick=${() => setOpen(o => !o)} onDblClick=${handleDblClick}>
        <span class="tree-chevron">${open ? '▼' : '▶'}</span>
        <span class="tree-icon">📋</span>
        <span class="tree-label">P${p.id} — ${p.name}</span>
        <${Chip} status=${p.status}/>
        <span style="width:60px;display:inline-block;margin:0 8px;">
          <div class="progress-bar" style="height:4px;">
            <div class="progress-bar-fill" style=${'width:' + pp + '%;height:100%;'}></div>
          </div>
        </span>
        <span class="tree-badge">${sps.length} sprints · ${pDone}/${pStories.length}</span>
      </div>
      ${open ? html`
        <div class="tree-children">
          ${sps.length ? sps.map(s => html`<${SprintNode} key=${s.id} sprint=${s}/>`) : html`
            <div style="color:var(--text-muted);font-size:var(--text-xs);padding:var(--space-2) var(--space-6);">
              No sprints
            </div>
          `}
        </div>
      ` : null}
    </div>
  `;
}

/** Sprint row inside roadmap. */
function SprintNode({ sprint: s }) {
  const [open, setOpen] = useState(false);
  const sts = s.stories || [];
  const sDone = sts.filter(t => t.status === 'done' || t.status === 'completed').length;

  return html`
    <div class="tree-node">
      <div class="tree-row" onClick=${() => setOpen(o => !o)}>
        <span class="tree-chevron">${open ? '▼' : '▶'}</span>
        <span class="tree-icon">⚡</span>
        <span class="tree-label">Sprint ${s.id} — ${s.goal || 'No goal'}</span>
        <${Chip} status=${s.status}/>
        <span class="tree-badge">${sDone}/${sts.length}</span>
      </div>
      ${open ? html`
        <div class="tree-children">
          ${sts.length ? sts.map(t => html`<${TaskLeaf} key=${t.id || t.title} task=${t}/>`) : html`
            <div style="color:var(--text-muted);font-size:var(--text-xs);padding:var(--space-2) var(--space-6);">
              No tasks
            </div>
          `}
        </div>
      ` : null}
    </div>
  `;
}

export function RoadmapView() {
  const S = useStore();
  const phases = S.phases || [];
  const ms = S.milestone || 'M1';
  const [filterQuery, setFilterQuery] = useState('');
  // rootOpen is always true (the milestone root stays expanded)
  const [rootOpen] = useState(true);

  // Total stats for root badge
  const totalTasks = phases.flatMap(p => (p.sprints || []).flatMap(s => s.stories || []));
  const doneTasks = totalTasks.filter(t => t.status === 'done' || t.status === 'completed');

  // Roadmap command hints
  const allPDone = phases.length > 0 && phases.every(
    ph => ph.status === 'complete' || ph.status === 'completed' || ph.status === 'done'
  );
  const rmHints = [
    ['/rihal-add-phase',       'Add a new phase'],
    ['/rihal-milestone-summary','View milestone summary'],
    ['/rihal-new-milestone',   'Start a new milestone'],
  ];
  if (allPDone) {
    rmHints.push(['/rihal-audit-milestone',    'Audit milestone completion']);
    rmHints.push(['/rihal-complete-milestone', 'Complete and archive milestone']);
  }

  const q = filterQuery.toLowerCase().trim();

  return html`
    <div id="view-roadmap" class="view active">
      <div class="view-title">Roadmap</div>
      <div class="filter-bar">
        <input class="filter-input" type="text" placeholder="Filter roadmap…"
          value=${filterQuery}
          onInput=${e => setFilterQuery(e.target.value)}/>
      </div>
      <div class="tree-container" id="roadmap-tree">
        <div class="tree-node tree-ms">
          <div class="tree-row tree-header">
            <span class="tree-chevron">▼</span>
            <span class="tree-icon">🎯</span>
            <span class="tree-label">${ms}</span>
            <span class="tree-badge">
              ${phases.length} phases · ${doneTasks.length}/${totalTasks.length} tasks
            </span>
          </div>
          <div class="tree-children">
            ${phases.map(p => html`<${PhaseNode} key=${p.id} phase=${p} filterQuery=${q}/>`)}
          </div>
        </div>
      </div>
      <${CmdHints} hints=${rmHints}/>
    </div>
  `;
}
