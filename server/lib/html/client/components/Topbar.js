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
 *   themeLabel    {string}   — label for the theme button (◑ / 🌙 / ☀️)
 */

import { html } from '../preact.js';

export function Topbar({ projectName, updatedAgo, onRefresh, onToggleTheme, onToggleSidebar, themeLabel }) {
  return html`
    <header>
      <div style="display:flex;align-items:center;gap:12px;">
        <button
          class="hamburger-btn"
          id="hamburger-btn"
          onClick=${onToggleSidebar}
          aria-label="Toggle menu"
        >
          <span></span><span></span><span></span>
        </button>
        <div class="brand">
          <div class="icon">🕌</div>
          <div>
            <h1>Majlis — The Council</h1>
            <div class="arabic">مجلس · ${projectName || ''}</div>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <span class="live" id="live-dot" title="Live"></span>
        <span id="updated-ago" style="font-size:11px;color:var(--text-muted);">${updatedAgo || 'just now'}</span>
        <button class="header-btn" id="refresh-btn" onClick=${onRefresh}>↺ Refresh</button>
        <button class="header-btn" id="theme-btn" onClick=${onToggleTheme} title="Toggle theme">${themeLabel || '◑'}</button>
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
