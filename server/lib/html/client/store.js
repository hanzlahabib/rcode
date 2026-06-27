/**
 * Reactive store — shared state for the Preact dashboard client.
 *
 * Seeds from window.__S__ (injected by client.js before app.js loads).
 * Expose: getState(), setState(patch), subscribe(fn), useStore() hook.
 *
 * This is intentionally NOT a framework — no Redux, no Zustand.
 * Just a plain mutable object, a subscriber set, and a Preact hook.
 */

import { useState, useEffect } from './preact.js';

// ---- Initial state seed from server-injected data ----
const _seed = (typeof window !== 'undefined' && window.__S__) || {};

let _state = {
  // First-run signal — false only when the server scanned and found no .rcode.
  initialized:      _seed.initialized      !== false,
  // Redesign dashboard contract slices (DATA-CONTRACT.md) — read by the Overview
  // slot components. Derived server-side by scanner.buildDashboard.
  project:          _seed.project          || null,
  progress:         _seed.progress         || null,
  timeline:         _seed.timeline         || null,
  tasks:            _seed.tasks            || null,
  health:           _seed.health           || null,
  // Fields injected by client.js / window.__S__
  phases:           _seed.phases           || [],
  milestone:        _seed.milestone        || '',
  // currentPhase is now the contract object { name, status, milestones[] }.
  currentPhase:     _seed.currentPhase     || null,
  currentSprint:    _seed.currentSprint    || null,
  decisions:        _seed.decisions        || [],
  blockers:         _seed.blockers         || [],
  council_sessions: _seed.council_sessions || [],
  last_session:     _seed.last_session     || null,
  chains:           _seed.chains           || [],
  workstreams:      _seed.workstreams      || [],
  pendingHandoff:   _seed.pendingHandoff   || null,
  memoryBank:       _seed.memoryBank       || null,
  // Environment info — surfaced in the bottom status bar.
  projectName:      _seed.projectName      || '',
  projectRoot:      _seed.projectRoot      || '',
  version:          _seed.version          || '',
  // Refresh lifecycle: refreshing flips true during a poll/fetch; offline is
  // true when /api/state fails; lastRefresh is the ms timestamp of the last
  // successful fetch (null until the first one completes).
  refreshing:       false,
  offline:          false,
  lastRefresh:      null,
  // state.json parse failure message (or null). Surfaced as a dismissible
  // banner in App.js; parseErrorDismissed is session-local UI state.
  rawParseError:        _seed.rawParseError || null,
  parseErrorDismissed:  false,
  // Live orchestrator sessions (populated by startSessionsPoll in orchestrator.js)
  activeSessions:   [],
  // Derived join map: storyId → running session. Recomputed automatically by
  // setState whenever activeSessions is written, so views can join tasks to
  // live runs without scanning the array (TasksView, Kanban, Overview).
  runningByStory:   {},
  // Persisted past runs (populated by startSessionsPoll → fetchHistory)
  history:          [],
  // Orchestrator reachability: null = unknown (before first poll),
  // true = reachable, false = unreachable. Written by the 4s session poll.
  orchOnline:       null,
  // Persistent blocked-session alerts (written by notify.js trackBlocked).
  // [{ storyId, cmd }] — rendered as clickable toasts by NotifyCenter.js.
  blockedAlerts:    [],
  // File jump bridge: the agent drawer's "View file in Files" sets this to a
  // project-relative .md path; FilesView opens it on arrival and clears it.
  requestedFile:    null,
  // xterm terminal panel state (driven by orchestrator.js / XtermPanel.js)
  // { open, storyId, title, minimized, fullscreen }
  terminal:         null,
  // Orchestrator side-panel state (driven by orchestrator.js / OrchPanel.js)
  // { open, storyId }
  orchPanel:        null,
  // Runner-picker popover state (driven by components/RunnerPicker.js)
  // { open, x, y, run: { kind: 'session'|'command', storyId?, cmd, title? } }
  runnerPicker:     null,
  // #916 — pending orchestrator-run confirmation. When set, RunConfirmDialog
  // renders and the spawn waits for explicit user approval.
  // { kind: 'story'|'command', storyId?, cmd, title, opts }
  runConfirm:       null,
};

/** Registered subscriber functions. */
const _subscribers = new Set();

/** Return a shallow copy of the current state. */
export function getState() {
  return { ..._state };
}

/** Build the storyId → session map for LIVE sessions. A 'blocked' session is
 * a live PTY waiting for input, so it counts as live alongside 'running'. */
function deriveRunningByStory(sessions) {
  const map = {};
  for (const s of sessions || []) {
    if (s && s.storyId && (s.status === 'running' || s.status === 'blocked')) map[s.storyId] = s;
  }
  return map;
}

/**
 * Shallow-merge `patch` into state, then notify all subscribers.
 * Only notifies if at least one key actually changed value.
 * Writing activeSessions also refreshes the derived runningByStory map.
 */
export function setState(patch) {
  if ('activeSessions' in patch) {
    patch = { ...patch, runningByStory: deriveRunningByStory(patch.activeSessions) };
  }
  let changed = false;
  for (const key of Object.keys(patch)) {
    if (_state[key] !== patch[key]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  _state = { ..._state, ...patch };
  for (const fn of _subscribers) {
    try { fn(_state); } catch (e) { console.error('[store] subscriber error', e); }
  }
}

/**
 * Subscribe to state changes. Returns an unsubscribe function.
 * @param {function} fn — called with the new state on every setState().
 */
export function subscribe(fn) {
  _subscribers.add(fn);
  return () => _subscribers.delete(fn);
}

/**
 * Refresh handler bridge.
 *
 * App owns the actual /api/state fetch (fetchAndRerender). It registers that
 * function here on mount so any component can trigger a refresh via refresh()
 * without reaching for a window global. `window._preactRefresh` is kept in
 * sync for any legacy inline-onclick callers.
 */
let _refreshHandler = null;

export function registerRefresh(fn) {
  _refreshHandler = typeof fn === 'function' ? fn : null;
  if (typeof window !== 'undefined') window._preactRefresh = _refreshHandler;
}

/** Trigger a data refresh, if a handler has been registered. */
export function refresh() {
  if (typeof _refreshHandler === 'function') return _refreshHandler();
}

/**
 * Preact hook. Subscribes the calling component to the store and
 * returns the current state (or the selected slice).
 *
 * Without a selector the component re-renders on every setState().
 * With a selector it re-renders only when the selected value changes
 * (Object.is), so slice subscribers skip unrelated store traffic:
 *
 *   const project = useStore(s => s.project);
 *
 * The selector must be pure and is captured on mount — pass a stable
 * function (module-level or inline reading fixed keys), not one that
 * closes over changing props.
 */
export function useStore(selector) {
  const [state, setLocalState] = useState(
    () => (selector ? selector(_state) : getState())
  );
  useEffect(() => {
    const update = (newState) => {
      if (selector) {
        const next = selector(newState);
        setLocalState(prev => (Object.is(prev, next) ? prev : next));
      } else {
        setLocalState({ ...newState });
      }
    };
    // Resync on mount in case setState was called before mount.
    update(_state);
    const unsub = subscribe(update);
    return unsub;
  }, []);
  return state;
}
