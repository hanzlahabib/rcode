/**
 * Sidebar — left navigation rail (240px).
 *
 * Placeholder foundation: logo, project switcher, nav, an embedded Project
 * Health mini-card slot, and the user profile footer. Reads props only —
 * never fetches. Props:
 *   project  { name, user: { name, email } }   from state.project
 *   health   { pct, label, points[] }          from state.health
 */

import { html } from '../vendor/preact.js';

const NAV = [
  'Overview', 'Tasks', 'Decisions', 'Architecture',
  'Documents', 'Timeline', 'Integrations', 'Settings',
];

export function Sidebar({ project, health }) {
  const p = project || {};
  const user = p.user || {};
  const h = health || {};

  return html`
    <aside class="rd-sidebar">
      <div>
        <div class="rd-card-title rd-accent-teal">rcode</div>
        <div class="rd-card-sub">${p.name || 'No project'}</div>
      </div>

      <nav class="rd-nav">
        ${NAV.map((item, i) => html`
          <button
            key=${item}
            type="button"
            class=${'rd-nav-item' + (i === 0 ? ' is-active' : '')}
          >${item}</button>
        `)}
      </nav>

      <div class="rd-card">
        <p class="rd-card-title">Project Health</p>
        <div class="rd-slot">Health mini-card — ${h.label || 'awaiting data'} (${h.pct ?? '—'}%)</div>
      </div>

      <div class="rd-card-sub">
        <div class="rd-card-title">${user.name || 'Unknown user'}</div>
        <div>${user.email || ''}</div>
      </div>
    </aside>
  `;
}
