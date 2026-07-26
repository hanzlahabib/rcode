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
 * the projectName prop. No sample data — when no user is configured the
 * profile footer is hidden, and a missing project name shows "No project".
 * No inline style= attributes — all styling via .sb-* classes in css.js.
 */

import { html } from '../preact.js';
import { Icon } from '../icons-client.js';
import { useStore } from '../store.js';
import { ProjectHealth } from './dashboard/ProjectHealth.js';

// Single flat nav — one entry per real Preact view (PREACT_VIEWS in App.js).
// Keep this list in sync with App.js: a view key absent there silently
// falls back to Overview, so never add a link without a matching view.
const NAV_LINKS = [
  { view: 'overview',      icon: 'home',        label: 'Overview'      },
  { view: 'roadmap',       icon: 'map',         label: 'Roadmap'       },
  { view: 'milestones',    icon: 'flag',        label: 'Milestones'    },
  { view: 'phases',        icon: 'layers',      label: 'Phases'        },
  { view: 'sprints',       icon: 'zap',         label: 'Sprints'       },
  { view: 'tasks',         icon: 'checkSquare', label: 'Tasks'         },
  { view: 'kanban',        icon: 'kanban',      label: 'Kanban'        },
  { view: 'backlog',       icon: 'hourglass',   label: 'Backlog'       },
  { view: 'decisions',     icon: 'scale',       label: 'Decisions'     },
  { view: 'files',         icon: 'file-text',   label: 'Files'         },
  { view: 'agents',        icon: 'users',       label: 'Agents'        },
  { view: 'memory',        icon: 'brain',       label: 'Memory'        },
  { view: 'orchestration', icon: 'terminal',    label: 'Orchestration' },
];

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
  // Slice subscription — Sidebar only re-renders when the project slice
  // changes, not on every refreshing/sessions tick.
  const project = useStore(s => s.project) || {};
  const name = project.name || projectName || 'No project';
  const user = (project.user && project.user.name) ? project.user : null;

  // Full store subscription for live health badge counts.
  // Re-renders on every setState (sessions poll every 4 s, state refresh every 30 s).
  const { activeSessions, blockers } = useStore();
  const sessionCount = (activeSessions || []).filter(s => s.status === 'running').length;
  const blockerCount = (blockers || []).length;

  return html`
    <aside class="sidebar" id="sidebar">
      <div class="sb-logo">
        <span class="sb-logo-badge">r</span>
        <span class="sb-logo-word">rcode</span>
      </div>

      <!-- Visually inert: the server scans exactly one project, so there is
           no switcher menu. Rendered as a plain label, no chevron/affordance. -->
      <div class="sb-switcher sb-switcher--static" title=${name}>
        <span class="sb-switcher-dot"></span>
        <span class="sb-switcher-name">${name}</span>
      </div>

      <div class="sidebar-health">
        <span
          class=${'health-badge' + (sessionCount === 0 ? ' health-badge--zero' : '')}
          title=${sessionCount + ' active orchestration session' + (sessionCount === 1 ? '' : 's')}
        >
          <${Icon} name="activity" size=${12} />
          ${sessionCount} active
        </span>
        <span
          class=${'health-badge' + (blockerCount > 0 ? ' health-badge--alert' : ' health-badge--zero')}
          title=${blockerCount + ' blocker' + (blockerCount === 1 ? '' : 's')}
        >
          <${Icon} name="alert-triangle" size=${12} />
          ${blockerCount} blocked
        </span>
      </div>

      <nav class="sb-nav">
        ${NAV_LINKS.map(({ view, icon, label }) => html`
          <button
            class=${'sb-nav-link' + (activeView === view ? ' active' : '')}
            data-view=${view}
            aria-current=${activeView === view ? 'page' : undefined}
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

      ${user ? html`
        <div class="sb-profile">
          <span class="sb-avatar">${initials(user.name)}</span>
          <span class="sb-profile-meta">
            <span class="sb-profile-name">${user.name}</span>
            <span class="sb-profile-email">${user.email || ''}</span>
          </span>
        </div>
      ` : null}
    </aside>
  `;
}
