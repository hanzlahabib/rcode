/**
 * NotifyCenter — blocked-session notification UI.
 *
 * Two components, both driven by store state written by notify.js:
 *
 *   BlockedToasts — persistent corner toasts, one per blocked-session alert
 *     (store.blockedAlerts). Clicking a toast opens that session's terminal
 *     panel; the ✕ dismisses without opening. Mounted once in App.js.
 *
 *   BlockedBell — topbar bell with a count of currently-blocked sessions and
 *     a dropdown listing them (click an entry → open its terminal). Mounted
 *     in Topbar.js. Renders nothing special when no session is blocked.
 *
 * No inline style= — all styling via .nb-* classes in css.js.
 */

import { html, useState, useEffect, useRef } from '../preact.js';
import { useStore } from '../store.js';
import { openTermPanel } from '../orchestrator.js';
import { dismissBlockedAlert } from '../notify.js';
import { Icon } from '../icons-client.js';

// ── Persistent blocked toasts ─────────────────────────────────────────────────

export function BlockedToasts() {
  const blockedAlerts = useStore(s => s.blockedAlerts);
  const alerts = blockedAlerts || [];
  if (alerts.length === 0) return null;

  function open(storyId) {
    dismissBlockedAlert(storyId);
    openTermPanel(storyId, storyId);
  }

  return html`
    <div class="nb-toasts" role="status" aria-live="polite">
      ${alerts.map(a => html`
        <div key=${a.storyId} class="nb-toast"
          role="button" tabindex="0"
          title=${'Open terminal for ' + a.storyId}
          onClick=${() => open(a.storyId)}
          onKeyDown=${e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(a.storyId); } }}>
          <span class="nb-toast-dot" aria-hidden="true"></span>
          <span class="nb-toast-text">
            Agent waiting for input — ${a.storyId}
            ${a.cmd ? html`<span class="nb-toast-cmd">${a.cmd}</span>` : null}
          </span>
          <button class="nb-toast-dismiss" aria-label="Dismiss"
            onClick=${e => { e.stopPropagation(); dismissBlockedAlert(a.storyId); }}>
            <${Icon} name="x" size=${12}/>
          </button>
        </div>
      `)}
    </div>
  `;
}

// ── Topbar bell ───────────────────────────────────────────────────────────────

export function BlockedBell() {
  const activeSessions = useStore(s => s.activeSessions);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const blocked = (activeSessions || []).filter(s => s.status === 'blocked');

  // Close the dropdown on any outside click.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Nothing blocked → drop a stale open dropdown.
  useEffect(() => {
    if (blocked.length === 0 && open) setOpen(false);
  }, [blocked.length]);

  function openSession(storyId) {
    setOpen(false);
    dismissBlockedAlert(storyId);
    openTermPanel(storyId, storyId);
  }

  return html`
    <div class="nb-bell-wrap" ref=${rootRef}>
      <button
        class=${'tb-btn tb-btn--icon nb-bell' + (blocked.length ? ' nb-bell--alert' : '')}
        type="button"
        title=${blocked.length
          ? blocked.length + ' session' + (blocked.length === 1 ? '' : 's') + ' waiting for input'
          : 'No sessions waiting for input'}
        aria-label="Blocked session notifications"
        aria-expanded=${open}
        onClick=${() => { if (blocked.length) setOpen(o => !o); }}>
        <${Icon} name="bell" size=${15}/>
        ${blocked.length ? html`<span class="nb-bell-count">${blocked.length}</span>` : null}
      </button>
      ${open && blocked.length ? html`
        <div class="nb-bell-dropdown" role="menu">
          <div class="nb-bell-title">Waiting for input</div>
          ${blocked.map(s => html`
            <button key=${s.storyId} class="nb-bell-item" role="menuitem"
              title=${'Open terminal for ' + s.storyId}
              onClick=${() => openSession(s.storyId)}>
              <span class="term-status-dot blocked" aria-hidden="true"></span>
              <span class="nb-bell-item-id">${s.storyId}</span>
              <span class="nb-bell-item-cmd">${s.cmd || ''}</span>
            </button>
          `)}
        </div>
      ` : null}
    </div>
  `;
}
