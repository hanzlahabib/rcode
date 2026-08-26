/**
 * MemoryView — Preact port of renderMemory() from client-main.js.
 *
 * On mount, fetches /api/memory. Handles three cases:
 *   !exists       — not initialised empty state
 *   !initialised  — directory exists but INDEX.md missing
 *   populated     — sections map + distillates / change records / archive / post-mortems
 *
 * Command hints accordion mirrors the legacy cmdAccordion() output.
 *
 * Clicking an existing entry opens its content in the shared FileReader
 * slide-over (same component the Files view uses).
 */

import { html, useState, useEffect } from '../preact.js';
import { FileReader } from '../components/FileReader.js';
import { CmdHint } from '../components/shared.js';

// ---- Command hints accordion ----
const MEMORY_HINTS = [
  ['/rcode-memory-init',    'Bootstrap the Memory Bank'],
  ['/rcode-memory-update',  'Append a decision, issue, or stakeholder entry'],
  ['/rcode-memory-distill', 'Regenerate fast-load distillates'],
  ['/rcode-memory-audit',   'Find stale entries and gaps'],
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

// ---- Age pill (#968) — fresh / aging / stale by mtime ----
function AgePill({ ageDays, ageBand }) {
  if (ageBand == null || ageDays == null) return null;
  const label = ageDays === 0 ? 'updated today' : `updated ${ageDays}d ago`;
  return html`<span class=${'memory-age-pill ' + ageBand}>${label}</span>`;
}

// ---- Section file list ----
function SectionGroup({ section, files, onOpen }) {
  return html`
    <div>
      <div class="memory-group-header">${section}</div>
      <div class="decision-list">
        ${files.map(f => {
          const status = f.exists ? (f.populated ? '✓' : '○') : '✗';
          const meta   = f.exists ? (f.populated ? 'populated' : 'template only') : 'missing';
          // Only existing files are openable — missing entries stay inert.
          return html`
            <div
              class=${'item' + (f.exists ? ' item-clickable' : '')}
              key=${f.name}
              onClick=${f.exists ? () => onOpen(f) : undefined}
            >
              <div class="item-title">
                ${status} ${f.name}
                <${AgePill} ageDays=${f.ageDays} ageBand=${f.ageBand} />
              </div>
              <div class="item-meta">${meta} · ${f.bytes || 0} bytes</div>
            </div>
          `;
        })}
      </div>
    </div>
  `;
}

// ---- Generic list group (change records, archive, post-mortems) ----
function ListGroup({ label, items, onOpen }) {
  if (!items || !items.length) return null;
  return html`
    <div>
      <div class="memory-group-header">${label} (${items.length})</div>
      <div class="decision-list">
        ${items.map(f => html`
          <div class="item item-clickable" key=${f.name} onClick=${() => onOpen(f)}>
            <div class="item-title">${f.name}</div>
          </div>
        `)}
      </div>
    </div>
  `;
}

// ---- Distillates — freshness vs their source files (#968) ----
function DistillateGroup({ items, onOpen }) {
  if (!items || !items.length) return null;
  return html`
    <div>
      <div class="memory-group-header">Distillates (${items.length})</div>
      <div class="decision-list">
        ${items.map(d => html`
          <div class="item item-clickable" key=${d.name} onClick=${() => onOpen(d)}>
            <div class="item-title">
              ${d.name}
              <${AgePill} ageDays=${d.ageDays} ageBand=${d.ageBand} />
              ${d.stale ? html`<span class="memory-age-pill stale">source changed since generation</span>` : null}
            </div>
            <div class="item-meta">
              ${d.generatedAt ? `generated ${d.generatedAt}` : 'no generated-at recorded'}
              ${d.sourceDigest ? ` · digest ${d.sourceDigest.slice(0, 10)}…` : ''}
              ${d.staleSources && d.staleSources.length ? ` · changed: ${d.staleSources.join(', ')}` : ''}
              ${d.missingSources && d.missingSources.length ? ` · missing: ${d.missingSources.join(', ')}` : ''}
            </div>
          </div>
        `)}
      </div>
    </div>
  `;
}

// ---- Drift — same heuristics as `rcode-hooks drift` (#968) ----
function DriftSection({ drift }) {
  const drifts = (drift && drift.drifts) || [];
  if (!drifts.length) return null;
  return html`
    <div>
      <div class="memory-group-header">⚠ Drift (${drifts.length})</div>
      ${drifts.map((d, i) => html`
        <div class="memory-drift-item" key=${d.kind + '-' + i}>
          <div class="memory-drift-kind">${d.kind}</div>
          <div class="memory-drift-claim">${d.claim}</div>
          <div class="memory-drift-evidence">${d.evidence}</div>
        </div>
      `)}
    </div>
  `;
}

// ---- Root MemoryView ----
export function MemoryView() {
  const [memory, setMemory]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [reader, setReader]   = useState(null); // { path, name } | null

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
          <h3 style="color:var(--rcode-gold);">Not initialised</h3>
          <p>The Memory Bank is rcode's structured project context.</p>
          <${CmdHint} cmd="/rcode-memory-init" desc="Bootstrap the Memory Bank"/>
        </div>
      </div>
    `;
  }

  if (!memory.initialised) {
    return html`
      <div class="view active" id="view-memory">
        <div class="view-title">Memory Bank</div>
        <div class="empty">
          <p>Directory exists but INDEX.md is missing — re-run <code>/rcode-memory-init</code></p>
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
        <${DriftSection} drift=${memory.drift} />
        ${Object.entries(sections).map(([section, files]) => html`
          <${SectionGroup} key=${section} section=${section} files=${files} onOpen=${setReader} />
        `)}
        <${DistillateGroup} items=${memory.distillates} onOpen=${setReader} />
        <${ListGroup} label="Change Records" items=${memory.changeRecords} onOpen=${setReader} />
        <${ListGroup} label="Milestone Archive" items=${memory.archive} onOpen=${setReader} />
        <${ListGroup} label="Post-mortems" items=${memory.postMortems} onOpen=${setReader} />
      </div>
      <${CmdAccordion} hints=${MEMORY_HINTS} />
      ${reader && html`
        <${FileReader}
          path=${reader.path}
          title=${reader.name}
          onClose=${() => setReader(null)}
        />
      `}
    </div>
  `;
}
