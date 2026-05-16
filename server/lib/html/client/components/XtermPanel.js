/**
 * XtermPanel — Preact wrapper around the CDN xterm.js terminal.
 *
 * xterm.js is NOT replaced — it stays the CDN global (Terminal, FitAddon)
 * loaded by shell.js. This component manages:
 *   - One shared xterm instance (built once in a useRef, reused per session)
 *   - WebSocket lifecycle: connect on open, write output, send keystrokes/resize
 *   - Panel visibility: open / minimized-pill / fullscreen controlled by store
 *
 * Store field: state.terminal = { open, storyId, title, minimized, fullscreen }
 * Setting state.terminal via orchestrator.js triggers this component.
 */

import { html, useEffect, useRef, useCallback } from '../preact.js';
import { useStore, setState } from '../store.js';
import { orchToken, stopSession, ORCH_WS } from '../orchestrator.js';

// ── Internal state (module-scoped, one panel at a time) ──────────────────────
// These refs are NOT component state because the xterm instance must persist
// across panel open/close cycles and Preact re-renders.
let _term    = null;
let _termFit = null;
let _termWs  = null;

function setStatus(dotStatus) {
  // Propagate connection status via a store signal so the pill/header can react
  setState({ termStatus: dotStatus || '' });
}

function _resize() {
  if (_termFit) { try { _termFit.fit(); } catch (_e) {} }
  if (_term && _termWs && _termWs.readyState === 1) {
    _termWs.send(JSON.stringify({ t: 'r', cols: _term.cols, rows: _term.rows }));
  }
}

/** Build the xterm instance exactly once; attach to `containerEl`. */
function ensureTerm(containerEl) {
  if (_term || typeof Terminal === 'undefined') return;
  _term = new Terminal({
    theme: {
      background: '#0c0c0e', foreground: '#c9d1d9',
      cursor: '#58a6ff', selectionBackground: 'rgba(94,106,210,0.25)',
      black: '#0c0c0e', red: '#ff4444', green: '#3fb950',
      yellow: '#d29922', blue: '#58a6ff', magenta: '#bc8cff',
      cyan: '#39c5cf', white: '#b1bac4', brightBlack: '#6e7681',
    },
    fontFamily: '"JetBrains Mono","SF Mono",Consolas,monospace',
    fontSize: 12, lineHeight: 1.4,
    // PTY output already carries CRLF — converting again would double lines.
    convertEol: false,
    scrollback: 8000, cursorBlink: true,
  });
  if (typeof FitAddon !== 'undefined') {
    _termFit = new FitAddon.FitAddon();
    _term.loadAddon(_termFit);
  }
  _term.open(containerEl);
  if (_termFit) { try { _termFit.fit(); } catch (_e) {} }
  // Keystrokes → PTY
  _term.onData(data => {
    if (_termWs && _termWs.readyState === 1) {
      _termWs.send(JSON.stringify({ t: 'i', d: data }));
    }
  });
}

/** Open a WebSocket to the orchestrator PTY for storyId. */
function connectWs(storyId) {
  if (_termWs) { try { _termWs.close(); } catch (_e) {} _termWs = null; }
  const tok = orchToken();
  if (!tok) {
    if (_term) _term.writeln('\r\n\x1b[31m✗ No orchestrator token — restart the dashboard\x1b[0m');
    return;
  }
  setStatus('connecting');
  const url = ORCH_WS + '/ws/' + encodeURIComponent(storyId) + '?token=' + encodeURIComponent(tok);
  const ws = new WebSocket(url);
  _termWs = ws;

  ws.onopen = () => { _resize(); };
  ws.onmessage = e => {
    let m;
    try { m = JSON.parse(e.data); } catch { return; }
    if (m.t === 'o' || m.t === 'hist') {
      if (_term) _term.write(m.d);
    } else if (m.t === 's') {
      setStatus(m.s);
      if (m.s === 'done' || m.s === 'exited' || m.s === 'stopped' || m.s === 'error') {
        if (_term) _term.writeln('\r\n\x1b[90m── session ' + m.s + ' ──\x1b[0m');
      }
    }
  };
  ws.onerror = () => { setStatus('error'); };
  ws.onclose = () => { if (_termWs === ws) _termWs = null; };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function XtermPanel() {
  const { terminal, termStatus } = useStore();
  const containerRef = useRef(null);
  const currentStoryRef = useRef(null);

  const t = terminal || {};
  const open       = !!t.open;
  const minimized  = !!t.minimized;
  const fullscreen = !!t.fullscreen;
  const storyId    = t.storyId || '';
  const title      = t.title   || 'Terminal';

  // Build xterm instance on first open; reconnect when storyId changes.
  // The resize listener is registered here (not inside ensureTerm) so the
  // cleanup return can mirror it on unmount.
  useEffect(() => {
    if (!open || !containerRef.current) return;
    ensureTerm(containerRef.current);
    if (_term) { _term.clear(); _resize(); }
    if (storyId && storyId !== currentStoryRef.current) {
      currentStoryRef.current = storyId;
      connectWs(storyId);
    }
    window.addEventListener('resize', _resize);
    return () => window.removeEventListener('resize', _resize);
  }, [open, storyId]);

  // Resize when entering/leaving fullscreen or on open
  useEffect(() => {
    if (open) { setTimeout(_resize, 50); }
  }, [open, fullscreen]);

  // Escape key closes
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && open && !minimized) {
        setState({ terminal: { ...t, open: false } });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, minimized, t]);

  const dotCls = 'term-status-dot ' + (termStatus || '');

  // ── Actions ──
  const handleMinimize = useCallback(() => {
    setState({ terminal: { ...t, open: true, minimized: true } });
  }, [t]);

  const handleRestore = useCallback(() => {
    setState({ terminal: { ...t, open: true, minimized: false } });
    setTimeout(_resize, 50);
  }, [t]);

  const handleClose = useCallback(() => {
    if (_termWs) { try { _termWs.close(); } catch (_e) {} _termWs = null; }
    setState({ terminal: null });
  }, []);

  const handleStop = useCallback(() => {
    if (storyId) stopSession(storyId);
  }, [storyId]);

  const handleToggleFull = useCallback(() => {
    setState({ terminal: { ...t, fullscreen: !fullscreen } });
    setTimeout(_resize, 50);
  }, [t, fullscreen]);

  // ── Pill (minimized state) ──
  const pill = html`
    <div
      class=${'term-pill' + (minimized ? ' show' : '')}
      onClick=${handleRestore}
      title="Restore terminal"
    >
      <span class=${dotCls}></span>
      <span>${title}</span>
      <span class="term-pill-icon">▢</span>
    </div>
  `;

  // ── Backdrop ──
  const backdrop = html`
    <div class=${'term-backdrop' + (open && !minimized ? ' open' : '')}></div>
  `;

  // ── Panel ──
  const panelCls = 'term-panel' +
    (open && !minimized ? ' open' : '') +
    (fullscreen         ? ' fullscreen' : '');

  const panel = html`
    <div class=${panelCls}>
      <div class="term-header">
        <div class="term-header-left">
          <div class=${dotCls}></div>
          <span class="term-title">${title}</span>
        </div>
        <div class="term-header-right">
          <button class="term-btn" onClick=${handleToggleFull} title="Toggle full screen">
            ⛶ Full
          </button>
          <button class="term-btn" onClick=${handleMinimize} title="Minimize — session keeps running">
            — Min
          </button>
          <button class="term-btn term-stop-btn" onClick=${handleStop} title="End the agent session">
            ■ Stop
          </button>
          <button class="term-btn" onClick=${handleClose} title="Close viewer — session keeps running">
            ✕ Close
          </button>
        </div>
      </div>
      <div class="term-hint">Click the terminal and type to talk to the agent — Enter sends, Ctrl+C interrupts.</div>
      <div ref=${containerRef} id="term-container"></div>
    </div>
  `;

  return [backdrop, panel, pill];
}
