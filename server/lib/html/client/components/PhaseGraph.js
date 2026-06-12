/**
 * PhaseGraph — phase dependency graph, hand-rolled inline SVG (no libs).
 *
 * Layout: layered DAG. Each phase gets a layer = 0 when it has no resolvable
 * dependencies, else 1 + max(layer of each dependency) — roots on the left,
 * dependents to the right. A layer with more than MAX_ROWS phases wraps into
 * adjacent sub-columns so 34+ phase milestones stay readable instead of
 * producing one mile-high column. Layering is iterative with a pass cap and
 * monotonic updates, so a dependency cycle in bad data cannot loop forever.
 *
 * Honest states:
 *   - no phases            → friendly empty message
 *   - no cross-phase deps  → simple wrapped flow row of chips (no fake DAG)
 *   - real deps            → layered DAG with curved edges + arrowheads
 *
 * Interactions: hover highlights a node's ancestors + descendants and dims
 * the rest; click navigates to the phase; an SVG-rendered tooltip shows the
 * full name, sprint count and dependency list. The SVG sits in a horizontal
 * scroll container for wide graphs.
 */

import { html, useState, useMemo } from '../preact.js';
import { Icon } from '../icons-client.js';

const NODE_W = 150, NODE_H = 44;   // capped chip size — names truncate to fit
const COL_GAP = 56,  ROW_GAP = 14;
const PAD = 16;
const MAX_ROWS = 8;                // rows per column before a layer wraps

/** Collapse the many status spellings into the four visual kinds. */
export function statusKind(status) {
  const s = String(status || '');
  if (/blocked/i.test(s)) return 'blocked';
  if (/complete|done/i.test(s)) return 'done';
  if (/active|executing|in_progress|progress/i.test(s)) return 'active';
  return 'todo';
}

/** Dependencies that resolve to a known phase (self-references dropped). */
function resolvedDeps(p, known) {
  return (p.dependsOn || []).map(String)
    .filter(d => known.has(d) && d !== String(p.id));
}

/**
 * Topological layering. Returns Map(id → layer). Monotonic updates + a pass
 * cap of phases.length guarantee termination even on cyclic input.
 */
export function computeLayers(phases) {
  const known = new Set(phases.map(p => String(p.id)));
  const layers = new Map(phases.map(p => [String(p.id), 0]));
  for (let pass = 0; pass < phases.length; pass++) {
    let changed = false;
    for (const p of phases) {
      const deps = resolvedDeps(p, known);
      if (!deps.length) continue;
      const next = 1 + Math.max(...deps.map(d => layers.get(d) || 0));
      if (next > (layers.get(String(p.id)) || 0)) {
        layers.set(String(p.id), next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return layers;
}

/** parents/children adjacency over resolvable dependencies. */
function buildAdjacency(phases) {
  const known = new Set(phases.map(p => String(p.id)));
  const parents = new Map(), children = new Map();
  for (const p of phases) {
    const id = String(p.id);
    const deps = resolvedDeps(p, known);
    parents.set(id, deps);
    for (const d of deps) {
      if (!children.has(d)) children.set(d, []);
      children.get(d).push(id);
    }
  }
  return { parents, children };
}

/** BFS one direction (parents = ancestors, children = descendants). */
function reach(start, adj) {
  const seen = new Set();
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    for (const next of adj.get(cur) || []) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return seen;
}

/** Hovered node + every ancestor and descendant of it. */
function relatedSet(id, { parents, children }) {
  const set = new Set([id]);
  for (const a of reach(id, parents)) set.add(a);
  for (const d of reach(id, children)) set.add(d);
  return set;
}

function truncate(text, max) {
  const s = String(text || '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function goToPhase(id) { location.hash = 'phases/' + id; }

/**
 * Pixel layout for the DAG mode. Layers become columns left→right; a layer
 * larger than MAX_ROWS wraps into adjacent sub-columns. All values derive
 * from integer counts, so positions are always finite — no NaN, no overlap.
 */
function layout(phases, layers) {
  const byLayer = new Map();
  for (const p of phases) {
    const l = layers.get(String(p.id)) || 0;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l).push(p);
  }
  const order = [...byLayer.keys()].sort((a, b) => a - b);

  const pos = new Map();
  let col = 0, maxRowsUsed = 1;
  for (const l of order) {
    const group = byLayer.get(l);
    const subCols = Math.max(1, Math.ceil(group.length / MAX_ROWS));
    const perCol = Math.ceil(group.length / subCols);
    group.forEach((p, i) => {
      const sub = Math.floor(i / perCol);
      const row = i % perCol;
      maxRowsUsed = Math.max(maxRowsUsed, row + 1);
      pos.set(String(p.id), {
        x: PAD + (col + sub) * (NODE_W + COL_GAP),
        y: PAD + row * (NODE_H + ROW_GAP),
      });
    });
    col += subCols;
  }
  const width = PAD * 2 + col * NODE_W + Math.max(0, col - 1) * COL_GAP;
  const height = PAD * 2 + maxRowsUsed * NODE_H + (maxRowsUsed - 1) * ROW_GAP;
  return { pos, width, height };
}

/** Tooltip box rendered inside the SVG, clamped to stay within the canvas. */
function Tooltip({ phase, nodePos, canvasW, canvasH }) {
  const name = truncate(phase.name, 48);
  const sprints = (phase.sprints || []).length;
  const deps = (phase.dependsOn || []).map(String);
  const lines = [
    name,
    sprints + (sprints === 1 ? ' sprint' : ' sprints'),
    deps.length ? 'Needs: ' + deps.map(d => 'P' + d).join(', ') : 'No dependencies',
  ];
  const w = Math.min(330, Math.max(150, Math.max(...lines.map(l => l.length)) * 6.2 + 24));
  const h = lines.length * 15 + 14;
  const x = Math.max(4, Math.min(nodePos.x, canvasW - w - 4));
  let y = nodePos.y + NODE_H + 8;
  if (y + h > canvasH - 4) y = Math.max(4, nodePos.y - h - 8);
  return html`
    <g class="pg-tip">
      <rect x=${x} y=${y} width=${w} height=${h} rx="6"/>
      ${lines.map((line, i) => html`
        <text key=${i} x=${x + 12} y=${y + 20 + i * 15}
          class=${i === 0 ? 'pg-tip-title' : 'pg-tip-line'}>${line}</text>
      `)}
    </g>
  `;
}

/** Wrapped flow row of chips — the honest no-dependencies presentation. */
function FlowRow({ phases }) {
  return html`
    <div class="pg-flow">
      ${phases.map(p => {
        const kind = statusKind(p.status);
        const sprints = (p.sprints || []).length;
        return html`
          <button key=${p.id} type="button"
            class=${'pg-chip pg-' + kind}
            title=${(p.name || '') + ' — ' + sprints + (sprints === 1 ? ' sprint' : ' sprints')}
            onClick=${() => goToPhase(p.id)}>
            <span class="pg-chip-id">P${p.id}</span>
            <span class="pg-chip-name">${truncate(p.name, 24)}</span>
          </button>
        `;
      })}
    </div>
    <div class="pg-hint">No cross-phase dependencies declared — phases shown in roadmap order.</div>
  `;
}

/** Layered DAG with curved edges, hover ancestry highlighting and tooltips. */
function Dag({ phases }) {
  const [hoverId, setHoverId] = useState(null);

  const model = useMemo(() => {
    const layers = computeLayers(phases);
    const { pos, width, height } = layout(phases, layers);
    const adjacency = buildAdjacency(phases);
    const known = new Set(phases.map(p => String(p.id)));
    const edges = [];
    for (const p of phases) {
      for (const d of resolvedDeps(p, known)) {
        const from = pos.get(d), to = pos.get(String(p.id));
        if (!from || !to) continue;
        edges.push({ from: d, to: String(p.id), x1: from.x + NODE_W, y1: from.y + NODE_H / 2, x2: to.x, y2: to.y + NODE_H / 2 });
      }
    }
    return { pos, width, height, adjacency, edges };
  }, [phases]);

  const related = useMemo(
    () => (hoverId ? relatedSet(hoverId, model.adjacency) : null),
    [hoverId, model],
  );

  const hovered = hoverId ? phases.find(p => String(p.id) === hoverId) : null;

  return html`
    <div class="pg-scroll">
      <svg class=${'pg-svg' + (hoverId ? ' pg-hovering' : '')}
        width=${model.width} height=${model.height}
        viewBox=${'0 0 ' + model.width + ' ' + model.height}
        role="img" aria-label="Phase dependency graph">
        <defs>
          <marker id="pg-arrow" markerWidth="8" markerHeight="8"
            refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path class="pg-arrow" d="M0,0 L8,4 L0,8 Z"/>
          </marker>
        </defs>
        ${model.edges.map(e => {
          const bend = Math.max(24, (e.x2 - e.x1) * 0.45);
          const d = 'M' + e.x1 + ',' + e.y1
            + ' C' + (e.x1 + bend) + ',' + e.y1
            + ' ' + (e.x2 - bend) + ',' + e.y2
            + ' ' + e.x2 + ',' + e.y2;
          const on = related && related.has(e.from) && related.has(e.to);
          return html`<path key=${e.from + '->' + e.to} d=${d}
            class=${'pg-edge' + (on ? ' pg-related' : '')}
            marker-end="url(#pg-arrow)"/>`;
        })}
        ${phases.map(p => {
          const id = String(p.id);
          const { x, y } = model.pos.get(id);
          const kind = statusKind(p.status);
          const on = related && related.has(id);
          return html`
            <g key=${id}
              class=${'pg-node pg-' + kind + (on ? ' pg-related' : '')}
              onClick=${() => goToPhase(p.id)}
              onMouseEnter=${() => setHoverId(id)}
              onMouseLeave=${() => setHoverId(null)}>
              <rect x=${x} y=${y} width=${NODE_W} height=${NODE_H} rx="8"/>
              <text x=${x + 10} y=${y + 18} class="pg-label">P${p.id}</text>
              <text x=${x + 10} y=${y + 33} class="pg-sublabel">${truncate(p.name, 21)}</text>
            </g>
          `;
        })}
        ${hovered ? html`<${Tooltip} phase=${hovered}
          nodePos=${model.pos.get(hoverId)}
          canvasW=${model.width} canvasH=${model.height}/>` : null}
      </svg>
    </div>
  `;
}

const LEGEND = [
  ['done', 'Done'], ['active', 'Active'], ['todo', 'Todo'], ['blocked', 'Blocked'],
];

export function PhaseGraph({ phases }) {
  const list = Array.isArray(phases) ? phases : [];
  const known = new Set(list.map(p => String(p.id)));
  const hasDeps = list.some(p => resolvedDeps(p, known).length > 0);

  return html`
    <details class="pg-panel" open>
      <summary>
        <${Icon} name="layers" size=${14}/> Dependency Graph
        <span class="pg-count">${list.length} ${list.length === 1 ? 'phase' : 'phases'}</span>
      </summary>
      <div class="pg-legend">
        ${LEGEND.map(([kind, label]) => html`
          <span key=${kind} class="pg-legend-item">
            <span class=${'pg-swatch pg-' + kind}></span>${label}
          </span>
        `)}
      </div>
      ${!list.length
        ? html`<div class="pg-empty">No phases yet — plan a milestone with <code>/rcode-new-milestone</code> and the graph will appear here.</div>`
        : hasDeps
          ? html`<${Dag} phases=${list}/>`
          : html`<${FlowRow} phases=${list}/>`}
    </details>
  `;
}
