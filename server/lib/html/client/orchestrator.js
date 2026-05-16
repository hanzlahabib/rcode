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
 * GET /api/sessions — return the sessions array (or [] on error).
 */
export function fetchSessions() {
  const tok = orchToken();
  if (!tok) return Promise.resolve([]);
  return fetch(ORCH_HTTP + '/api/sessions', {
    headers: { 'Authorization': 'Bearer ' + tok },
  })
    .then(r => {
      if (r.status === 401) { refreshOrchToken(); return []; }
      return r.json().then(d => (d && d.sessions) || []);
    })
    .catch(() => []);
}

/**
 * POST /api/clean-sessions — remove sessions older than N days.
 */
export function cleanSessions(olderThanDays = 7) {
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
  fetchSessions().then(sessions => {
    setState({ activeSessions: sessions });
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
  if (!tok) return;

  runSession(storyId, cmd).catch(() => {});
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
  runAndOpenTerm(storyId, '/rihal-dev-story ' + storyId, storyId);
}

/**
 * stopStory — Kanban "Stop" action.
 */
export function stopStory(storyId) {
  stopSession(storyId);
}
