/**
 * orchestrator.js — ESM client for the orchestrator service.
 *
 * Pure logic: no DOM-by-id, no innerHTML. All state flows through the
 * Preact store (activeSessions field). Components import these functions
 * directly; no window.* globals needed after Sprint 31.4.
 *
 * Constants
 *   ORCH_HTTP — base URL for orchestrator REST API
 *   ORCH_WS   — base URL for orchestrator WebSocket
 */

import { getState, setState } from './store.js';
import { showToast } from './components/shared.js';

export const ORCH_HTTP = 'http://localhost:7718';
export const ORCH_WS   = 'ws://localhost:7718';

// ── Token helpers ─────────────────────────────────────────────────────────────

/** Return the current orchestrator token from the window global. */
export function orchToken() {
  return (typeof window !== 'undefined' && window.__ORCH_TOKEN__) || '';
}

/**
 * Re-fetch the live orchestrator token from the dashboard (same-origin).
 * Self-heals a long-open tab if the embedded token drifts.
 */
export function refreshOrchToken() {
  return fetch('/api/orch-token')
    .then(r => r.json())
    .then(d => { if (d && d.token) window.__ORCH_TOKEN__ = d.token; })
    .catch(() => {});
}

// ── REST actions ──────────────────────────────────────────────────────────────

/**
 * POST /api/run — start a PTY session for storyId.
 * Returns the parsed JSON response (or throws on network error).
 */
export function runSession(storyId, cmd) {
  const tok = orchToken();
  return fetch(ORCH_HTTP + '/api/run', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyId, cmd }),
  }).then(r => r.json());
}

/**
 * POST /api/stop — stop a running session.
 */
export function stopSession(storyId) {
  const tok = orchToken();
  return fetch(ORCH_HTTP + '/api/stop', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyId }),
  }).catch(() => {});
}

/**
 * GET /api/sessions — resolve { ok, sessions }. ok=false means the
 * orchestrator was unreachable (network failure / no token), which the
 * session poll records as orchOnline so the UI can show a down state.
 */
function fetchSessionsWithStatus() {
  const tok = orchToken();
  if (!tok) return Promise.resolve({ ok: false, sessions: [] });
  return fetch(ORCH_HTTP + '/api/sessions', {
    headers: { 'Authorization': 'Bearer ' + tok },
  })
    .then(r => {
      if (r.status === 401) { refreshOrchToken(); return { ok: true, sessions: [] }; }
      return r.json().then(d => ({ ok: true, sessions: (d && d.sessions) || [] }));
    })
    .catch(() => ({ ok: false, sessions: [] }));
}

/**
 * GET /api/sessions — return the sessions array (or [] on error).
 */
export function fetchSessions() {
  return fetchSessionsWithStatus().then(r => r.sessions);
}

/** True unless the last session poll found the orchestrator unreachable. */
export function isOrchOnline() {
  return getState().orchOnline !== false;
}

/**
 * POST /api/clean-sessions — remove ended sessions.
 * olderThanDays = 0 removes all ended sessions; > 0 keeps recent ones.
 */
export function cleanSessions(olderThanDays = 0) {
  const tok = orchToken();
  return fetch(ORCH_HTTP + '/api/clean-sessions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ olderThanDays }),
  })
    .then(r => r.json())
    .catch(() => ({ removed: 0 }));
}

// ── Session-awareness helpers ─────────────────────────────────────────────────
// These read activeSessions from the store — components subscribe to the store
// and re-render when the poll writes new data.

/** Return the session object for storyId, or null. */
export function activeSession(storyId) {
  const { activeSessions } = getState();
  return (activeSessions || []).find(s => s.storyId === storyId) || null;
}

/** True when storyId has a session with status==='running'. */
export function isSessionRunning(storyId) {
  const s = activeSession(storyId);
  return !!(s && s.status === 'running');
}

/** Count running sessions touching this sprint (sprint-level + its stories). */
export function runningInSprint(sp) {
  let n = isSessionRunning('sprint-' + sp.id) ? 1 : 0;
  (sp.stories || []).forEach(st => { if (st.id && isSessionRunning(st.id)) n++; });
  return n;
}

/** Count running sessions touching this phase. */
export function runningInPhase(p) {
  let n = isSessionRunning('phase-' + p.id) ? 1 : 0;
  (p.sprints || []).forEach(sp => { n += runningInSprint(sp); });
  return n;
}

/** Total count of sessions with status==='running'. */
export function runningTotal() {
  const { activeSessions } = getState();
  return (activeSessions || []).filter(s => s.status === 'running').length;
}

// ── Session poll ──────────────────────────────────────────────────────────────

let _pollTimer = null;

/**
 * Start polling /api/sessions every 4 s and writing activeSessions into the
 * store. Components react via useStore(). Safe to call multiple times — only
 * one poll runs at a time.
 */
export function startSessionsPoll() {
  if (_pollTimer) return;
  _poll();
  _pollTimer = setInterval(_poll, 4000);
}

/** Stop the session poll (e.g. when the dashboard is idle). */
export function stopSessionsPoll() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

function _poll() {
  fetchSessionsWithStatus().then(({ ok, sessions }) => {
    setState({ activeSessions: sessions, orchOnline: ok });
  });
}

// ── runAndOpenTerm convenience ────────────────────────────────────────────────

/**
 * Start a PTY session then open the xterm terminal panel.
 * The terminal panel is driven by store state (terminal field).
 *
 * @param {string} storyId
 * @param {string} cmd
 * @param {string} title
 */
export function runAndOpenTerm(storyId, cmd, title) {
  // Open the panel immediately (it shows "connecting" while the session starts).
  setState({
    terminal: {
      open: true,
      storyId,
      title: title || storyId,
      minimized: false,
      fullscreen: false,
    },
  });

  const tok = orchToken();
  if (!tok) { showToast('No orchestrator token — restart the dashboard'); return; }

  runSession(storyId, cmd).catch(err => {
    console.error('[orchestrator] session op failed:', err.message);
    showToast('Could not reach orchestrator — session not started');
  });
}

/**
 * Open the xterm panel for an already-running session (no POST /api/run).
 */
export function openTermPanel(storyId, title) {
  setState({
    terminal: {
      open: true,
      storyId,
      title: title || storyId,
      minimized: false,
      fullscreen: false,
    },
  });
}

/**
 * Open the orchestrator side panel for storyId.
 * Stored in store.orchPanel so OrchPanel reacts.
 */
export function openOrchPanel(storyId) {
  setState({ orchPanel: { open: true, storyId } });
}

/**
 * runStory — Kanban "Run" action. Moves card to in_progress visually then
 * delegates to runAndOpenTerm.
 */
export function runStory(storyId) {
  if (!storyId) return;
  runAndOpenTerm(storyId, '/rcode-dev-story ' + storyId, storyId);
}

/**
 * stopStory — Kanban "Stop" action.
 */
export function stopStory(storyId) {
  stopSession(storyId).catch(err => console.error('[orchestrator] session op failed:', err.message));
}

// ── Command runner ────────────────────────────────────────────────────────────
/**
 * Client-side allowlist — mirrors the server COMMAND_ALLOWLIST.
 * The server always re-validates; this list drives the picker dropdown only.
 * Update both when adding a new command.
 */
export const ALLOWED_COMMANDS = [
  { cmd: '/rcode-init',          label: 'init — initialise project workspace' },
  { cmd: '/rcode-status',        label: 'status — phase / sprint status' },
  { cmd: '/rcode-progress',      label: 'progress — milestone progress' },
  { cmd: '/rcode-help',          label: 'help — command reference' },
  { cmd: '/rcode-health',        label: 'health — repo health check' },
  { cmd: '/rcode-next',          label: 'next — suggest next action' },
  { cmd: '/rcode-show',          label: 'show — show current plan' },
  { cmd: '/rcode-list-plans',    label: 'list-plans — list all sprint plans' },
  { cmd: '/rcode-sprint-status', label: 'sprint-status — sprint execution status' },
  { cmd: '/rcode-config',        label: 'config — show rcode config' },
  { cmd: '/rcode-diff',          label: 'diff — diff since last checkpoint' },
  { cmd: '/rcode-stats',         label: 'stats — project statistics' },
];

/**
 * Launch an allowlisted rcode command from the dashboard command runner.
 * Uses a synthetic storyId derived from the command slug so it shows up as
 * its own session in the Orchestration grid.
 *
 * storyId format: "cmd-rcode-init" (satisfies STORY_ID_RE /^[A-Za-z0-9._-]+$/).
 *
 * Surfaces errors as toast notifications:
 *   - 403 / 503 / any server error message  → showToast('Command error: ...')
 *   - 409 "already running"                  → no toast (expected; terminal reattaches)
 *   - network failure                         → showToast('Could not reach orchestrator')
 *
 * @param {string} cmd  Must be one of ALLOWED_COMMANDS[*].cmd.
 */
export function runCommandFromUI(cmd) {
  if (!cmd) return;
  const slug    = cmd.replace(/^\//, '').replace(/\//g, '-');
  const storyId = 'cmd-' + slug;
  const title   = cmd + ' (command runner)';
  // Open the terminal panel immediately so the user gets visual feedback.
  setState({
    terminal: { open: true, storyId, title, minimized: false, fullscreen: false },
  });

  const tok = orchToken();
  if (!tok) { showToast('No orchestrator token — restart the dashboard'); return; }

  runSession(storyId, cmd)
    .then(data => {
      // 409 = already running (not an error — terminal is already attached).
      if (data && data.error && !data.error.includes('already running')) {
        showToast('Command error: ' + data.error);
      }
    })
    .catch(() => showToast('Could not reach orchestrator'));
}
