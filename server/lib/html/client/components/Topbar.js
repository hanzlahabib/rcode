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

export function Topbar({ projectName, updatedAgo, onRefresh, onToggleTheme, onToggleSidebar, themeLabel }) {
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
        <span class="live" id="live-dot" title="Live"></span>
        <span id="updated-ago" class="updated-ago">${updatedAgo || 'just now'}</span>
        <button class="header-btn" id="refresh-btn" onClick=${onRefresh}>↺ Refresh</button>
        <!-- icon shows TARGET state (not current): dark→sun means "click to go light"; light→moon means "click to go dark" -->
        <button class="header-btn" id="theme-btn" onClick=${onToggleTheme} title="Toggle theme"><${Icon} name=${themeLabel === 'light' ? 'moon' : 'sun'} size=${14}/></button>
        <button class="header-btn" onClick=${() => {
          navigator.clipboard.writeText(location.href);
          // Show a toast if available
          const toast = document.getElementById('toast');
          if (toast) { toast.textContent = 'URL copied!'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2500); }
        }} title="Copy URL">⎘ Link</button>
      </div>
    </header>
  `;
}
