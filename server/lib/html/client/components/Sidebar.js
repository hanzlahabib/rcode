/**
 * Sidebar component — project label, nav sections, 12 nav-link buttons.
 *
 * Reuses existing CSS classes from css.js: sidebar, nav-section, nav-link,
 * data-view, active. Emoji replaced with SVG icons from icons-client.js.
 */

import { html } from '../preact.js';
import { Icon } from '../icons-client.js';

// Nav structure: [ { section, links: [ { view, icon, label } ] } ]
const NAV_SECTIONS = [
  {
    section: 'Overview',
    links: [
      { view: 'overview',      icon: 'home',        label: 'Overview'      },
      { view: 'orchestration', icon: 'activity',    label: 'Orchestration' },
      { view: 'roadmap',       icon: 'map',         label: 'Roadmap'       },
    ],
  },
  {
    section: 'Planning',
    links: [
      { view: 'milestones', icon: 'target',      label: 'Milestones' },
      { view: 'phases',     icon: 'layers',      label: 'Phases'     },
      { view: 'sprints',    icon: 'zap',         label: 'Sprints'    },
      { view: 'tasks',      icon: 'checkSquare', label: 'Tasks'      },
      { view: 'kanban',     icon: 'kanban',      label: 'Kanban'     },
    ],
  },
  {
    section: 'Workspace',
    links: [
      { view: 'files',     icon: 'file',     label: 'Files'     },
      { view: 'agents',    icon: 'users',    label: 'Agents'    },
      { view: 'decisions', icon: 'scale',    label: 'Decisions' },
      { view: 'memory',    icon: 'database', label: 'Memory'    },
    ],
  },
];

/**
 * Sidebar component.
 *
 * Props:
 *   activeView  {string}  — currently active view key
 *   projectName {string}  — displayed under the "Rihal" label
 */
export function Sidebar({ activeView, projectName }) {
  return html`
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-project">
        <div class="project-label">Rihal</div>
        <span>${projectName || ''}</span>
      </div>
      <nav>
        ${NAV_SECTIONS.map(({ section, links }) => html`
          <div class="nav-section">${section}</div>
          ${links.map(({ view, icon, label }) => html`
            <button
              class=${'nav-link' + (activeView === view ? ' active' : '')}
              data-view=${view}
              onClick=${() => { location.hash = view; }}
            >
              <${Icon} name=${icon} size=${14} />
              ${' ' + label}
            </button>
          `)}
        `)}
      </nav>
    </aside>
  `;
}
