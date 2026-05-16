/**
 * FilesView — Preact port of the Files view from client-main.js.
 *
 * On mount: fetches /api/files to build the grouped file tree.
 * Clicking a file: fetches /api/file?path=... and renders markdown via the
 * global `marked` CDN lib (stays a CDN global — unchanged from legacy).
 *
 * Agent-jump bridge: when the store field `requestedFile` is set (by
 * AgentsView), FilesView picks it up and pre-fills the search filter, then
 * clears the field so subsequent renders don't re-trigger.
 */

import { html, useState, useEffect, useCallback } from '../preact.js';
import { useStore, setState } from '../store.js';
import { showToast } from '../components/shared.js';

// ---- Markdown helpers (ported from client-main.js:287-294) ----
function stripFrontmatter(md) {
  if (!md.startsWith('---')) return md;
  const end = md.indexOf('\n---', 3);
  return end === -1 ? md : md.slice(end + 4).trimStart();
}

function renderMd(md) {
  const clean = stripFrontmatter(md);
  return (typeof marked !== 'undefined')
    ? marked.parse(clean)
    : '<pre>' + clean.replace(/</g, '&lt;') + '</pre>';
}

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

// ---- File content pane ----
function FileContent({ path, html: htmlContent, loading, error }) {
  if (loading) {
    return html`
      <div id="file-view">
        <div class="skeleton"></div>
        <div class="skeleton" style="height:200px;"></div>
      </div>
    `;
  }
  if (error) {
    return html`
      <div id="file-view">
        <div style="color:var(--accent-red);padding:16px;">${error}</div>
      </div>
    `;
  }
  if (!path || !htmlContent) return html`<div id="file-view"></div>`;

  function copyPath() {
    navigator.clipboard.writeText(path).then(() => {
      showToast('Path copied!');
    }).catch(() => {});
  }

  return html`
    <div id="file-view">
      <div class="file-path-header">
        <span>${path}</span>
        <button class="copy-btn" onClick=${copyPath}>Copy</button>
      </div>
      <div class="md-render" dangerouslySetInnerHTML=${{ __html: htmlContent }} />
    </div>
  `;
}

// ---- Root FilesView ----
export function FilesView() {
  const { requestedFile } = useStore();

  const [groups, setGroups]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('');
  const [selectedPath, setSelectedPath] = useState(null);
  const [fileContent, setFileContent]   = useState({ html: null, loading: false, error: null });

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

  const loadFile = useCallback(async (file) => {
    setSelectedPath(file.path);
    setFileContent({ html: null, loading: true, error: null });
    try {
      const resp = await fetch('/api/file?path=' + encodeURIComponent(file.path));
      if (!resp.ok) {
        setFileContent({ html: null, loading: false, error: 'Failed to load file.' });
        return;
      }
      const text = await resp.text();
      setFileContent({ html: renderMd(text), loading: false, error: null });
    } catch {
      setFileContent({ html: null, loading: false, error: 'Network error.' });
    }
  }, []);

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
                    onSelect=${loadFile}
                    selectedPath=${selectedPath}
                    filter=${filter}
                  />
                `)
          }
        </div>
      </div>
      <${FileContent}
        path=${selectedPath}
        html=${fileContent.html}
        loading=${fileContent.loading}
        error=${fileContent.error}
      />
    </div>
  `;
}
