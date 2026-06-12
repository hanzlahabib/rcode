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
 *     [Ask rcode] (primary), [Share] (copy URL), [...] (more / theme toggle)
 *
 * Reads `project { name, user { name } }` from the store; falls back to the
 * projectName prop and a sample so it renders standalone.
 * No inline style= attributes — all styling via .tb-* classes in css.js.
 */

import { html } from '../preact.js';
import { Icon } from '../icons-client.js';
import { useStore } from '../store.js';

const SAMPLE_PROJECT = { name: 'Acme AI Platform', user: { name: 'Hanzla' } };

/** Copy the current URL and flash the shared toast, if present. */
function shareUrl() {
  navigator.clipboard.writeText(location.href).catch(() => {});
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = 'Link copied!';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
}

export function Topbar({ projectName, updatedAgo, refreshing, onRefresh, onToggleTheme, onToggleSidebar, themeLabel }) {
  const S = useStore();
  const project = (S && S.project) || {};
  const name = project.name || projectName || SAMPLE_PROJECT.name;
  const user = project.user || SAMPLE_PROJECT.user;
  const firstName = user.name || SAMPLE_PROJECT.user.name;

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
        <h1 class="tb-welcome">Welcome back, ${firstName}! <span class="tb-wave" aria-hidden="true">👋</span></h1>
        <p class="tb-sub">Here's what's happening with ${name}</p>
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

        <button class="tb-btn tb-btn--primary" type="button" title="Ask rcode">
          <${Icon} name="brain" size=${15} /> Ask rcode
        </button>

        <button class="tb-btn" type="button" onClick=${shareUrl} title="Copy link">
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
