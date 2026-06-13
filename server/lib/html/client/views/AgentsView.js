/**
 * AgentsView — Team roster: category sections of rich agent cards plus an
 * agent detail drawer (components/AgentCard.js).
 *
 * Cards render from the client-side AGENTS roster (agents-data.js) plus a
 * one-shot /api/agents call that returns frontmatter metadata (description,
 * model, tools) per agent definition — small payload, so cards can show
 * summaries and chips without touching prompt bodies.
 *
 * Clicking a card opens the drawer with the agent's FULL prompt: the actual
 * rcode/agents/<file> body fetched lazily through the existing /api/file
 * handler and rendered as markdown. Prompts are fetched one at a time on
 * click (never all at once) and cached per file for the session.
 */

import { html, useState, useEffect, useCallback, useMemo } from '../preact.js';
import { AgentCard, AgentDrawer } from '../components/AgentCard.js';
import { AGENTS } from '../agents-data.js';

// Category sections in display order. Roster `type` values not listed here
// fall into Specialists so a future type can't silently drop agents.
const SECTIONS = [
  { label: 'Leadership',  types: ['leadership'] },
  { label: 'Engineering', types: ['engineering'] },
  { label: 'Product',     types: ['product'] },
  { label: 'Design',      types: ['design'] },
  { label: 'Quality',     types: ['quality'] },
  { label: 'Specialists', types: ['support', 'system'] },
];
const KNOWN_TYPES = SECTIONS.flatMap(s => s.types);

function agentsForSection(section) {
  return AGENTS.filter(a =>
    section.types.includes(a.type) ||
    (section.label === 'Specialists' && !KNOWN_TYPES.includes(a.type))
  );
}

function matchesFilter(agent, meta, filter) {
  if (!filter) return true;
  const haystack = [
    agent.name, agent.role, agent.arabic, agent.type,
    meta && meta.model, meta && meta.description, meta && (meta.tools || []).join(' '),
  ].filter(Boolean).join(' ');
  return haystack.toLowerCase().includes(filter.toLowerCase());
}

// Session-local prompt cache: file name -> raw markdown. Re-opening a card
// renders from here instead of refetching.
const promptCache = new Map();

// ---- Section: sticky header + card grid ----
function AgentSection({ section, agents, metaByFile, onOpen }) {
  if (!agents.length) return null;
  return html`
    <div class="agent-section">
      <div class="agent-section-head">
        ${section.label}
        <span class="agent-section-count">${agents.length}</span>
      </div>
      <div class="agent-grid">
        ${agents.map(a => html`
          <${AgentCard}
            key=${a.name}
            agent=${a}
            meta=${a.file ? metaByFile[a.file] : null}
            onOpen=${onOpen}
          />
        `)}
      </div>
    </div>
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
      .catch(() => { /* chips/summaries are progressive enhancement — cards still render */ });
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

  const sections = useMemo(() =>
    SECTIONS.map(s => ({
      section: s,
      agents: agentsForSection(s).filter(a =>
        matchesFilter(a, a.file ? metaByFile[a.file] : null, filter)),
    })),
  [filter, metaByFile]);

  const visibleCount = sections.reduce((n, s) => n + s.agents.length, 0);

  return html`
    <div class="view active" id="view-agents">
      <div class="view-title">Team</div>
      <div class="filter-bar agent-filter-bar">
        <input
          class="filter-input"
          type="text"
          placeholder="Search agents by name, role, model, or tool…"
          value=${filter}
          onInput=${e => setFilter(e.target.value)}
        />
        <span class="agent-count">${visibleCount} agent${visibleCount === 1 ? '' : 's'}</span>
      </div>
      ${visibleCount === 0
        ? html`<div class="empty">No agents match “${filter}”.</div>`
        : sections.map(({ section, agents }) => html`
            <${AgentSection}
              key=${section.label}
              section=${section}
              agents=${agents}
              metaByFile=${metaByFile}
              onOpen=${openAgent}
            />
          `)}
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
