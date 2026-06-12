/**
 * FilesView — Preact port of the Files view from client-main.js.
 *
 * On mount: fetches /api/files to build the grouped file tree.
 * Clicking a file: opens the shared FileReader slide-over, which fetches
 * /api/file?path=... and renders markdown via the global `marked` CDN lib.
 *
 * Agent-jump bridge: when the store field `requestedFile` is set (by
 * AgentsView), FilesView picks it up and pre-fills the search filter, then
 * clears the field so subsequent renders don't re-trigger.
 */

import { html, useState, useEffect } from '../preact.js';
import { useStore, setState } from '../store.js';
import { FileReader } from '../components/FileReader.js';

// ---- File tree components ----
function FileEntry({ file, extraText, onSelect, isSelected }) {
  return html`
    <div
      class=${'item item-clickable inline-file-entry' + (isSelected ? ' selected' : '')}
      data-path=${file.path}
      onClick=${() => onSelect(file)}
      style="padding:var(--space-2) var(--space-3);font-family:'SF Mono',Monaco,Consolas,monospace;font-size:var(--text-xs);"
    >
      ${file.label}
    </div>
  `;
}

function FileGroup({ group, onSelect, selectedPath, filter }) {
  function matchesFilter(file, extra) {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (file.label + ' ' + file.path + (extra ? ' ' + extra : '')).toLowerCase().includes(q);
  }

  if (group.subGroups) {
    return html`
      <div class="inline-file-group" style="margin-bottom:var(--space-3);">
        <div style="font-size:var(--text-xs);font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;padding:var(--space-1) var(--space-3);">
          ${group.group}
        </div>
        ${group.subGroups.map(sg => {
          const visible = sg.files.filter(f => matchesFilter(f, sg.subGroup));
          if (!visible.length) return null;
          return html`
            <details class="inline-subgroup" open style="margin-left:var(--space-2);margin-bottom:var(--space-1);">
              <summary style="font-size:var(--text-xs);font-weight:500;color:var(--text-secondary);cursor:pointer;padding:var(--space-1) var(--space-3);user-select:none;">
                ${sg.subGroup} <span style="color:var(--text-muted);font-weight:400;">(${visible.length})</span>
              </summary>
              ${visible.map(f => html`
                <${FileEntry}
                  key=${f.path}
                  file=${f}
                  extraText=${sg.subGroup}
                  onSelect=${onSelect}
                  isSelected=${selectedPath === f.path}
                />
              `)}
            </details>
          `;
        })}
      </div>
    `;
  }

  if (group.files) {
    const visible = group.files.filter(f => matchesFilter(f, ''));
    if (!visible.length) return null;
    return html`
      <div class="inline-file-group" style="margin-bottom:var(--space-3);">
        <div style="font-size:var(--text-xs);font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.07em;padding:var(--space-1) var(--space-3);">
          ${group.group}
        </div>
        ${visible.map(f => html`
          <${FileEntry}
            key=${f.path}
            file=${f}
            onSelect=${onSelect}
            isSelected=${selectedPath === f.path}
          />
        `)}
      </div>
    `;
  }

  return null;
}

// ---- Root FilesView ----
export function FilesView() {
  const { requestedFile } = useStore();

  const [groups, setGroups]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [selected, setSelected] = useState(null); // { path, label } | null

  // Fetch file tree on mount
  useEffect(() => {
    setLoading(true);
    fetch('/api/files')
      .then(r => r.json())
      .then(data => { setGroups(Array.isArray(data) ? data : []); })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  // Agent-jump bridge: requestedFile set by AgentsView
  useEffect(() => {
    if (!requestedFile) return;
    setFilter(requestedFile);
    // Clear the bridge field so this doesn't re-trigger
    setState({ requestedFile: null });
  }, [requestedFile]);

  return html`
    <div class="view active" id="view-files">
      <div class="view-title">Files</div>
      <div id="file-list-inline">
        <div class="filter-bar">
          <input
            class="filter-input"
            type="text"
            placeholder="Search files…"
            value=${filter}
            onInput=${e => setFilter(e.target.value)}
          />
        </div>
        <div id="inline-file-items" class="phase-list">
          ${loading
            ? html`<div class="empty" style="margin:16px;">Loading…</div>`
            : groups.length === 0
              ? html`<div class="empty" style="margin:16px;">No files found.</div>`
              : groups.map(g => html`
                  <${FileGroup}
                    key=${g.group}
                    group=${g}
                    onSelect=${setSelected}
                    selectedPath=${selected && selected.path}
                    filter=${filter}
                  />
                `)
          }
        </div>
      </div>
      ${selected && html`
        <${FileReader}
          path=${selected.path}
          title=${selected.label}
          onClose=${() => setSelected(null)}
        />
      `}
    </div>
  `;
}
