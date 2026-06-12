/**
 * AgentsView — Team roster with an agent detail drawer.
 *
 * Cards render from the client-side AGENTS roster (agents-data.js) plus a
 * one-shot /api/agents call that returns frontmatter metadata (model, tools)
 * per agent definition — small payload, so cards can show chips without
 * touching prompt bodies.
 *
 * Clicking a card opens a right-side drawer with the agent's FULL prompt:
 * the actual rcode/agents/<file> body fetched lazily through the existing
 * /api/file handler and rendered as markdown. Prompts are fetched one at a
 * time on click (never all at once) and cached per file for the session.
 */

import { html, useState, useEffect, useCallback } from '../preact.js';
import { renderMd } from '../util.js';
import { pressable } from '../components/shared.js';
import { AGENTS } from '../agents-data.js';

const REAL_AGENTS = AGENTS.filter(a => a.real);
const AI_AGENTS   = AGENTS.filter(a => !a.real);

// Session-local prompt cache: file name -> raw markdown. Re-opening a card
// renders from here instead of refetching.
const promptCache = new Map();

const MAX_CARD_TOOL_CHIPS = 4;

// ---- Metadata chips (shared by card + drawer) ----
function MetaChips({ meta, maxTools }) {
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
function AgentCard({ agent, meta, onOpen }) {
  return html`
    <div class="agent-card" ...${pressable(() => onOpen(agent))}>
      <div class="name">
        ${agent.name}
        ${agent.real ? html` <span class="real-badge">real</span>` : null}
        ${' '}<span class="type-badge">${agent.type}</span>
      </div>
      <div class="arabic">${agent.arabic}</div>
      <span class="role-badge">${agent.role}</span>
      <${MetaChips} meta=${meta} maxTools=${MAX_CARD_TOOL_CHIPS} />
    </div>
  `;
}

// ---- Agent group ----
function AgentGroup({ label, agents, filter, metaByFile, onOpen }) {
  const visible = agents.filter(a => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    const meta = a.file ? metaByFile[a.file] : null;
    const haystack = [
      a.name, a.role, a.arabic, a.type,
      meta && meta.model, meta && (meta.tools || []).join(' '),
    ].filter(Boolean).join(' ');
    return haystack.toLowerCase().includes(q);
  });
  if (!visible.length) return null;
  return html`
    <div class="memory-group-header">${label} (${visible.length})</div>
    <div class="agent-list">
      ${visible.map(a => html`
        <${AgentCard}
          key=${a.name}
          agent=${a}
          meta=${a.file ? metaByFile[a.file] : null}
          onOpen=${onOpen}
        />
      `)}
    </div>
  `;
}

// ---- Detail drawer ----
function AgentDrawer({ agent, meta, prompt, onClose }) {
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
    <aside class="agent-drawer" role="dialog" aria-modal="true" aria-label="${agent.name} — full prompt">
      <div class="agent-drawer-head">
        <div>
          <div class="agent-drawer-name">
            ${agent.name}
            <span class="agent-drawer-arabic">${agent.arabic}</span>
            ${agent.real ? html`<span class="real-badge">real</span>` : null}
            <span class="type-badge">${agent.type}</span>
          </div>
          <span class="role-badge">${agent.role}</span>
          <${MetaChips} meta=${meta} />
        </div>
        <button class="agent-drawer-close" onClick=${onClose} aria-label="Close">×</button>
      </div>
      ${agent.file ? html`<div class="agent-drawer-path">rcode/agents/${agent.file}</div>` : null}
      <div class="agent-drawer-body">${body}</div>
    </aside>
  `;
}

// ---- Root AgentsView ----
export function AgentsView() {
  const [filter, setFilter]         = useState('');
  const [metaByFile, setMetaByFile] = useState({});
  const [selected, setSelected]     = useState(null);
  const [prompt, setPrompt]         = useState({ loading: false, error: null, text: null });

  // One-shot roster metadata fetch — frontmatter summaries only, no bodies.
  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(list => {
        const map = {};
        for (const a of (Array.isArray(list) ? list : [])) map[a.file] = a;
        setMetaByFile(map);
      })
      .catch(() => { /* chips are progressive enhancement — cards still render */ });
  }, []);

  const openAgent = useCallback(async (agent) => {
    setSelected(agent);
    if (!agent.file) {
      setPrompt({ loading: false, error: null, text: null });
      return;
    }
    if (promptCache.has(agent.file)) {
      setPrompt({ loading: false, error: null, text: promptCache.get(agent.file) });
      return;
    }
    setPrompt({ loading: true, error: null, text: null });
    try {
      const resp = await fetch('/api/file?path=' + encodeURIComponent('rcode/agents/' + agent.file));
      if (!resp.ok) {
        const msg = resp.status === 404
          ? 'Prompt file not found: rcode/agents/' + agent.file
          : 'Failed to load prompt (HTTP ' + resp.status + ').';
        setPrompt({ loading: false, error: msg, text: null });
        return;
      }
      const text = await resp.text();
      promptCache.set(agent.file, text);
      setPrompt({ loading: false, error: null, text });
    } catch {
      setPrompt({ loading: false, error: 'Network error.', text: null });
    }
  }, []);

  const closeDrawer = useCallback(() => setSelected(null), []);

  // Escape closes the drawer while it is open.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => { if (e.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected, closeDrawer]);

  return html`
    <div class="view active" id="view-agents">
      <div class="view-title">Team</div>
      <div class="filter-bar">
        <input
          class="filter-input"
          type="text"
          placeholder="Search agents by name, role, model, or tool…"
          value=${filter}
          onInput=${e => setFilter(e.target.value)}
        />
      </div>
      <${AgentGroup} label="Team" agents=${REAL_AGENTS} filter=${filter} metaByFile=${metaByFile} onOpen=${openAgent} />
      <${AgentGroup} label="AI Agents" agents=${AI_AGENTS} filter=${filter} metaByFile=${metaByFile} onOpen=${openAgent} />
      ${selected ? html`
        <${AgentDrawer}
          agent=${selected}
          meta=${selected.file ? metaByFile[selected.file] : null}
          prompt=${prompt}
          onClose=${closeDrawer}
        />
      ` : null}
    </div>
  `;
}
