/**
 * MemoryView — Preact port of renderMemory() from client-main.js.
 *
 * On mount, fetches /api/memory. Handles three cases:
 *   !exists       — not initialised empty state
 *   !initialised  — directory exists but INDEX.md missing
 *   populated     — sections map + distillates / change records / archive / post-mortems
 *
 * Command hints accordion mirrors the legacy cmdAccordion() output.
 */

import { html, useState, useEffect } from '../preact.js';

// ---- Command hints accordion ----
const MEMORY_HINTS = [
  ['/rihal-memory-init',    'Bootstrap the Memory Bank'],
  ['/rihal-memory-update',  'Append a decision, issue, or stakeholder entry'],
  ['/rihal-memory-distill', 'Regenerate fast-load distillates'],
  ['/rihal-memory-audit',   'Find stale entries and gaps'],
];

function CmdAccordion({ hints }) {
  const [open, setOpen] = useState(false);
  return html`
    <details open=${open} onToggle=${e => setOpen(e.target.open)} style="margin-top:var(--space-4);">
      <summary style="cursor:pointer;font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);padding:var(--space-2) 0;">
        Useful commands
      </summary>
      <div class="decision-list" style="margin-top:var(--space-2);">
        ${hints.map(([cmd, desc]) => html`
          <div class="item" key=${cmd}>
            <div class="item-title"><code>${cmd}</code></div>
            <div class="item-meta">${desc}</div>
          </div>
        `)}
      </div>
    </details>
  `;
}

// ---- Section file list ----
function SectionGroup({ section, files }) {
  return html`
    <div>
      <div class="memory-group-header">${section}</div>
      <div class="decision-list">
        ${files.map(f => {
          const status = f.exists ? (f.populated ? '✓' : '○') : '✗';
          const meta   = f.exists ? (f.populated ? 'populated' : 'template only') : 'missing';
          return html`
            <div class="item" key=${f.name}>
              <div class="item-title">${status} ${f.name}</div>
              <div class="item-meta">${meta} · ${f.bytes || 0} bytes</div>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}

// ---- Generic list group (distillates, change records, etc.) ----
function ListGroup({ label, items }) {
  if (!items || !items.length) return null;
  return html`
    <div>
      <div class="memory-group-header">${label} (${items.length})</div>
      <div class="decision-list">
        ${items.map(f => html`
          <div class="item" key=${f.name}>
            <div class="item-title">${f.name}</div>
          </div>
        `)}
      </div>
    </div>
  `;
}

// ---- Root MemoryView ----
export function MemoryView() {
  const [memory, setMemory]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/memory')
      .then(r => r.json())
      .then(data => { setMemory(data); })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return html`
      <div class="view active" id="view-memory">
        <div class="view-title">Memory Bank</div>
        <div class="empty">Loading…</div>
      </div>
    `;
  }

  if (error) {
    return html`
      <div class="view active" id="view-memory">
        <div class="view-title">Memory Bank</div>
        <div class="empty">Failed to load /api/memory: ${error}</div>
      </div>
    `;
  }

  if (!memory || !memory.exists) {
    return html`
      <div class="view active" id="view-memory">
        <div class="view-title">Memory Bank</div>
        <div class="empty">
          <h3 style="color:var(--rihal-gold);">Not initialised</h3>
          <p>The Memory Bank is rcode's structured project context.</p>
          <div class="empty-action">Run <code>/rihal-memory-init</code> to bootstrap</div>
        </div>
      </div>
    `;
  }

  if (!memory.initialised) {
    return html`
      <div class="view active" id="view-memory">
        <div class="view-title">Memory Bank</div>
        <div class="empty">
          <p>Directory exists but INDEX.md is missing — re-run <code>/rihal-memory-init</code></p>
        </div>
      </div>
    `;
  }

  const sections = memory.sections || {};

  return html`
    <div class="view active" id="view-memory">
      <div class="view-title">Memory Bank</div>
      <div class="filter-bar">
        <span style="color:var(--text-muted);font-size:var(--text-sm);">Last scanned: ${memory.lastScanned || '—'}</span>
      </div>
      <div id="memory-sections">
        ${Object.entries(sections).map(([section, files]) => html`
          <${SectionGroup} key=${section} section=${section} files=${files} />
        `)}
        <${ListGroup} label="Distillates" items=${memory.distillates} />
        <${ListGroup} label="Change Records" items=${memory.changeRecords} />
        <${ListGroup} label="Milestone Archive" items=${memory.archive} />
        <${ListGroup} label="Post-mortems" items=${memory.postMortems} />
      </div>
      <${CmdAccordion} hints=${MEMORY_HINTS} />
    </div>
  `;
}
