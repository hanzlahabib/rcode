/**
 * Shared visual-primitive Preact components.
 *
 * All components are stateless unless noted. Each ports its string-template
 * counterpart from client-render.js exactly, preserving CSS class names.
 *
 * Import from here; do NOT inline these in view modules.
 */

import { html, useState } from '../preact.js';
import { pctNum, chip as chipDesc, humanDate, pct, currentPhaseId } from '../util.js';
import {
  isSessionRunning, runningInSprint, runningInPhase,
} from '../orchestrator.js';
import { getState } from '../store.js';
import { Icon } from '../icons-client.js';
import { TaskPipeline } from './TaskPipeline.js';
import { openRunnerPicker } from './RunnerPicker.js';

// ---- Toast helper (shared by CmdHint copy action and any view) ----
export function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

// ---- pressable ----
/**
 * Spreadable props that make a clickable non-button element keyboard
 * accessible: focusable, announced as a button, activated by Enter/Space.
 * Usage: html`<div class="item item-clickable" ...${pressable(fn)}>…</div>`
 */
export function pressable(onActivate) {
  return {
    role: 'button',
    tabindex: 0,
    onClick: onActivate,
    onKeyDown: (e) => {
      // Ignore keydown bubbling up from nested interactive elements
      // (e.g. a Run button inside a clickable card row).
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate(e);
      }
    },
  };
}

// ---- Chip ----
/**
 * Status chip.
 * @param {{ status: string }} props
 */
export function Chip({ status }) {
  const { cls, label } = chipDesc(status);
  return html`<span class=${'status-chip ' + cls}>● ${label}</span>`;
}

// ---- Tag ----
/**
 * Inline label tag.
 * @param {{ children: any }} props
 */
export function Tag({ children }) {
  return html`<span class="tag">${children}</span>`;
}

// ---- ProgressBar ----
/**
 * Horizontal progress bar matching progressBar() in client-render.js.
 * @param {{ done: number, total: number }} props
 */
export function ProgressBar({ done, total }) {
  const p = pctNum(done, total);
  const color =
    p >= 100 ? 'var(--accent-green)' :
    p > 50   ? 'var(--accent-blue)'  :
               'var(--accent-amber)';
  return html`
    <div class="progress-bar">
      <div class="progress-bar-fill" style=${'width:' + p + '%;background:' + color}></div>
    </div>
  `;
}

// ---- CompletionRing ----
/**
 * SVG completion ring matching completionRing() in client-render.js.
 * @param {{ done: number, total: number }} props
 */
export function CompletionRing({ done, total }) {
  const p = pctNum(done, total);
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;
  return html`
    <div class="completion-ring">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r=${r} fill="none" stroke="var(--border)" stroke-width="4"/>
        <circle cx="32" cy="32" r=${r} fill="none" stroke="var(--accent-green)" stroke-width="4"
          stroke-dasharray=${c} stroke-dashoffset=${offset} stroke-linecap="round"/>
      </svg>
      <span class="ring-text">${p}%</span>
    </div>
  `;
}

// ---- Breadcrumb ----
/**
 * Back-button breadcrumb row.
 * @param {{ items: Array<{label: string, hash: string}> }} props
 */
export function Breadcrumb({ items }) {
  return html`
    <div class="breadcrumb">
      ${items.map(item => html`
        <button class="back-btn" onClick=${() => { location.hash = item.hash; }}>
          ← ${item.label}
        </button>
      `)}
    </div>
  `;
}

// ---- CmdHint + CmdHints ----
/**
 * Single command hint row — copy to clipboard on click.
 * @param {{ cmd: string, desc: string }} props
 */
export function CmdHint({ cmd, desc }) {
  function handleClick() {
    navigator.clipboard.writeText(cmd)
      .then(() => showToast('Copied: ' + cmd))
      .catch(() => {
        const ta = document.createElement('textarea');
        ta.value = cmd;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copied: ' + cmd);
      });
  }
  return html`
    <div class="cmd-hint-item" ...${pressable(handleClick)}>
      <span class="cmd-text">${cmd}</span>
      <span class="cmd-desc">${desc}</span>
      <${Icon} name="copy" size=${14} cls="cmd-copy"/>
    </div>
  `;
}

/**
 * Collapsible command-hints accordion.
 * @param {{ hints: Array<[string, string]> }} props — each item is [cmd, desc]
 */
export function CmdHints({ hints }) {
  if (!hints || !hints.length) return null;
  return html`
    <details class="cmd-hints">
      <summary><${Icon} name="lightbulb" size=${14}/> Commands</summary>
      <div class="cmd-hints-list">
        ${hints.map(([cmd, desc]) => html`<${CmdHint} key=${cmd} cmd=${cmd} desc=${desc}/>`)}
      </div>
    </details>
  `;
}

// ---- RunBtn ----
/**
 * Compact run button. Opens the runner/model picker popover anchored to the
 * button; the picker launches the session via runAndOpenTerm.
 * @param {{ storyId: string, cmd: string, label: string }} props
 */
export function RunBtn({ storyId, cmd, label }) {
  // Plain read (not a subscription) — every parent view already re-renders
  // on store changes, so the disabled state stays current with the 4s poll.
  const down = getState().orchOnline === false;
  function handleClick(e) {
    e.stopPropagation();
    openRunnerPicker(e.currentTarget, { kind: 'session', storyId, cmd, title: label });
  }
  return html`
    <button class="card-run-btn" disabled=${down}
      title=${down ? 'Orchestrator unreachable' : 'Run ' + label}
      onClick=${handleClick}>
      ▶ Run
    </button>
  `;
}

// ---- RunningBadge ----
/**
 * "N running" badge. Returns null when count is 0.
 * @param {{ count: number }} props
 */
export function RunningBadge({ count }) {
  if (!count) return null;
  return html`<span class="run-badge">● ${count} running</span>`;
}

// ---- PhaseCard ----
/**
 * Clickable phase card used in Milestones, Phases, and Roadmap views.
 * Ports phaseCard() from client-render.js:146-165.
 * @param {{ phase: object, S: object }} props
 */
export function PhaseCard({ phase: p, S }) {
  const sps = p.sprints || [];
  const stories = sps.flatMap(s => s.stories || []);
  const done = stories.filter(t => t.status === 'done' || t.status === 'completed').length;
  // currentPhase is the contract object (or legacy string) — compare by id.
  const cpId = currentPhaseId(S && S.currentPhase);
  const isCur = cpId !== '' && String(p.id) === cpId;
  const running = runningInPhase(p);
  const borderStyle = isCur ? 'border-left-color:var(--accent-amber)' : '';
  return html`
    <div class=${'item item-clickable'} style=${borderStyle}
      ...${pressable(() => { location.hash = 'phases/' + p.id; })}>
      <div class="item-title">
        ${sps.length ? html`<${RunBtn} storyId=${'phase-' + p.id} cmd=${'/rcode-execute ' + p.id} label=${'Phase ' + p.id}/>` : null}
        Phase ${p.id} — ${p.name}
        ${isCur ? html`<${Tag}>current</${Tag}>` : null}
        <${Chip} status=${p.status}/>
      </div>
      <div class="item-meta">
        <${Tag}>${sps.length} sprint${sps.length !== 1 ? 's' : ''}</${Tag}>
        <${Tag}>${done}/${stories.length} tasks</${Tag}>
        ${stories.length > 0 ? html`<${Tag}>${pct(done, stories.length)} done</${Tag}>` : null}
        ${p.completed_at ? html`
          <span style="color:var(--text-muted);font-size:var(--text-xs);">
            Done ${humanDate(p.completed_at)}
          </span>
        ` : null}
        <${RunningBadge} count=${running}/>
      </div>
      ${stories.length > 0 ? html`
        <div style="margin-top:6px;"><${ProgressBar} done=${done} total=${stories.length}/></div>
      ` : null}
      ${sps[0]?.goal ? html`
        <div style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px;">
          ${sps[0].goal}
        </div>
      ` : null}
    </div>
  `;
}

// ---- SprintCard ----
/**
 * Clickable sprint card used in Phases, Sprints, and Roadmap views.
 * Ports sprintCard() from client-render.js:167-188.
 * @param {{ sprint: object, S: object }} props
 */
export function SprintCard({ sprint: s, S }) {
  const stories = s.stories || [];
  const done = stories.filter(t => t.status === 'done' || t.status === 'completed').length;
  const isCur = s.id === (S && S.currentSprint);
  const phaseId = s.phaseId || s.id || '';
  const running = runningInSprint(s);
  const borderStyle = isCur
    ? 'border-left-color:var(--accent-amber);background:rgba(245,158,11,0.04)'
    : '';
  return html`
    <div class=${'item item-clickable' + (isCur ? ' sprint-current' : '')} style=${borderStyle}
      ...${pressable(() => { location.hash = 'sprints/' + s.id; })}>
      <div class="item-title">
        <${RunBtn} storyId=${'sprint-' + s.id} cmd=${'/rcode-execute-sprint ' + s.id} label=${'Sprint ' + s.id}/>
        Sprint ${s.id} — ${s.goal || 'No goal'}
        ${isCur ? html`<${Tag}>current</${Tag}>` : null}
        <${Chip} status=${s.status}/>
      </div>
      <div class="item-meta">
        ${s.phaseId ? html`<${Tag}>Phase ${s.phaseId}</${Tag}>` : null}
        <${Tag}>${done}/${stories.length} tasks</${Tag}>
        ${s.velocity_target != null ? html`<${Tag}>Target: ${s.velocity_target}pts</${Tag}>` : null}
        ${s.velocity_actual != null ? html`<${Tag}>Actual: ${s.velocity_actual}pts</${Tag}>` : null}
        <${RunningBadge} count=${running}/>
      </div>
      <div style="margin-top:6px;"><${ProgressBar} done=${done} total=${stories.length}/></div>
      ${stories.length === 0 ? html`
        <div class="empty-action" style="margin-top:var(--space-2);font-size:var(--text-xs);">
          No tasks — run <code>/rcode-plan ${phaseId}</code> to populate
        </div>
      ` : null}
      ${s.started_at ? html`
        <div style="color:var(--text-muted);font-size:var(--text-xs);margin-top:4px;">
          ${humanDate(s.started_at)}${s.completed_at ? ' → ' + humanDate(s.completed_at) : ' → ongoing'}
        </div>
      ` : null}
    </div>
  `;
}

// ---- TaskCard ----
/**
 * Expandable task card. Expansion is component useState (replaces toggleTaskDetail).
 * Ports taskCard() from client-render.js:190-234.
 * @param {{ task: object }} props
 */
export function TaskCard({ task: t }) {
  const [expanded, setExpanded] = useState(false);
  const done = t.status === 'done' || t.status === 'completed';
  const running = isSessionRunning(t.id);

  // Build cmd hints for this task
  const taskCmds = [];
  if (t.id) {
    if (!done) {
      taskCmds.push(['/rcode-dev-story ' + t.id, 'Implement this story']);
      taskCmds.push(['/rcode-create-story ' + (t.sprintId || ''), 'Add related story']);
    } else {
      taskCmds.push(['/rcode-verify-work ' + t.id, 'Verify this story']);
      taskCmds.push(['/rcode-review ' + t.id, 'Review code for this story']);
    }
    if (t.sprintId) {
      taskCmds.push(['/rcode-sprint-status ' + t.sprintId, 'Sprint ' + t.sprintId + ' status']);
    }
  }

  return html`
    <div class="item item-clickable" data-status=${t.status || ''}
      style=${done ? 'opacity:.65' : ''}
      aria-expanded=${expanded}
      ...${pressable(() => setExpanded(e => !e))}>
      <div class="item-title" style=${done ? 'text-decoration:line-through' : ''}>
        ${t.id && !done ? html`<${RunBtn} storyId=${t.id} cmd=${'/rcode-dev-story ' + t.id} label=${'Story ' + t.id}/>` : null}
        ${done ? '✓ ' : ''}${t.title}
        <${Chip} status=${t.status}/>
        <span class="task-expand-icon">${expanded ? '▼' : '▶'}</span>
      </div>
      <div class="item-meta">
        ${t.points ? html`<${Tag}>${t.points}pts</${Tag}>` : null}
        ${t.id ? html`<${Tag}>${t.id}</${Tag}>` : null}
        ${t.sprintId ? html`<${Tag}>Sprint ${t.sprintId}</${Tag}>` : null}
        ${t.phaseId ? html`<${Tag}>Phase ${t.phaseId}</${Tag}>` : null}
        ${t.id && running ? html`<span class="run-badge"><span class="live-dot"></span>running</span>` : null}
        <${TaskPipeline} task=${t} running=${t.id && running}/>
      </div>
      ${expanded ? html`
        <div class="task-detail">
          ${t.id ? html`<div class="task-detail-row"><strong>ID:</strong> <code>${t.id}</code></div>` : null}
          ${t.points ? html`<div class="task-detail-row"><strong>Points:</strong> ${t.points}</div>` : null}
          <div class="task-detail-row"><strong>Status:</strong> <${Chip} status=${t.status || 'unknown'}/></div>
          ${t.sprintId ? html`<div class="task-detail-row"><strong>Sprint:</strong> ${t.sprintId}</div>` : null}
          ${t.sprintGoal ? html`<div class="task-detail-row"><strong>Sprint Goal:</strong> ${t.sprintGoal}</div>` : null}
          ${t.phaseId ? html`
            <div class="task-detail-row">
              <strong>Phase:</strong> P${t.phaseId}${t.phaseName ? ' — ' + t.phaseName : ''}
            </div>
          ` : null}
          ${t.acceptance ? html`<div class="task-detail-row"><strong>Acceptance:</strong> ${t.acceptance}</div>` : null}
          ${t.assignee ? html`<div class="task-detail-row"><strong>Assignee:</strong> ${t.assignee}</div>` : null}
          ${taskCmds.length ? html`
            <div class="task-detail-cmds">
              ${taskCmds.map(([cmd, desc]) => html`<${CmdHint} key=${cmd} cmd=${cmd} desc=${desc}/>`)}
            </div>
          ` : null}
        </div>
      ` : null}
    </div>
  `;
}
