/**
 * Sidebar component — redesigned chrome to match the mockup.
 *
 * Public API is UNCHANGED — App.js still calls:
 *   <${Sidebar} activeView=${view} projectName=${storeState.projectName} />
 *
 * Layout (top → bottom):
 *   1. rcode logo badge
 *   2. project switcher (shows project.name)
 *   3. vertical nav with per-item icons (Overview active by default)
 *   4. Project Health mini-card (ProjectHealth.js)
 *   5. user profile footer (avatar initials + name + email)
 *
 * Reads `project { name, user { name, email } }` from the store; falls back to
 * the projectName prop and representative sample data so it renders standalone.
 * No inline style= attributes — all styling via .sb-* classes in css.js.
 */

import { html } from '../preact.js';
import { Icon } from '../icons-client.js';
import { useStore } from '../store.js';
import { ProjectHealth } from './dashboard/ProjectHealth.js';

// Single flat nav matching the mockup. `view` is the hash route; items whose
// view has no dedicated Preact view yet still route by hash (App falls back).
const NAV_LINKS = [
  { view: 'overview',     icon: 'home',        label: 'Overview'     },
  { view: 'tasks',        icon: 'checkSquare', label: 'Tasks'        },
  { view: 'decisions',    icon: 'scale',       label: 'Decisions'    },
  { view: 'architecture', icon: 'layers',      label: 'Architecture' },
  { view: 'documents',    icon: 'file-text',   label: 'Documents'    },
  { view: 'timeline',     icon: 'clock',       label: 'Timeline'     },
  { view: 'integrations', icon: 'link',        label: 'Integrations' },
  { view: 'settings',     icon: 'edit-3',      label: 'Settings'     },
];

// Representative fallbacks so the chrome renders before /api/state lands.
const SAMPLE_PROJECT = {
  name: 'Acme AI Platform',
  user: { name: 'Hanzla', email: 'hanzla@example.com' },
};

/** Two-letter initials from a display name. */
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Sidebar component.
 *
 * Props:
 *   activeView  {string}  — currently active view key (drives nav highlight)
 *   projectName {string}  — fallback project name when store has no project slice
 */
export function Sidebar({ activeView, projectName }) {
  const S = useStore();
  const project = (S && S.project) || {};
  const name = project.name || projectName || SAMPLE_PROJECT.name;
  const user = project.user || SAMPLE_PROJECT.user;

  return html`
    <aside class="sidebar" id="sidebar">
      <div class="sb-logo">
        <span class="sb-logo-badge">r</span>
        <span class="sb-logo-word">rcode</span>
      </div>

      <button class="sb-switcher" type="button" title=${name}>
        <span class="sb-switcher-dot"></span>
        <span class="sb-switcher-name">${name}</span>
        <span class="sb-switcher-chev">▾</span>
      </button>

      <nav class="sb-nav">
        ${NAV_LINKS.map(({ view, icon, label }) => html`
          <button
            class=${'sb-nav-link' + (activeView === view ? ' active' : '')}
            data-view=${view}
            onClick=${() => { location.hash = view; }}
          >
            <span class="sb-nav-ic"><${Icon} name=${icon} size=${16} /></span>
            <span class="sb-nav-label">${label}</span>
          </button>
        `)}
      </nav>

      <div class="sb-health">
        <${ProjectHealth} />
      </div>

      <div class="sb-profile">
        <span class="sb-avatar">${initials(user.name)}</span>
        <span class="sb-profile-meta">
          <span class="sb-profile-name">${user.name || ''}</span>
          <span class="sb-profile-email">${user.email || ''}</span>
        </span>
      </div>
    </aside>
  `;
}
