/**
 * TaskPipeline — compact horizontal stage stepper for a single task.
 *
 * Stages derive from the rcode story lifecycle as seen by the scanner
 * (todo/planned → in_progress/active → review/verify → done/completed):
 *   Planned → In Progress → Review → Done.
 * "blocked" is not a stage — it pins the stepper at In Progress and adds
 * a red "Blocked" badge (and a red ring on the current node).
 *
 * Tolerant of sparse data: a bare status string is enough; overview
 * `tasks.inProgress` rows have only { title, pct }, so pct is used as a
 * fallback. Unknown/missing status renders as Planned — never crashes.
 *
 * Props:
 *   task    — { status?, pct?, title? } (anything else ignored)
 *   mini    — smaller variant for overview card rows
 *   running — a live orchestrator session exists for this task; pins the
 *             stepper at In Progress (unless further along) and pulses the
 *             current node so live work is visible at a glance
 */

import { html } from '../preact.js';

const STAGES = ['Planned', 'In Progress', 'Review', 'Done'];

/** Current stage index (0–3) for a task; 3 means fully done. */
export function taskStageIndex(task) {
  const s = String((task && task.status) || '').toLowerCase();
  if (/done|complete|shipped/.test(s)) return 3;
  if (/review|verif|uat/.test(s)) return 2;
  if (/active|progress|running|blocked/.test(s)) return 1;
  if (!s && task && Number.isFinite(task.pct)) {
    return task.pct >= 100 ? 3 : task.pct > 0 ? 1 : 0;
  }
  return 0;
}

export function TaskPipeline({ task, mini, running }) {
  const t = task || {};
  // A live session means work is happening NOW — never show it as Planned,
  // but don't demote a task already at Review/Done.
  const cur = running ? Math.max(taskStageIndex(t), 1) : taskStageIndex(t);
  const blocked = /blocked/i.test(String(t.status || ''));
  // Number of fully-completed stages. When the task is done the Done node
  // itself is filled, so all four count as complete.
  const doneCount = cur === 3 ? 4 : cur;

  const parts = [];
  STAGES.forEach((label, i) => {
    if (i > 0) {
      const lineDone = i <= doneCount;
      parts.push(html`
        <span key=${'l' + i} class=${'tpipe-line' + (lineDone ? ' tpipe-line--done' : '')}></span>
      `);
    }
    const isDone = i < doneCount;
    const isCurrent = !isDone && i === cur;
    let cls = 'tpipe-node';
    let state = 'upcoming';
    if (isDone) { cls += ' tpipe-node--done'; state = 'complete'; }
    else if (isCurrent) {
      cls += blocked ? ' tpipe-node--current tpipe-node--blocked' : ' tpipe-node--current';
      if (running && !blocked && cur < 3) cls += ' tpipe-node--live';
      state = blocked ? 'blocked' : 'current';
    }
    parts.push(html`
      <span key=${'n' + i} class=${cls} title=${label + ' · ' + state}>
        ${isDone ? '✓' : ''}
      </span>
    `);
  });

  const summary = blocked
    ? 'Pipeline: blocked at ' + STAGES[cur]
    : 'Pipeline: ' + (cur === 3 ? 'Done' : STAGES[cur]) + ' (stage ' + (Math.min(cur, 3) + 1) + ' of 4)';

  return html`
    <span class=${'tpipe' + (mini ? ' tpipe--mini' : '')} role="img" aria-label=${summary}>
      ${parts}
      ${blocked ? html`<span class="tpipe-blocked">Blocked</span>` : null}
    </span>
  `;
}
