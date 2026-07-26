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

import { html, useState, useEffect, useMemo } from '../preact.js';
import { useStore, setState } from '../store.js';
import { FileReader } from '../components/FileReader.js';
import { Icon } from '../icons-client.js';

// File-type icon — markdown gets its own glyph, everything else a plain file.
function fileIcon(label) {
  return /\.md$/i.test(label || '') ? 'file-text' : 'file';
}

// ---- File tree components ----
function FileEntry({ file, onSelect, isSelected }) {
  return html`
    <div
      class=${'inline-file-entry' + (isSelected ? ' selected' : '')}
      data-path=${file.path}
      title=${file.path}
      onClick=${() => onSelect(file)}
    >
      <${Icon} name=${fileIcon(file.label)} size=${13}/>
      <span class="inline-file-label">${file.label}</span>
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
    const subGroupsVisible = group.subGroups
      .map(sg => ({ sg, visible: sg.files.filter(f => matchesFilter(f, sg.subGroup)) }))
      .filter(x => x.visible.length);
    if (!subGroupsVisible.length) return null;
    const total = subGroupsVisible.reduce((n, x) => n + x.visible.length, 0);
    return html`
      <div class="inline-file-group">
        <div class="inline-file-group-title">
          ${group.group} <span class="inline-file-group-count">${total}</span>
        </div>
        ${subGroupsVisible.map(({ sg, visible }) => html`
          <details class="inline-subgroup" open>
            <summary class="inline-subgroup-summary">
              ${sg.subGroup} <span class="inline-file-group-count">${visible.length}</span>
            </summary>
            ${visible.map(f => html`
              <${FileEntry}
                key=${f.path}
                file=${f}
                onSelect=${onSelect}
                isSelected=${selectedPath === f.path}
              />
            `)}
          </details>
        `)}
      </div>
    `;
  }

  if (group.files) {
    const visible = group.files.filter(f => matchesFilter(f, ''));
    if (!visible.length) return null;
    return html`
      <div class="inline-file-group">
        <div class="inline-file-group-title">
          ${group.group} <span class="inline-file-group-count">${visible.length}</span>
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

  // Agent-jump bridge: the agent drawer's "View file in Files" sets
  // requestedFile to a project-relative path — open it in the reader.
  useEffect(() => {
    if (!requestedFile) return;
    setSelected({ path: requestedFile, label: requestedFile.split('/').pop() });
    // Clear the bridge field so this doesn't re-trigger
    setState({ requestedFile: null });
  }, [requestedFile]);

  const total = useMemo(() => groups.reduce((n, g) =>
    n + (g.files ? g.files.length : (g.subGroups || []).reduce((m, sg) => m + sg.files.length, 0)), 0),
    [groups]);

  return html`
    <div class="view active" id="view-files">
      <div class="view-title">
        Files ${total > 0 ? html`<span class="inline-file-total">${total}</span>` : null}
      </div>
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
            ? html`<div class="empty">Loading…</div>`
            : groups.length === 0
              ? html`<div class="empty">No files found.</div>`
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
