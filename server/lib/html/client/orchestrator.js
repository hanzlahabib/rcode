/**
 * orchestrator.js — ESM client for the orchestrator service.
 *
 * Pure logic: no DOM-by-id, no innerHTML. All state flows through the
 * Preact store (activeSessions field). Components import these functions
 * directly; no window.* globals needed after Sprint 31.4.
 *
 * Functions
 *   orchHttp() — base URL for orchestrator REST API
 *   orchWs()   — base URL for orchestrator WebSocket
 */

import { getState, setState } from './store.js';
import { showToast } from './components/shared.js';
import { trackBlocked } from './notify.js';

// #969 / #1037 — the orchestrator port is injected by the server (see
// shell.js) as window.__ORCH_PORT__, since a dashboard started with
// ORCH_PORT set (e.g. a second instance under test) spawns its orchestrator
// on a non-default port. window.__ORCH_PORT__ is null when THIS dashboard's
// orchestrator never bound — a hardcoded fallback (e.g. 7718) here would
// silently drive some OTHER project's orchestrator, which is the exact bug
// #1037 fixes server-side. So there is no fallback: null stays null, and
// callers must check isOrchAvailable() before using orchHttp()/orchWs().
// Resolved per-call (not cached at module load) so it works even if a caller
// loads this module before the inline bootstrap script has run.
function orchPort() {
  return (typeof window !== 'undefined' && window.__ORCH_PORT__) || null;
}

/** True when this dashboard has a live orchestrator to talk to. */
export function isOrchAvailable() { return orchPort() != null; }

/** The project root this dashboard is scanning — sent on every orchestrator
 * request so the orchestrator can reject a mismatched-project caller (#1037). */
export function projectRoot() {
  return (typeof window !== 'undefined' && window.__PROJECT_ROOT__) || '';
}

export function orchHttp() { return isOrchAvailable() ? 'http://localhost:' + orchPort() : null; }
export function orchWs()   { return isOrchAvailable() ? 'ws://localhost:' + orchPort()   : null; }

// #967 — view-only mode, injected by shell.js from the server-side
// dashboard.view_only config check (see server/lib/view-only.js). This gate
// is UI convenience only: the orchestrator refuses POST /api/run itself
// regardless of what the client sends, so a stale/bypassed client can't
// actually spawn an agent — it just gets a clearer message here first.
export function isViewOnly() {
  return typeof window !== 'undefined' && !!window.__VIEW_ONLY__;
}

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
    .then(d => {
      if (!d) return;
      if (d.token) window.__ORCH_TOKEN__ = d.token;
      // #1037 — orchPort may legitimately have GONE null (orchestrator died
      // or never started) since the page loaded, so this must not only ever
      // set a truthy value — a stale truthy value must be cleared too.
      window.__ORCH_PORT__ = d.orchPort || null;
      if (d.projectRoot) window.__PROJECT_ROOT__ = d.projectRoot;
    })
    .catch(() => {});
}

// ── REST actions ──────────────────────────────────────────────────────────────

/**
 * POST /api/run — start a PTY session for storyId.
 * opts = { runner?, model? } — which agent CLI / model to launch. Omitted →
 * the server default (claude, no model flag). The server re-validates both.
 * Returns the parsed JSON response (or throws on network error).
 */
export function runSession(storyId, cmd, opts) {
  if (!isOrchAvailable()) return Promise.resolve({ error: 'orchestrator unavailable' });
  const tok  = orchToken();
  const body = { storyId, cmd };
  if (opts && opts.runner) {
    body.runner = opts.runner;
    if (opts.model) body.model = opts.model;
  }
  return fetch(orchHttp() + '/api/run', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json', 'X-Project-Root': projectRoot() },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

/**
 * GET /api/runners — detected agent CLIs: [{ id, label, available, models }].
 * The list is fixed for the orchestrator's lifetime (detected once at boot),
 * so the first successful response is cached; failures are not cached so a
 * later open retries.
 */
let _runnersPromise = null;
export function fetchRunners() {
  if (_runnersPromise) return _runnersPromise;
  if (!isOrchAvailable()) return Promise.resolve([]);
  const tok = orchToken();
  _runnersPromise = fetch(orchHttp() + '/api/runners', {
    headers: { 'Authorization': 'Bearer ' + tok, 'X-Project-Root': projectRoot() },
  })
    .then(r => r.json())
    .then(d => (d && d.runners) || [])
    .catch(() => { _runnersPromise = null; return []; });
  return _runnersPromise;
}

/**
 * POST /api/stop — stop a running session.
 */
export function stopSession(storyId) {
  if (!isOrchAvailable()) return Promise.resolve();
  if (isViewOnly()) { showToast('View-only mode — stop is disabled'); return Promise.resolve(); }
  const tok = orchToken();
  return fetch(orchHttp() + '/api/stop', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json', 'X-Project-Root': projectRoot() },
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
  if (!tok || !isOrchAvailable()) return Promise.resolve({ ok: false, sessions: [] });
  return fetch(orchHttp() + '/api/sessions', {
    headers: { 'Authorization': 'Bearer ' + tok, 'X-Project-Root': projectRoot() },
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

/**
 * GET /api/history — return the persisted run history array (or [] on error).
 */
export function fetchHistory() {
  const tok = orchToken();
  if (!tok || !isOrchAvailable()) return Promise.resolve([]);
  return fetch(orchHttp() + '/api/history', { headers: { 'Authorization': 'Bearer ' + tok, 'X-Project-Root': projectRoot() } })
    .then(r => {
      if (r.status === 401) { refreshOrchToken(); return []; }
      return r.json().then(d => (d && d.history) || []);
    })
    .catch(() => []);
}

/**
 * Merge live sessions with persisted history, keyed on storyId.
 * Live session fields win for most properties; durationMs and endTime are
 * field-aware: the live record may not have them yet (session still running),
 * so fall back to the history value if the live field is null/undefined.
 */
export function mergeSessionsAndHistory(live, hist) {
  const byId = new Map();
  for (const h of hist || []) byId.set(h.storyId, { ...h, source: 'history' });
  for (const s of live || []) {
    const h = byId.get(s.storyId) || {};
    byId.set(s.storyId, {
      ...h,
      ...s,
      source: 'live',
      durationMs: s.durationMs ?? h.durationMs,
      endTime:    s.endTime    ?? h.endTime,
    });
  }
  return [...byId.values()];
}

/** True unless the last session poll found the orchestrator unreachable. */
export function isOrchOnline() {
  return getState().orchOnline !== false;
}

/**
 * POST /api/reject — record a structured rejection reason for storyId.
 * phase is optional. Returns the parsed JSON response.
 */
export function submitRejection(storyId, reason, phase) {
  if (!isOrchAvailable()) return Promise.resolve({ error: 'orchestrator unavailable' });
  if (isViewOnly()) { showToast('View-only mode — rejections are disabled'); return Promise.resolve({ error: 'view-only mode' }); }
  const tok = orchToken();
  return fetch(orchHttp() + '/api/reject', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json', 'X-Project-Root': projectRoot() },
    body: JSON.stringify({ storyId, reason, phase: phase || null }),
  }).then(r => r.json());
}

/**
 * GET /api/rejections — return the persisted rejections array (or [] on error).
 */
export function fetchRejections() {
  const tok = orchToken();
  if (!tok || !isOrchAvailable()) return Promise.resolve([]);
  return fetch(orchHttp() + '/api/rejections', { headers: { 'Authorization': 'Bearer ' + tok, 'X-Project-Root': projectRoot() } })
    .then(r => r.ok ? r.json().then(d => (d && d.rejections) || []) : [])
    .catch(() => []);
}

/**
 * POST /api/task-status — persist a kanban column move for storyId.
 * status is the target column id (todo | in_progress | blocked | done).
 */
export function setTaskStatus(storyId, status) {
  if (!isOrchAvailable()) return Promise.resolve({});
  if (isViewOnly()) { showToast('View-only mode — status changes are disabled'); return Promise.resolve({}); }
  const tok = orchToken();
  return fetch(orchHttp() + '/api/task-status', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json', 'X-Project-Root': projectRoot() },
    body: JSON.stringify({ storyId, status }),
  }).then(r => r.json()).catch(() => ({}));
}

/**
 * POST /api/clean-sessions — remove ended sessions.
 * olderThanDays = 0 removes all ended sessions; > 0 keeps recent ones.
 */
export function cleanSessions(olderThanDays = 0) {
  if (!isOrchAvailable()) return Promise.resolve({ removed: 0 });
  if (isViewOnly()) { showToast('View-only mode — clean is disabled'); return Promise.resolve({ removed: 0 }); }
  const tok = orchToken();
  return fetch(orchHttp() + '/api/clean-sessions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json', 'X-Project-Root': projectRoot() },
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

/**
 * True when storyId has a live session. 'blocked' is a live PTY waiting for
 * input (server-side classification of running), so it counts as running here.
 */
export function isSessionRunning(storyId) {
  const { runningByStory } = getState();
  return !!(storyId && runningByStory && runningByStory[storyId]);
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

/** Total count of live sessions (running or blocked-on-input). */
export function runningTotal() {
  const { activeSessions } = getState();
  return (activeSessions || []).filter(s => s.status === 'running' || s.status === 'blocked').length;
}

// ── Session poll ──────────────────────────────────────────────────────────────

let _pollTimer = null;

// Serialized snapshot of the last committed activeSessions. The 4s poll
// always produces a NEW array identity, which defeats the store's
// reference-equality change check — so compare content here and only
// setState when the sessions actually changed.
let _lastSessionsJson = null;

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
  Promise.all([fetchSessionsWithStatus(), fetchHistory(), fetchRejections()])
    .then(([{ ok, sessions }, history, rejections]) => {
      // Merge any recorded rejection onto its matching session by storyId.
      const byId = {};
      for (const r of rejections) byId[r.storyId] = r;
      const merged = sessions.map(s => byId[s.storyId] ? { ...s, rejection: byId[s.storyId] } : s);

      // Dedupe: skip the setState when neither the session list, the
      // orchestrator-online flag, nor the history changed — avoids a
      // full-app re-render per poll tick.
      const json = JSON.stringify(merged) + '|' + ok + '|' + JSON.stringify(history);
      if (json === _lastSessionsJson) return;
      _lastSessionsJson = json;
      setState({ activeSessions: merged, history, orchOnline: ok });
      // Detect running→blocked transitions and raise persistent alerts.
      trackBlocked(merged);
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
 * @param {{ runner?: string, model?: string }} [opts] — agent CLI selection
 */
export function runAndOpenTerm(storyId, cmd, title, opts) {
  if (isViewOnly()) { showToast('View-only mode — runs are disabled'); return; }
  // #916 — spawning an orchestrator session launches a real agent with
  // permissions skipped. Gate it behind an explicit confirmation dialog
  // instead of running on the first click. The dialog calls execRunAndOpenTerm
  // on confirm.
  setState({
    runConfirm: { kind: 'story', storyId, cmd, title: title || storyId, opts: opts || null },
  });
}

/** The actual spawn — invoked only after the user confirms (see #916). */
export function execRunAndOpenTerm(storyId, cmd, title, opts) {
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

  runSession(storyId, cmd, opts)
    .then(data => {
      // 409 = already running (terminal reattaches); anything else is surfaced.
      if (data && data.error && !data.error.includes('already running')) {
        showToast('Run error: ' + data.error);
      }
    })
    .catch(err => {
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
 * stopStory — Kanban "Stop" action.
 */
export function stopStory(storyId) {
  if (isViewOnly()) { showToast('View-only mode — stop is disabled'); return; }
  stopSession(storyId).catch(err => console.error('[orchestrator] session op failed:', err.message));
}

// ── Command runner ────────────────────────────────────────────────────────────
/**
 * Client-side command-runner allowlist — mirrors the server COMMAND_ALLOWLIST.
 *
 * #932 — this is INTENTIONALLY a small, curated subset of the ~117 rcode
 * commands, NOT the full set. The command runner spawns a real agent with
 * permissions skipped straight from the browser, so only commands that are
 * SAFE to run unattended are exposed here: read-only status/inspection
 * (status, progress, stats, health, diff, show, list-plans, help) plus the two
 * idempotent setup commands (init, config). Destructive or long-running
 * commands (execute, autonomous, ship, dev-story, …) are deliberately omitted
 * — run those from your IDE where you can supervise them. The server
 * re-validates against COMMAND_ALLOWLIST regardless; this list only drives the
 * picker dropdown. Keep both in sync when adding a command, and only add one
 * here if it is safe to run unattended.
 */
export const ALLOWED_COMMANDS = [
  { cmd: '/rcode-init',          label: 'init — initialise project workspace',    category: 'Project'  },
  { cmd: '/rcode-config',        label: 'config — show rcode config',             category: 'Project'  },
  { cmd: '/rcode-status',        label: 'status — phase / sprint status',         category: 'Status'   },
  { cmd: '/rcode-progress',      label: 'progress — milestone progress',          category: 'Status'   },
  { cmd: '/rcode-sprint-status', label: 'sprint-status — sprint execution status',category: 'Status'   },
  { cmd: '/rcode-stats',         label: 'stats — project statistics',             category: 'Status'   },
  { cmd: '/rcode-show',          label: 'show — show current plan',               category: 'Planning' },
  { cmd: '/rcode-list-plans',    label: 'list-plans — list all sprint plans',     category: 'Planning' },
  { cmd: '/rcode-next',          label: 'next — suggest next action',             category: 'Planning' },
  { cmd: '/rcode-help',          label: 'help — command reference',               category: 'Inspect'  },
  { cmd: '/rcode-health',        label: 'health — repo health check',             category: 'Inspect'  },
  { cmd: '/rcode-diff',          label: 'diff — diff since last checkpoint',      category: 'Inspect'  },
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
 * @param {{ runner?: string, model?: string }} [opts] — agent CLI selection
 */
export function runCommandFromUI(cmd, opts) {
  if (!cmd) return;
  if (isViewOnly()) { showToast('View-only mode — runs are disabled'); return; }
  // #916 — gate command-runner spawns behind the same confirmation dialog.
  const title = cmd + ' (command runner)';
  setState({
    runConfirm: { kind: 'command', cmd, title, opts: opts || null },
  });
}

/** The actual command-runner spawn — invoked only after the user confirms. */
export function execRunCommandFromUI(cmd, opts) {
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

  runSession(storyId, cmd, opts)
    .then(data => {
      // 409 = already running (not an error — terminal is already attached).
      if (data && data.error && !data.error.includes('already running')) {
        showToast('Command error: ' + data.error);
      }
    })
    .catch(() => showToast('Could not reach orchestrator'));
}

/** Confirm the pending run (from the #916 dialog) and dispatch the real spawn. */
export function confirmPendingRun() {
  const rc = getState().runConfirm;
  setState({ runConfirm: null });
  if (!rc) return;
  if (rc.kind === 'command') {
    execRunCommandFromUI(rc.cmd, rc.opts);
  } else {
    execRunAndOpenTerm(rc.storyId, rc.cmd, rc.title, rc.opts);
  }
}

/** Dismiss the pending-run confirmation without spawning. */
export function cancelPendingRun() {
  setState({ runConfirm: null });
}
