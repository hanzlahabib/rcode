/**
 * BacklogView — Preact component.
 *
 * Lists phases that haven't started yet (state.dashboard.backlog, derived
 * server-side in scanner.js from phases with state === 'todo'). Each row
 * links to that phase's detail page — same navigation PhaseCard/SprintCard
 * already use elsewhere, no new routing concept.
 */

import { html } from '../preact.js';
import { useStore } from '../store.js';
import { pressable } from '../components/shared.js';
import { Icon } from '../icons-client.js';

export function BacklogView() {
  const S = useStore();
  const backlog = S.backlog || [];

  return html`
    <div id="view-backlog" class="view active">
      <div class="view-title">Backlog</div>
      ${backlog.length === 0
        ? html`
          <div class="empty">
            No phases waiting in the backlog.
            <div class="empty-action">Run /rcode-add-phase to queue up new work</div>
          </div>
        `
        : html`
          <div class="phase-list">
            ${backlog.map(p => html`
              <div key=${p.id} class="item item-clickable"
                ...${pressable(() => { location.hash = 'phases/' + p.id; })}>
                <div class="item-title">
                  <${Icon} name="clipboard-list" size=${16}/> Phase ${p.id} — ${p.name}
                </div>
                ${p.range ? html`<div class="item-meta">${p.range}</div>` : null}
              </div>
            `)}
          </div>
        `}
    </div>
  `;
}
