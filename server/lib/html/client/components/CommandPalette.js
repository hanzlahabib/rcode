/**
 * CommandPalette — Cmd+K / Ctrl+K searchable command overlay.
 *
 * Reads the allowlisted commands directly from ALLOWED_COMMANDS (orchestrator.js)
 * and executes selections through runCommandFromUI — no second command list.
 *
 * Props:
 *   open    {boolean} — whether the palette is visible
 *   onClose {function} — called when the palette should close (Escape, backdrop click)
 *
 * Added in sprint 36.1 — DSH-4 command palette.
 */

import { html, useState, useEffect, useRef, useMemo } from '../preact.js';
import { ALLOWED_COMMANDS, runCommandFromUI } from '../orchestrator.js';
import { Icon } from '../icons-client.js';

/**
 * Build an ordered group list and a flat navigation list from a filtered
 * commands array. Group order matches first-seen category order.
 *
 * @param {Array<{cmd,label,category}>} items
 * @returns {{ groups: Array<{category, items}>, flat: Array<{cmd,label,category}> }}
 */
function groupCommands(items) {
  const seen = [];
  const map = {};
  for (const item of items) {
    if (!map[item.category]) {
      map[item.category] = [];
      seen.push(item.category);
    }
    map[item.category].push(item);
  }
  const groups = seen.map(cat => ({ category: cat, items: map[cat] }));
  const flat = groups.flatMap(g => g.items);
  return { groups, flat };
}

export function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  // Focus and reset when opened.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      // Defer by one tick so the element is in the DOM and visible.
      requestAnimationFrame(() => {
        if (inputRef.current) inputRef.current.focus();
      });
    }
  }, [open]);

  // Filter commands by query substring (label or cmd).
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALLOWED_COMMANDS;
    return ALLOWED_COMMANDS.filter(
      ({ cmd, label }) =>
        cmd.toLowerCase().includes(q) || label.toLowerCase().includes(q)
    );
  }, [query]);

  const { groups, flat } = useMemo(() => groupCommands(results), [results]);

  function choose(cmd) {
    runCommandFromUI(cmd);
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (flat[activeIdx]) choose(flat[activeIdx].cmd);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  if (!open) return null;

  // Running flat index counter across groups so activeIdx maps correctly.
  let flatIdx = 0;

  return html`
    <div class="cmd-palette-overlay" onClick=${onClose}>
      <div class="cmd-palette" onClick=${e => e.stopPropagation()} onKeyDown=${handleKeyDown}>

        <div class="cmd-palette-search">
          <${Icon} name="search" size=${16} cls="cmd-palette-search-icon" />
          <input
            class="cmd-palette-input"
            ref=${inputRef}
            value=${query}
            onInput=${e => { setQuery(e.target.value); setActiveIdx(0); }}
            placeholder="Search commands…"
          />
        </div>

        <div class="cmd-palette-list">
          ${flat.length === 0
            ? html`<div class="cmd-palette-empty">No commands match</div>`
            : groups.map(({ category, items }) => html`
              <div class="cmd-palette-group" key=${category}>${category}</div>
              ${items.map(item => {
                const idx = flatIdx++;
                return html`
                  <button
                    class=${'cmd-palette-item' + (idx === activeIdx ? ' active' : '')}
                    key=${item.cmd}
                    onClick=${() => choose(item.cmd)}
                  >
                    <span>${item.label}</span>
                    <span class="cmd-palette-cmd">${item.cmd}</span>
                  </button>
                `;
              })}
            `)
          }
        </div>

      </div>
    </div>
  `;
}
