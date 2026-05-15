/**
 * AgentsView — Preact port of the #view-agents markup from shell.js.
 *
 * Renders Team (real agents) and AI Agents groups from the AGENTS roster
 * that was moved client-side into agents-data.js.
 *
 * Clicking an agent sets store.requestedFile = skillSlug and navigates to
 * the Files view, replacing the legacy viewAgentSkill() setTimeout+DOM-poll
 * hack in shell.js. FilesView watches requestedFile and pre-fills the filter.
 */

import { html, useState } from '../preact.js';
import { setState } from '../store.js';
import { AGENTS } from '../agents-data.js';

const REAL_AGENTS = AGENTS.filter(a => a.real);
const AI_AGENTS   = AGENTS.filter(a => !a.real);

// ---- Single agent card ----
function AgentCard({ agent }) {
  const skillSlug = agent.name.split(' ')[0].toLowerCase();

  function handleClick() {
    // Navigate to Files view and pre-fill search with the agent's skill slug.
    // FilesView watches requestedFile in the store and responds via useEffect.
    setState({ requestedFile: skillSlug });
    window.location.hash = 'files';
  }

  return html`
    <div
      class="agent-card"
      onClick=${handleClick}
      style="cursor:pointer;"
    >
      <div class="name">
        ${agent.name}
        ${agent.real ? html` <span class="real-badge">real</span>` : null}
        ${' '}<span class="type-badge">${agent.type}</span>
      </div>
      <div class="arabic">${agent.arabic}</div>
      <div class="role">${agent.role}</div>
    </div>
  `;
}

// ---- Agent group ----
function AgentGroup({ label, agents, filter }) {
  const visible = agents.filter(a => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (a.name + ' ' + a.role + ' ' + a.arabic + ' ' + a.type).toLowerCase().includes(q);
  });
  if (!visible.length) return null;
  return html`
    <div class="memory-group-header">${label} (${visible.length})</div>
    <div class="agent-list">
      ${visible.map(a => html`<${AgentCard} key=${a.name} agent=${a} />`)}
    </div>
  `;
}

// ---- Root AgentsView ----
export function AgentsView() {
  const [filter, setFilter] = useState('');

  return html`
    <div class="view active" id="view-agents">
      <div class="view-title">Team</div>
      <div class="filter-bar">
        <input
          class="filter-input"
          type="text"
          placeholder="Filter agents…"
          value=${filter}
          onInput=${e => setFilter(e.target.value)}
        />
      </div>
      <${AgentGroup} label="Team" agents=${REAL_AGENTS} filter=${filter} />
      <${AgentGroup} label="AI Agents" agents=${AI_AGENTS} filter=${filter} />
    </div>
  `;
}
