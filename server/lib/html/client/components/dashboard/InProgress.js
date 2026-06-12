/**
 * InProgress — Overview redesign, Row 2 Card 2.
 *
 * "In Progress" card with a "View all" link top-right and a list of rows.
 *
 * Two sources, live first:
 *   1. Live orchestrator sessions (store.activeSessions, status==='running') —
 *      pulsing dot, title from storyId (or the command for cmd-* runs),
 *      elapsed time since startTime; clicking opens the session's orchestrator
 *      panel (existing openOrchPanel mechanism).
 *   2. Scanned tasks from `tasks.inProgress[{ title, pct }]` (pct null → the
 *      percent pill is omitted).
 *
 * Pure — never fetches; the 4s session poll keeps the store fresh. An absent
 * or empty slice renders an honest "Nothing in progress" state — never sample
 * data. See .planning/campaign/DATA-CONTRACT.md.
 */

import { html } from '../../preact.js';
import { useStore } from '../../store.js';
import { orchElapsed, rowLink } from '../../util.js';
import { openOrchPanel } from '../../orchestrator.js';
import { pressable } from '../shared.js';
import { TaskPipeline } from '../TaskPipeline.js';

/** Display title for a live session row — command runs show the command. */
function sessionTitle(s) {
  if (String(s.storyId || '').startsWith('cmd-')) return s.cmd || s.storyId;
  return s.storyId;
}

function LiveRow({ session: s }) {
  return html`
    <li class="ip-row ip-live-row" title=${'Open session ' + s.storyId}
      ...${pressable(() => openOrchPanel(s.storyId))}>
      <span class="live-dot"></span>
      <span class="ip-title ip-live-title">${sessionTitle(s)}</span>
      <span class="ip-live-elapsed">${orchElapsed(s.startTime)}</span>
    </li>
  `;
}

export function InProgress() {
  const S = useStore();
  const items = (S.tasks && Array.isArray(S.tasks.inProgress)) ? S.tasks.inProgress : [];
  const live = (S.activeSessions || []).filter(s => s.status === 'running' || s.status === 'blocked');

  return html`
    <section class="dash-card ip-card">
      <div class="ip-head">
        <p class="dash-card-title">In Progress</p>
        <button class="ip-viewall" onClick=${() => { location.hash = 'tasks'; }}>
          View all
        </button>
      </div>
      ${live.length === 0 && items.length === 0
        ? html`<p class="dash-card-sub">Nothing in progress</p>`
        : html`
          <ul class="ip-list">
            ${live.map(s => html`<${LiveRow} key=${'live-' + s.storyId} session=${s}/>`)}
            ${items.map((t, i) => html`
              <li class="ip-row ovr-link" key=${t.title + i} ...${rowLink('tasks')}>
                <span class="ip-title">${t.title}</span>
                <${TaskPipeline} task=${t} mini=${true}/>
                ${Number.isFinite(t.pct) ? html`<span class="ip-badge">${t.pct}%</span>` : null}
              </li>
            `)}
          </ul>
        `}
    </section>
  `;
}
