/**
 * notify.js — blocked-session notification tracker.
 *
 * Pure logic, no DOM. The 4s session poll (orchestrator.js _poll) calls
 * trackBlocked(sessions) after each tick. This module diffs the blocked set
 * against the previous tick and writes store.blockedAlerts — the persistent
 * clickable toasts rendered by components/NotifyCenter.js.
 *
 * Browser Notification API is used ONLY when permission is already granted;
 * we never call Notification.requestPermission().
 */

import { getState, setState } from './store.js';

// storyIds that were blocked on the previous poll tick — transition detector.
let _prevBlocked = new Set();

/** True when the browser Notification API is usable without prompting. */
function notificationsGranted() {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && window.Notification.permission === 'granted';
}

/** Fire a system notification for a newly-blocked session (granted-only). */
function systemNotify(storyId) {
  if (!notificationsGranted()) return;
  try {
    new window.Notification('Agent waiting for input', {
      body: 'Session ' + storyId + ' is blocked on a question.',
      tag: 'rcode-blocked-' + storyId, // dedupe: re-fires replace, not stack
    });
  } catch { /* notification constructor can throw in some embeds — ignore */ }
}

/**
 * Diff the latest session list against the previous tick:
 *   - session newly blocked  → append a persistent alert + system notification
 *   - session left blocked   → drop its alert (answered / exited / stopped)
 * Alerts: [{ storyId, cmd }] in store.blockedAlerts.
 */
export function trackBlocked(sessions) {
  const nowBlocked = new Map();
  for (const s of sessions || []) {
    if (s.status === 'blocked') nowBlocked.set(s.storyId, s);
  }

  const alerts = (getState().blockedAlerts || [])
    // Drop alerts for sessions that are no longer blocked.
    .filter(a => nowBlocked.has(a.storyId));

  let changed = alerts.length !== (getState().blockedAlerts || []).length;

  for (const [storyId, s] of nowBlocked) {
    if (_prevBlocked.has(storyId)) continue;            // already known
    if (alerts.some(a => a.storyId === storyId)) continue; // already alerted
    alerts.push({ storyId, cmd: s.cmd || '' });
    systemNotify(storyId);
    changed = true;
  }

  _prevBlocked = new Set(nowBlocked.keys());
  if (changed) setState({ blockedAlerts: alerts });
}

/** Dismiss one alert toast without touching the session. */
export function dismissBlockedAlert(storyId) {
  const alerts = (getState().blockedAlerts || []).filter(a => a.storyId !== storyId);
  setState({ blockedAlerts: alerts });
}

/** Sessions currently blocked (drives the topbar bell). */
export function blockedSessions() {
  return (getState().activeSessions || []).filter(s => s.status === 'blocked');
}
