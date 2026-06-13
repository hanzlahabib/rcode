/**
 * AgentCard — card, avatar, chips, and detail drawer for the Agents view.
 *
 * Extracted from AgentsView so the view module stays focused on grouping,
 * search, and fetch state. Per-role accent colors are driven by a single
 * `agent-accent--<type>` class on the card/drawer root: it sets the
 * --agent-accent custom property that the avatar, role badge, and hover
 * border all read (see the AGENTS VIEW block at the end of css.js).
 */

import { html } from '../preact.js';
import { setState } from '../store.js';
import { pressable, showToast } from './shared.js';
import { renderMd } from '../util.js';

const MAX_CARD_TOOL_CHIPS = 4;

/** "Sadiq Damani" -> "SD", "Hussain" -> "H". */
function initialsOf(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/** Per-role accent class — types map 1:1 to the CSS accent variants. */
export function accentClass(agent) {
  return 'agent-accent--' + (agent.type || 'system');
}

// ---- Avatar circle with initials ----
function Avatar({ agent, large }) {
  return html`<span class=${'agent-avatar' + (large ? ' agent-avatar--lg' : '')} aria-hidden="true">${initialsOf(agent.name)}</span>`;
}

// ---- Metadata chips (model + tools), shared by card and drawer ----
export function MetaChips({ meta, maxTools }) {
  if (!meta) return null;
  const tools = meta.tools || [];
  const shown = maxTools ? tools.slice(0, maxTools) : tools;
  const extra = tools.length - shown.length;
  if (!meta.model && !shown.length) return null;
  return html`
    <div class="agent-chips">
      ${meta.model ? html`<span class="agent-chip agent-chip--model">${meta.model}</span>` : null}
      ${shown.map(t => html`<span class="agent-chip" key=${t}>${t}</span>`)}
      ${extra > 0 ? html`<span class="agent-chip agent-chip--more">+${extra}</span>` : null}
    </div>
  `;
}

// ---- Single agent card ----
export function AgentCard({ agent, meta, onOpen }) {
  return html`
    <div class=${'agent-card ' + accentClass(agent)} ...${pressable(() => onOpen(agent))}>
      <div class="agent-card-top">
        <${Avatar} agent=${agent} />
        <div class="agent-card-id">
          <div class="agent-card-name">
            ${agent.name}
            ${agent.real ? html`<span class="real-badge">real</span>` : null}
          </div>
          <span class="role-badge">${agent.role}</span>
        </div>
        <span class="agent-card-arabic">${agent.arabic}</span>
      </div>
      ${meta && meta.description ? html`<p class="agent-card-desc">${meta.description}</p>` : null}
      <${MetaChips} meta=${meta} maxTools=${MAX_CARD_TOOL_CHIPS} />
    </div>
  `;
}

// ---- Detail drawer ----
export function AgentDrawer({ agent, meta, prompt, onClose }) {
  const filePath = agent.file ? 'rcode/agents/' + agent.file : null;

  function copyPath() {
    navigator.clipboard.writeText(filePath).then(() => {
      showToast('Path copied!');
    }).catch(() => {});
  }

  function openInFiles() {
    setState({ requestedFile: filePath });
    window.location.hash = 'files';
  }

  let body;
  if (!agent.file) {
    body = html`<div class="agent-drawer-empty">No prompt file on disk — this is a system entry without an agent definition.</div>`;
  } else if (prompt.loading) {
    body = html`
      <div class="skeleton"></div>
      <div class="agent-drawer-skeleton skeleton"></div>
    `;
  } else if (prompt.error) {
    body = html`<div class="agent-drawer-error">${prompt.error}</div>`;
  } else if (prompt.text) {
    body = html`<div class="md-render" dangerouslySetInnerHTML=${{ __html: renderMd(prompt.text) }} />`;
  } else {
    body = null;
  }

  return html`
    <div class="agent-drawer-backdrop" onClick=${onClose}></div>
    <aside class=${'agent-drawer ' + accentClass(agent)} role="dialog" aria-modal="true" aria-label="${agent.name} — full prompt">
      <div class="agent-drawer-head">
        <${Avatar} agent=${agent} large />
        <div class="agent-drawer-titles">
          <div class="agent-drawer-name">
            ${agent.name}
            <span class="agent-drawer-arabic">${agent.arabic}</span>
            ${agent.real ? html`<span class="real-badge">real</span>` : null}
          </div>
          <span class="role-badge">${agent.role}</span>
          <${MetaChips} meta=${meta} />
        </div>
        <button class="agent-drawer-close" onClick=${onClose} aria-label="Close">×</button>
      </div>
      ${filePath ? html`
        <div class="agent-drawer-meta">
          <span class="agent-drawer-meta-path">${filePath}</span>
          <button class="agent-drawer-btn" onClick=${copyPath}>Copy path</button>
          <button class="agent-drawer-btn agent-drawer-btn--link" onClick=${openInFiles}>View in Files →</button>
        </div>
      ` : null}
      <div class="agent-drawer-body">${body}</div>
    </aside>
  `;
}
