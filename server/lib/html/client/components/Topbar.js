/**
 * Topbar component — redesigned header chrome to match the mockup.
 *
 * Public API is UNCHANGED — App.js still calls:
 *   <${Topbar} projectName updatedAgo refreshing onRefresh
 *              onToggleTheme onToggleSidebar themeLabel />
 *
 * Layout:
 *   - hamburger (mobile sidebar toggle)
 *   - greeting: "Welcome back, {user.name}! 👋" + subtitle with project name
 *   - right group: "Auto-synced {ago}" status dot (click = refresh),
 *     [Ask rcode] (primary, runs /rcode-next via orchestrator), [Share]
 *     (copy URL + toast), [...] (more / theme toggle)
 *
 * Reads `project { name, user { name } }` from the store; falls back to the
 * projectName prop. No sample data — without a configured user the greeting
 * is generic, and without a project name the subtitle stays generic too.
 * No inline style= attributes — all styling via .tb-* classes in css.js.
 */

import { html } from '../preact.js';
import { Icon } from '../icons-client.js';
import { useStore } from '../store.js';
import { runCommandFromUI } from '../orchestrator.js';
import { showToast } from './shared.js';
import { BlockedBell } from './NotifyCenter.js';

/**
 * Ask rcode — reuse the existing orchestrator command runner (token-guarded
 * POST /api/run via window.__ORCH_TOKEN__). "/rcode-next" asks rcode for the
 * suggested next action and streams it into the terminal panel. No new endpoint.
 */
function askRcode() {
  runCommandFromUI('/rcode-next');
}

/** Share — copy the dashboard URL to the clipboard and confirm via toast. */
function shareDashboard() {
  const url = location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => showToast('Dashboard link copied'))
      .catch(() => showToast(url));
  } else {
    showToast(url);
  }
}

export function Topbar({ projectName, updatedAgo, refreshing, onRefresh, onToggleTheme, onToggleSidebar, themeLabel }) {
  const S = useStore();
  const project = (S && S.project) || {};
  const name = project.name || projectName || '';
  const firstName = (project.user && project.user.name) || '';

  return html`
    <header class="topbar">
      <button
        class="hamburger-btn"
        id="hamburger-btn"
        onClick=${onToggleSidebar}
        aria-label="Toggle menu"
      >
        <span></span><span></span><span></span>
      </button>

      <div class="tb-greeting">
        <h1 class="tb-welcome">${firstName ? 'Welcome back, ' + firstName + '!' : 'Welcome back!'} <span class="tb-wave" aria-hidden="true">👋</span></h1>
        <p class="tb-sub">${name ? "Here's what's happening with " + name : "Here's what's happening with your project"}</p>
      </div>

      <div class="tb-actions">
        <button
          class=${'tb-synced' + (refreshing ? ' tb-synced--busy' : '')}
          onClick=${onRefresh}
          title="Click to refresh"
        >
          <span class="tb-dot"></span>
          ${refreshing ? 'Syncing…' : 'Auto-synced ' + (updatedAgo || 'just now')}
        </button>

        <${BlockedBell} />

        <button class="tb-btn tb-btn--primary" type="button" onClick=${askRcode} title="Ask rcode for the next action">
          <${Icon} name="brain" size=${15} /> Ask rcode
        </button>

        <button class="tb-btn tb-btn--share" type="button" onClick=${shareDashboard} title="Copy dashboard link">
          <${Icon} name="link" size=${15} /> Share
        </button>

        <button
          class="tb-btn tb-btn--icon"
          type="button"
          onClick=${onToggleTheme}
          title=${'More — switch to ' + (themeLabel === 'light' ? 'dark' : 'light') + ' theme'}
          aria-label="More options"
        >
          <span class="tb-kebab">⋯</span>
        </button>
      </div>
    </header>
  `;
}
