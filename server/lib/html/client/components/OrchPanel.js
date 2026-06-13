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
import { orchToken, stopSession, cleanSessions, ORCH_WS } from '../orchestrator.js';
import { showToast } from './shared.js';
import { Icon } from '../icons-client.js';

// ── Session map helpers ───────────────────────────────────────────────────────

function mkSession(title) {
  return { title: title || 'Session', lines: [], fileOps: [], status: 'starting' };
}

/**
 * Strip ANSI escape sequences (OSC, CSI, other ESC) and carriage returns so
 * raw PTY output renders as readable plain-text log lines. The full-fidelity
 * terminal lives in XtermPanel; this panel is a lightweight log view.
 */
function stripAnsi(s) {
  return String(s)
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, '')
    .replace(/\x1b[@-_]/g, '')
    .replace(/\r/g, '');
}

// ── Live streams (module-scoped — one WebSocket per storyId) ─────────────────
// The orchestrator's data plane is the PTY WebSocket at /ws/<storyId>
// (wire frames: {t:'o',d} output, {t:'hist',d} scrollback, {t:'s',s} status).
// The previous SSE endpoint (/api/stream/<id>) no longer exists on the server.
const _streams = {};

function closeStream(storyId) {
  if (_streams[storyId]) { _streams[storyId].close(); delete _streams[storyId]; }
}

// ── Component ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rcode-orch-panel-w';
const MIN_W = 360;

export function OrchPanel() {
  const { orchPanel, activeSessions } = useStore();
  const open     = !!(orchPanel && orchPanel.open);
  const reqStory = orchPanel && orchPanel.storyId;
  // Sessions reported by the orchestrator API (4s poll → store.activeSessions).
  const apiSessions = activeSessions || [];

  // sessionsMap: { [storyId]: { title, lines, fileOps, status } }
  const [sessionsMap, setSessionsMap] = useState({});
  const [activeTab,   setActiveTab  ] = useState(null);
  const bodyRef  = useRef(null);
  const panelRef = useRef(null);

  // Restore saved width on open
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) panelRef.current.style.setProperty('--orch-w', saved + 'px');
  }, [open]);

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
    if (!tok) {
      showToast('No orchestrator token — restart the dashboard');
      return;
    }
    const ws = new WebSocket(
      ORCH_WS + '/ws/' + encodeURIComponent(storyId) +
      '?token=' + encodeURIComponent(tok)
    );
    _streams[storyId] = ws;

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

    // Append a multi-line output chunk: the first segment continues the last
    // streamed line, each newline starts a fresh line element.
    function appendChunk(storyId, chunk) {
      setSessionsMap(prev => {
        const sess = prev[storyId];
        if (!sess) return prev;
        const parts = chunk.split('\n');
        const lines = [...sess.lines];
        const last = lines[lines.length - 1];
        if (last && last.cls === 'kt-stream') {
          lines[lines.length - 1] = { ...last, text: last.text + parts[0] };
        } else if (parts[0]) {
          lines.push({ text: parts[0], cls: 'kt-stream' });
        }
        for (let i = 1; i < parts.length; i++) {
          lines.push({ text: parts[i], cls: 'kt-stream' });
        }
        return { ...prev, [storyId]: { ...sess, lines } };
      });
    }

    function setTabStatus(storyId, status) {
      setSessionsMap(prev => {
        const sess = prev[storyId];
        if (!sess) return prev;
        return { ...prev, [storyId]: { ...sess, status } };
      });
    }

    ws.onmessage = e => {
      let d;
      try { d = JSON.parse(e.data); } catch { return; }
      if (!d) return;
      if (d.t === 'o' || d.t === 'hist') {
        const text = stripAnsi(d.d);
        if (text) appendChunk(storyId, text);
      } else if (d.t === 's') {
        setTabStatus(storyId, d.s);
        if (d.s === 'done')    appendLine(storyId, '✅ Done', 'kt-line done-line');
        if (d.s === 'stopped') appendLine(storyId, '■ Stopped', 'kt-line meta');
        if (d.s !== 'running' && d.s !== 'starting') closeStream(storyId);
      }
    };
    ws.onerror = () => {
      setTabStatus(storyId, 'error');
      closeStream(storyId);
    };
    ws.onclose = () => {
      if (_streams[storyId] === ws) delete _streams[storyId];
    };
  }

  const handleClose = useCallback(() => {
    setState({ orchPanel: null });
  }, []);

  // Horizontal resize via the left-edge drag handle
  function handleResizeDown(e) {
    e.preventDefault();
    const startX = e.clientX;
    const el = panelRef.current;
    if (!el) return;
    const startW = el.getBoundingClientRect().width;
    const handle = e.currentTarget;
    handle.classList.add('dragging');

    function onMove(ev) {
      const delta = startX - ev.clientX;
      const maxW = Math.floor(window.innerWidth * 0.7);
      const w = Math.min(maxW, Math.max(MIN_W, startW + delta));
      el.style.setProperty('--orch-w', w + 'px');
    }

    function onUp(ev) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      handle.classList.remove('dragging');
      const w = Math.round(el.getBoundingClientRect().width);
      localStorage.setItem(STORAGE_KEY, w);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Open (or focus) a session tab and attach its live stream. Used both for
  // locally-opened tabs and for sessions discovered via the orchestrator API.
  function handleTabClick(storyId) {
    setSessionsMap(prev => prev[storyId] ? prev : { ...prev, [storyId]: mkSession(storyId) });
    setActiveTab(storyId);
    if (!_streams[storyId]) connectStream(storyId);
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
    cleanSessions().then(d => {
      showToast('Cleaned ' + (d.removed || 0) + ' sessions');
    });
  }

  const tabs = Object.keys(sessionsMap);
  // Sessions the orchestrator knows about that aren't open as tabs yet —
  // rendered as clickable entries so the panel reflects the API, not just
  // locally-opened tabs.
  const apiOnly = apiSessions.filter(s => s.storyId && !sessionsMap[s.storyId]);
  const activeSess = activeTab ? sessionsMap[activeTab] : null;
  const hasStream = activeTab && !!_streams[activeTab];
  // 'blocked' = live PTY waiting for input — still a live session.
  const runningCount = apiSessions.filter(s => s.status === 'running' || s.status === 'blocked').length;

  const panelCls = 'orch-panel' + (open ? ' open' : '');

  return html`
    <div class=${panelCls} ref=${panelRef}>
      <div class="orch-panel-resize" onMouseDown=${handleResizeDown}></div>
      <div class="orch-panel-header">
        <div class="orch-panel-title">
          <span class=${'orch-status-dot' + (runningCount > 0 ? ' up' : '')}></span>
          Agent Sessions
        </div>
        <button class="orch-panel-close" onClick=${handleClose} title="Close" aria-label="Close panel"><${Icon} name="x" size=${14}/></button>
      </div>

      <!-- Tab strip — open tabs first, then API-known sessions not yet opened -->
      <div class="orch-tabs">
        ${tabs.length === 0 && apiOnly.length === 0 ? html`
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
        ${apiOnly.map(s => html`
          <button
            key=${s.storyId}
            class="orch-tab"
            onClick=${() => handleTabClick(s.storyId)}
            title=${'Attach to ' + s.storyId}
          >
            <span class=${'tab-status-dot ' + (s.status || 'starting')}></span>
            <span>${s.storyId.slice(0, 20)}</span>
          </button>
        `)}
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
