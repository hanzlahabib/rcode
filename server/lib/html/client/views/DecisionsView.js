/**
 * DecisionsView — Preact component.
 *
 * Ports renderDecisions() from client-main.js to a component.
 * Filtering is local component state (useState), not the DOM filterItems hack.
 * Reads decisions from the store via useStore().
 */

import { html, useState } from '../preact.js';
import { useStore, openDecisionViewer } from '../store.js';
import { humanDate } from '../util.js';
import { CmdHint, CmdHints, showToast, pressable } from '../components/shared.js';

const CMD_HINTS = [
  ['/rcode-council',                   'Convene the council for a new decision'],
  ['/rcode-discuss [agent] "topic"',   'Discuss with a specific expert'],
  ['/rcode-decisions',                 'View decision log'],
];

export function DecisionsView() {
  const S = useStore();
  const decisions = S.decisions || [];

  // Filter state — replaces the DOM filterItems hack
  const [query, setQuery] = useState('');
  const q = query.toLowerCase().trim();

  if (!decisions.length) {
    return html`
      <div id="view-decisions" class="view active">
        <div class="view-title">Decisions (ADRs)</div>
        <div class="empty">
          No decisions recorded yet.
          <div class="empty-action">Decisions made during /rcode-council appear here</div>
        </div>
      </div>
    `;
  }

  // Group by phase — same as client-main.js:renderDecisions
  const grouped = {};
  for (const d of decisions) {
    const phase = (typeof d === 'object' ? d.phase : null) || 'General';
    if (!grouped[phase]) grouped[phase] = [];
    grouped[phase].push(d);
  }

  return html`
    <div id="view-decisions" class="view active">
      <div class="view-title">Decisions (ADRs)</div>
      <div class="filter-bar">
        <input
          class="filter-input"
          type="text"
          placeholder="Filter…"
          value=${query}
          onInput=${e => setQuery(e.target.value)}
        />
      </div>
      <div id="decisions-inner">
        ${Object.entries(grouped).map(([phase, decs]) => {
          const filteredDecs = q
            ? decs.filter(d => {
                const title = typeof d === 'string' ? d : (d.title || d.summary || d.decision || JSON.stringify(d).slice(0, 80));
                return String(title).toLowerCase().includes(q);
              })
            : decs;
          if (!filteredDecs.length) return null;
          return html`
            <div key=${phase}>
              <div class="memory-group-header">${phase}</div>
              <div class="decision-list">
                ${filteredDecs.map((d, i) => {
                  const title = typeof d === 'string'
                    ? d
                    : (d.title || d.summary || d.decision || JSON.stringify(d).slice(0, 80));
                  const dateInfo = (typeof d === 'object' && d.date)
                    ? html`<span style="color:var(--text-muted);font-size:var(--text-xs);margin-left:8px;">${humanDate(d.date)}</span>`
                    : null;
                  const phaseInfo = (typeof d === 'object' && d.phase)
                    ? html`<span class="tag">Phase ${d.phase}</span>`
                    : null;
                  const rationale = (typeof d === 'object' && d.rationale)
                    ? html`<div style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px;">${d.rationale}</div>`
                    : null;
                  const decisionObj = typeof d === 'object' ? d : { title: d };
                  return html`
                    <div key=${i} class="item item-clickable" ...${pressable(() => openDecisionViewer(decisionObj))}>
                      <div class="item-title">${title}${dateInfo}</div>
                      <div class="item-meta">${phaseInfo}</div>
                      ${rationale}
                    </div>
                  `;
                })}
              </div>
            </div>
          `;
        })}
      </div>
      <${CmdHints} hints=${CMD_HINTS}/>
    </div>
  `;
}
