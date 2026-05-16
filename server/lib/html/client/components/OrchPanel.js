/**
 * OrchPanel — Preact port of the #orch-panel orchestrator side panel.
 *
 * Displays a tab strip of SSE-streamed agent sessions with live output,
 * file-change tracking, and footer controls (Stop / Clear / Clean).
 *
 * Driven by store.orchPanel = { open, storyId }.
 * Session data is held in component state (sessionsMap) — each session has:
 *   { title, lines: [], fileOps: [], status }
 *
 * The SSE stream (connectOrchestratorStream) appends chunks/lines/fileOps
 * as component state updates, which causes Preact to re-render the terminal
 * body. No direct DOM manipulation.
 */

import { html, useState, useEffect, useRef, useCallback } from '../preact.js';
import { useStore, setState } from '../store.js';
import { orchToken, stopSession, cleanSessions, ORCH_HTTP } from '../orchestrator.js';
import { showToast } from './shared.js';
import { Icon } from '../icons-client.js';

// ── Session map helpers ───────────────────────────────────────────────────────

function mkSession(title) {
  return { title: title || 'Session', lines: [], fileOps: [], status: 'starting' };
}

// ── SSE streams (module-scoped — one EventSource per storyId) ────────────────
const _streams = {};

function closeStream(storyId) {
  if (_streams[storyId]) { _streams[storyId].close(); delete _streams[storyId]; }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrchPanel() {
  const { orchPanel } = useStore();
  const open     = !!(orchPanel && orchPanel.open);
  const reqStory = orchPanel && orchPanel.storyId;

  // sessionsMap: { [storyId]: { title, lines, fileOps, status } }
  const [sessionsMap, setSessionsMap] = useState({});
  const [activeTab,   setActiveTab  ] = useState(null);
  const bodyRef = useRef(null);

  // Scroll to bottom whenever lines change for the active tab
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [sessionsMap, activeTab]);

  // Close all SSE streams on unmount to prevent leaking EventSource connections.
  useEffect(() => {
    return () => {
      Object.keys(_streams).forEach(closeStream);
    };
  }, []);

  // When orchPanel is opened with a storyId, create the tab and connect SSE
  useEffect(() => {
    if (!reqStory) return;
    setSessionsMap(prev => {
      if (prev[reqStory]) return prev;
      return { ...prev, [reqStory]: mkSession(reqStory) };
    });
    setActiveTab(reqStory);
    // Connect SSE if not already connected
    if (!_streams[reqStory]) {
      connectStream(reqStory);
    }
  }, [reqStory]);

  function connectStream(storyId) {
    const tok = orchToken();
    const es = new EventSource(
      ORCH_HTTP + '/api/stream/' + encodeURIComponent(storyId) +
      '?token=' + encodeURIComponent(tok || '')
    );
    _streams[storyId] = es;

    function appendLine(storyId, line, cls) {
      setSessionsMap(prev => {
        const sess = prev[storyId];
        if (!sess) return prev;
        return {
          ...prev,
          [storyId]: { ...sess, lines: [...sess.lines, { text: line, cls }] },
        };
      });
    }

    function appendChunk(storyId, chunk) {
      setSessionsMap(prev => {
        const sess = prev[storyId];
        if (!sess) return prev;
        const lines = sess.lines;
        const last = lines[lines.length - 1];
        if (last && last.cls === 'kt-stream') {
          const updated = [...lines];
          updated[updated.length - 1] = { ...last, text: last.text + chunk };
          return { ...prev, [storyId]: { ...sess, lines: updated } };
        }
        return {
          ...prev,
          [storyId]: { ...sess, lines: [...lines, { text: chunk, cls: 'kt-stream' }] },
        };
      });
    }

    function appendFileOp(storyId, fileOp) {
      setSessionsMap(prev => {
        const sess = prev[storyId];
        if (!sess) return prev;
        return {
          ...prev,
          [storyId]: { ...sess, fileOps: [...sess.fileOps, fileOp] },
        };
      });
    }

    function setTabStatus(storyId, status) {
      setSessionsMap(prev => {
        const sess = prev[storyId];
        if (!sess) return prev;
        return { ...prev, [storyId]: { ...sess, status } };
      });
    }

    es.onmessage = e => {
      try {
        const d = JSON.parse(e.data);
        if (d.chunk)  appendChunk(storyId, d.chunk);
        if (d.line)   {
          let cls = 'kt-line';
          const l = d.line;
          if (l.startsWith('⚙'))  cls += ' tool';
          else if (l.startsWith('⚠')) cls += ' warn';
          else if (l.startsWith('✗')) cls += ' err';
          else if (l.startsWith('✅')) cls += ' done-line';
          else if (l.startsWith('▶') || l.startsWith('◉') || l.startsWith('■')) cls += ' meta';
          appendLine(storyId, l, cls);
        }
        if (d.fileOp) appendFileOp(storyId, d.fileOp);
        if (d.status) {
          setTabStatus(storyId, d.status);
          if (d.status === 'done')    appendLine(storyId, '✅ Done', 'kt-line done-line');
          if (d.status === 'stopped') appendLine(storyId, '■ Stopped', 'kt-line meta');
          if (d.status !== 'running') { closeStream(storyId); }
        }
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => {
      setTabStatus(storyId, 'error');
      closeStream(storyId);
    };
  }

  const handleClose = useCallback(() => {
    setState({ orchPanel: null });
  }, []);

  function handleTabClick(storyId) {
    setActiveTab(storyId);
  }

  function handleTabClose(e, storyId) {
    e.stopPropagation();
    closeStream(storyId);
    setSessionsMap(prev => {
      const next = { ...prev };
      delete next[storyId];
      return next;
    });
    if (activeTab === storyId) {
      const remaining = Object.keys(sessionsMap).filter(k => k !== storyId);
      setActiveTab(remaining[0] || null);
    }
  }

  function handleStop() {
    if (activeTab) stopSession(activeTab);
  }

  function handleClear() {
    if (!activeTab) return;
    setSessionsMap(prev => {
      const sess = prev[activeTab];
      if (!sess) return prev;
      return { ...prev, [activeTab]: { ...sess, lines: [], fileOps: [] } };
    });
  }

  function handleClean() {
    cleanSessions(7).then(d => {
      showToast('Cleaned ' + (d.removed || 0) + ' sessions');
    });
  }

  const tabs = Object.keys(sessionsMap);
  const activeSess = activeTab ? sessionsMap[activeTab] : null;
  const hasStream = activeTab && !!_streams[activeTab];
  const runningCount = Object.keys(_streams).length;

  const panelCls = 'orch-panel' + (open ? ' open' : '');

  return html`
    <div class=${panelCls}>
      <div class="orch-panel-header">
        <div class="orch-panel-title">
          <span class=${'orch-status-dot' + (runningCount > 0 ? ' up' : '')}></span>
          Agent Sessions
        </div>
        <button class="orch-panel-close" onClick=${handleClose} title="Close" aria-label="Close panel"><${Icon} name="x" size=${14}/></button>
      </div>

      <!-- Tab strip -->
      <div class="orch-tabs">
        ${tabs.length === 0 ? html`
          <div class="orch-term-empty orch-empty-tab">
            No active sessions
          </div>
        ` : tabs.map(sid => {
          const sess = sessionsMap[sid];
          const isActive = sid === activeTab;
          return html`
            <button
              key=${sid}
              class=${'orch-tab' + (isActive ? ' active' : '')}
              onClick=${() => handleTabClick(sid)}
            >
              <span class=${'tab-status-dot ' + (sess.status || 'starting')}></span>
              <span>${(sess.title || sid).slice(0, 20)}</span>
              <button
                class="orch-tab-close"
                onClick=${e => handleTabClose(e, sid)}
                title="Close"
                aria-label="Close tab"
              ><${Icon} name="x" size=${12}/></button>
            </button>
          `;
        })}
      </div>

      <!-- Terminal body -->
      <div class="orch-terminal">
        <div class="orch-term-body" ref=${bodyRef}>
          ${!activeSess ? html`
            <div class="orch-term-empty">
              <div>Select a session or run a story card</div>
            </div>
          ` : activeSess.lines.length === 0 ? html`
            <div class="orch-term-empty">
              <div>No output yet for ${activeTab}</div>
            </div>
          ` : activeSess.lines.map((line, i) => html`
            <div key=${i} class=${line.cls}>${line.text}</div>
          `)}
        </div>
        ${activeSess && activeSess.fileOps.length > 0 ? html`
          <div class="orch-files">
            <div class="orch-files-head">File changes</div>
            ${activeSess.fileOps.map((fo, i) => {
              const opClass = fo.op === 'write' ? 'op-w' : fo.op === 'bash' ? 'op-b' : 'op-r';
              const opLabel = fo.op === 'write' ? '✎' : fo.op === 'bash' ? '$' : null;
              const label   = fo.path || fo.cmd || fo.tool || '';
              return html`
                <div key=${i} class="kt-file">
                  <span class=${'op-icon ' + opClass}>${fo.op !== 'write' && fo.op !== 'bash' ? html`<${Icon} name="eye" size=${12}/>` : opLabel}</span> ${label}
                </div>
              `;
            })}
          </div>
        ` : null}
      </div>

      <!-- Footer -->
      <div class="orch-panel-footer">
        <!-- style= here is intentional: dynamic display:none toggle — replacing with a CSS class would require extra state wiring -->
        <button
          class="orch-footer-btn stop"
          style=${hasStream ? '' : 'display:none'}
          onClick=${handleStop}
        >■ Stop</button>
        <button class="orch-footer-btn" onClick=${handleClear}>Clear</button>
        <button class="orch-footer-btn" onClick=${handleClean}>Clean sessions…</button>
        <div class="orch-footer-spacer"></div>
        <span class="orch-footer-status">
          ${runningCount > 0 ? runningCount + ' running' : ''}
        </span>
      </div>
    </div>
  `;
}
