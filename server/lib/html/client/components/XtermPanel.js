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
 *
 * Two mount points, one singleton terminal:
 *   - App.js mounts one instance as a floating overlay (backdrop + sliding
 *     panel + minimized pill) on every view.
 *   - OrchestrationView.js mounts a second instance with `docked=true` to
 *     embed the SAME xterm.js Terminal inline in its right column.
 * Only one instance may touch the DOM at a time — App.js passes
 * `suspend=${view === 'orchestration'}` so its overlay instance goes fully
 * inert (renders null, effects no-op) while Orchestration's docked instance
 * is mounted. `ensureTerm()` reparents the shared xterm DOM node into
 * whichever container asks for it, so the buffer/connection survive the
 * hand-off in both directions.
 */

import { html, useEffect, useRef, useCallback } from '../preact.js';
import { useStore, setState } from '../store.js';
import { orchToken, stopSession, orchWs, isOrchAvailable, projectRoot } from '../orchestrator.js';

// ── Internal state (module-scoped, one panel at a time) ──────────────────────
// These are NOT component state because the xterm instance (and the story it
// is currently connected to) must persist across panel open/close cycles,
// Preact re-renders, and — now — across the two XtermPanel mount points
// (floating overlay vs. docked). Component-local refs would not be shared
// between those two instances.
let _term          = null;
let _termFit       = null;
let _termWs        = null;
let _currentStory  = null;

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

/**
 * Build the xterm instance exactly once; attach to `containerEl`.
 * If the instance already exists but lives under a DIFFERENT container
 * (e.g. the overlay panel had it, and the docked panel is now asking), move
 * its root DOM node into `containerEl` instead of no-oping. xterm.js's root
 * element is a plain DOM node — reparenting it is safe and preserves the
 * scrollback buffer and any live WebSocket connection.
 */
function ensureTerm(containerEl) {
  if (_term) {
    if (_term.element && _term.element.parentElement !== containerEl) {
      containerEl.appendChild(_term.element);
      if (_termFit) { try { _termFit.fit(); } catch (_e) {} }
    }
    return;
  }
  if (typeof Terminal === 'undefined') return;
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
  if (!isOrchAvailable()) {
    if (_term) _term.writeln('\r\n\x1b[31m✗ Orchestration is disabled — no orchestrator is running for this project\x1b[0m');
    return;
  }
  setStatus('connecting');
  const url = orchWs() + '/ws/' + encodeURIComponent(storyId) +
    '?token=' + encodeURIComponent(tok) + '&root=' + encodeURIComponent(projectRoot());
  const ws = new WebSocket(url);
  _termWs = ws;

  ws.onopen = () => { _resize(); };
  ws.onmessage = e => {
    let m;
    try { m = JSON.parse(e.data); } catch { return; }
    if (!m) return;
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

export function XtermPanel({ docked = false, suspend = false } = {}) {
  const { terminal, termStatus } = useStore();
  const containerRef = useRef(null);

  const t = terminal || {};
  const open       = !!t.open;
  const minimized  = !!t.minimized;
  const fullscreen = !!t.fullscreen;
  const storyId    = t.storyId || '';
  const title      = t.title   || 'Terminal';

  // Build/attach the xterm instance on open; (re)connect only when the
  // focused storyId actually changes. `_currentStory` is module-scoped (not
  // a per-instance ref) so that handing the terminal off between the
  // floating overlay and the docked panel — same storyId, different
  // container — reparents via ensureTerm() without tearing down the
  // connection or clearing the buffer. `suspend` is in the dep array so the
  // OTHER (un-suspending) instance re-runs this effect and reclaims the
  // terminal DOM node when the user navigates away from Orchestration.
  useEffect(() => {
    if (suspend || !open || !containerRef.current) return;
    ensureTerm(containerRef.current);
    const isNewSession = storyId && storyId !== _currentStory;
    if (isNewSession) {
      _currentStory = storyId;
      if (_term) _term.clear();
      connectWs(storyId);
    }
    _resize();
    window.addEventListener('resize', _resize);
    return () => window.removeEventListener('resize', _resize);
  }, [open, storyId, suspend]);

  // Resize when entering/leaving fullscreen or on open
  useEffect(() => {
    if (!suspend && open) { setTimeout(_resize, 50); }
  }, [open, fullscreen, suspend]);

  // Escape key closes (docked panel has no "close" concept — it just shows
  // the empty state when store.terminal is cleared elsewhere)
  useEffect(() => {
    if (suspend || docked) return;
    function onKey(e) {
      if (e.key === 'Escape' && open && !minimized) {
        setState({ terminal: { ...t, open: false } });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, minimized, t, suspend, docked]);

  const dotCls = 'term-status-dot ' + (termStatus || '');
  // Statuses that mean "output is actively streaming" for the docked live pulse.
  const isLive = open && ['running', 'connecting', 'blocked', 'waiting'].includes(termStatus);

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

  // Fully inert while the sibling instance owns the terminal DOM — no
  // backdrop, no panel, no pill, nothing rendered at all.
  if (suspend) return null;

  // ── Docked render (Orchestration view's right column) ──
  if (docked) {
    return html`
      <div class="orch-term-dock">
        <div class="orch-term-dock-header">
          <span class="orch-term-dot red"></span>
          <span class="orch-term-dot amber"></span>
          <span class="orch-term-dot green"></span>
          <span class="orch-term-dock-label">xterm${open ? ' · ' + title : ''}</span>
          ${isLive ? html`
            <span class="orch-term-dock-live">
              <span class="orch-term-dock-live-dot"></span>live
            </span>
          ` : null}
          ${open ? html`
            <button class="orch-term-dock-stop" onClick=${handleStop} title="End the agent session">Stop</button>
          ` : null}
        </div>
        <div class="orch-term-dock-body">
          ${open
            ? html`<div ref=${containerRef} class="orch-term-dock-container"></div>`
            : html`
              <div class="orch-term-dock-empty">
                No active execution. Select a command from the Runner picker to begin.
              </div>
            `}
        </div>
      </div>
    `;
  }

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
