/**
 * Topbar component — brand, live dot, updated-ago, action buttons.
 *
 * Reuses existing CSS classes: header-actions, header-btn, live, hamburger-btn.
 *
 * Props:
 *   projectName   {string}   — shown in the brand subtitle
 *   updatedAgo    {string}   — text for the "updated N ago" span
 *   onRefresh     {function} — called when Refresh button is clicked
 *   onToggleTheme {function} — called when theme button is clicked
 *   onToggleSidebar {function} — called when hamburger is clicked
 *   themeLabel    {string}   — 'light' or 'dark' — controls which icon the theme button shows
 */

import { html } from '../preact.js';
import { Icon } from '../icons-client.js';
import { runCommandFromUI } from '../orchestrator.js';
import { showToast } from './shared.js';

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
  return html`
    <header>
      <div class="topbar-start-group">
        <button
          class="hamburger-btn"
          id="hamburger-btn"
          onClick=${onToggleSidebar}
          aria-label="Toggle menu"
        >
          <span></span><span></span><span></span>
        </button>
        <div class="brand">
          <div class="icon"><${Icon} name="building" size=${16} cls="brand-icon"/></div>
          <div>
            <h1>Majlis — The Council</h1>
            <div class="arabic">مجلس · ${projectName || ''}</div>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <span class="live" id="live-dot" title="Live"
          style=${refreshing ? 'animation-duration:0.7s;background:var(--accent-blue);' : ''}></span>
        <span id="updated-ago" class="updated-ago">
          ${refreshing ? '⟳ syncing…' : (updatedAgo || 'just now')}
        </span>
        <button class="header-btn" id="ask-rcode-btn" onClick=${askRcode} title="Ask rcode for the next action">✦ Ask rcode</button>
        <button class="header-btn" id="share-btn" onClick=${shareDashboard} title="Copy dashboard link">⎘ Share</button>
        <button class="header-btn" id="refresh-btn" onClick=${onRefresh}>↺ Refresh</button>
        <!-- icon shows TARGET state (not current): dark→sun means "click to go light"; light→moon means "click to go dark" -->
        <button class="header-btn" id="theme-btn" onClick=${onToggleTheme} title="Toggle theme"><${Icon} name=${themeLabel === 'light' ? 'moon' : 'sun'} size=${14}/></button>
      </div>
    </header>
  `;
}
