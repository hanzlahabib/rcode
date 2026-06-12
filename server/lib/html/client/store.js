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
  // Live orchestrator sessions (populated by startSessionsPoll in orchestrator.js)
  activeSessions:   [],
  // File jump bridge: AgentsView sets this to a slug so FilesView opens it.
  requestedFile:    null,
  // xterm terminal panel state (driven by orchestrator.js / XtermPanel.js)
  // { open, storyId, title, minimized, fullscreen }
  terminal:         null,
  // Orchestrator side-panel state (driven by orchestrator.js / OrchPanel.js)
  // { open, storyId }
  orchPanel:        null,
};

/** Registered subscriber functions. */
const _subscribers = new Set();

/** Return a shallow copy of the current state. */
export function getState() {
  return { ..._state };
}

/**
 * Shallow-merge `patch` into state, then notify all subscribers.
 * Only notifies if at least one key actually changed value.
 */
export function setState(patch) {
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
 * returns the current state. The component re-renders on every setState().
 */
export function useStore() {
  const [state, setLocalState] = useState(getState);
  useEffect(() => {
    // Resync on mount in case setState was called before mount.
    setLocalState(getState());
    const unsub = subscribe(newState => setLocalState({ ...newState }));
    return unsub;
  }, []);
  return state;
}
