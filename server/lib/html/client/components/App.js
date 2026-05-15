/**
 * App — root Preact component.
 *
 * Owns:
 *   - Hash router (view + subId state, hashchange listener)
 *   - Layout: Sidebar + content area + Topbar + migrated view components
 *   - 30s auto-refresh: polls /api/state, diffs lastScanned, calls setState
 *   - Theme toggle: reads/persists localStorage('majlis-theme')
 *
 * COEXISTENCE-SEAM NOTE:
 *   Legacy client-main.js still registers its own hashchange listener and
 *   calls route() to toggle .active on view host divs. The un-migrated view
 *   host divs (#view-orchestration, #view-kanban, etc.) remain as STATIC
 *   HTML in shell.js — Preact does NOT render them. App only renders the
 *   sidebar, topbar, and the 2 migrated Preact views inside #app-root.
 *
 *   For un-migrated views, App uses LegacyViewSync to imperatively toggle
 *   the .active class on the static host divs when the route changes.
 *   Legacy route() in client-main.js also toggles these — both coexist.
 *
 *   The migrated Preact views (overview, decisions, roadmap, milestones,
 *   phases, sprints, tasks) are rendered INSIDE #app-root. The legacy
 *   render functions for these views are removed from client-render.js.
 */

import { html, useState, useEffect, useRef, useCallback, memo } from '../preact.js';
import { getState, setState, subscribe } from '../store.js';
import { Sidebar } from './Sidebar.js';
import { Topbar } from './Topbar.js';
import { OverviewView } from '../views/OverviewView.js';
import { DecisionsView } from '../views/DecisionsView.js';
import { RoadmapView } from '../views/RoadmapView.js';
import { MilestonesView } from '../views/MilestonesView.js';
import { PhasesView } from '../views/PhasesView.js';
import { SprintsView } from '../views/SprintsView.js';
import { TasksView } from '../views/TasksView.js';
import { KanbanView } from '../views/KanbanView.js';
import { FilesView } from '../views/FilesView.js';
import { AgentsView } from '../views/AgentsView.js';
import { MemoryView } from '../views/MemoryView.js';

// Views served by Preact components (migrated)
// Sprint 31.3: +kanban, +files, +agents, +memory → 11 of 12 views Preact.
const PREACT_VIEWS = {
  overview:   OverviewView,
  decisions:  DecisionsView,
  roadmap:    RoadmapView,
  milestones: MilestonesView,
  phases:     PhasesView,
  sprints:    SprintsView,
  tasks:      TasksView,
  kanban:     KanbanView,
  files:      FilesView,
  agents:     AgentsView,
  memory:     MemoryView,
};

// Un-migrated view keys — rendered as frozen placeholder divs inside main-scroll.
// Only Orchestration remains legacy until Sprint 31.4.
const LEGACY_VIEWS = [
  'orchestration',
];

const ALL_VIEWS = Object.keys(PREACT_VIEWS).concat(LEGACY_VIEWS);

/** Parse location.hash into { view, subId } — port of client-main.js:45-49. */
function parseHash() {
  const raw = location.hash.slice(1) || 'overview';
  const slash = raw.indexOf('/');
  const view  = slash === -1 ? raw : raw.slice(0, slash);
  const subId = slash === -1 ? null : raw.slice(slash + 1);
  // #263: unknown hash falls back to overview
  const resolvedView = ALL_VIEWS.includes(view) ? view : 'overview';
  return { view: resolvedView, subId };
}

/**
 * Frozen placeholder host for an un-migrated legacy view.
 *
 * memo(() => true) means this component NEVER re-renders after first mount.
 * Preact will not diff its children, so legacy-injected innerHTML survives
 * store updates, theme toggles, and auto-refresh re-renders.
 *
 * The .active class is managed imperatively by LegacyViewSync (not via props),
 * because a props change would trigger a re-render (memo would not bail out
 * if the propsAreEqual function checked the active prop).
 */
const FrozenHost = memo(
  function FrozenHost({ id }) {
    return html`<div id=${id} class="view" />`;
  },
  () => true, // always equal → never re-render
);

/**
 * Imperatively sync the .active class on frozen legacy view host divs.
 * Renders nothing — uses effects to touch the DOM directly after each
 * router state change. Coexists with legacy route()'s own class toggling.
 */
function LegacyViewSync({ activeView }) {
  useEffect(() => {
    for (const v of LEGACY_VIEWS) {
      const el = document.getElementById('view-' + v);
      if (el) el.classList.toggle('active', activeView === v);
    }
  }, [activeView]);
  return null;
}

/** Root App component. No props needed — reads everything from the store. */
export function App() {
  // ---- Router state ----
  const [{ view, subId }, setRoute] = useState(parseHash);

  useEffect(() => {
    function onHashChange() { setRoute(parseHash()); }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // ---- Store state (for projectName and pass-through to views) ----
  const [storeState, setStoreState] = useState(getState);
  useEffect(() => {
    const unsub = subscribe(newState => setStoreState({ ...newState }));
    return unsub;
  }, []);

  // ---- Theme ----
  const [themeLabel, setThemeLabel] = useState(() => {
    const saved = localStorage.getItem('majlis-theme');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      return '🌙';
    }
    return '◑';
  });

  const toggleTheme = useCallback(() => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next === 'dark' ? '' : next);
    localStorage.setItem('majlis-theme', next);
    setThemeLabel(next === 'light' ? '🌙' : '☀️');
  }, []);

  // ---- Sidebar collapse ----
  const toggleSidebar = useCallback(() => {
    const sidebar  = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;
    const open = sidebar.classList.toggle('sidebar-open');
    if (backdrop) backdrop.classList.toggle('active', open);
    document.body.classList.toggle('sidebar-visible', open);
  }, []);

  // ---- Updated-ago display ----
  const [updatedAgo, setUpdatedAgo] = useState('just now');
  const scanTimeRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - scanTimeRef.current) / 1000);
      setUpdatedAgo(s < 5 ? 'just now' : s < 60 ? s + 's ago' : Math.floor(s / 60) + 'm ago');
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ---- Manual refresh ----
  const lastScannedRef = useRef(null);

  const fetchAndRerender = useCallback(async () => {
    const btn = document.getElementById('refresh-btn');
    if (btn) btn.textContent = '↺ …';
    try {
      const r = await fetch('/api/state');
      const newState = await r.json();
      lastScannedRef.current = newState.lastScanned;
      scanTimeRef.current = Date.now();
      setUpdatedAgo('just now');
      if (newState.raw) {
        setState({
          phases:           newState.raw.phases           || [],
          milestone:        newState.raw.milestone        || '',
          currentPhase:     newState.raw.current_phase    || null,
          currentSprint:    newState.raw.current_sprint   || null,
          decisions:        newState.raw.decisions        || [],
          blockers:         newState.raw.blockers         || [],
          council_sessions: newState.raw.council_sessions || [],
          last_session:     newState.raw.last_session     || null,
        });
      }
    } catch { /* network errors ignored */ }
    if (btn) btn.textContent = '↺ Refresh';
  }, []);

  // ---- 30s auto-refresh ----
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const r = await fetch('/api/state');
        const s = await r.json();
        if (s.lastScanned !== lastScannedRef.current) await fetchAndRerender();
      } catch { /* ignore */ }
    }, 30000);
    return () => clearInterval(id);
  }, [fetchAndRerender]);

  // Expose manualRefresh globally for any legacy onclick="manualRefresh()" callers
  useEffect(() => {
    window._preactRefresh = fetchAndRerender;
  }, [fetchAndRerender]);

  // ---- View rendering ----
  const PreactView = PREACT_VIEWS[view] || null;

  return html`
    <div class="app-shell">
      <${Sidebar} activeView=${view} projectName=${storeState.projectName || ''} />

      <div id="sidebar-backdrop" onClick=${() => {
        const sidebar  = document.querySelector('.sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (sidebar) sidebar.classList.remove('sidebar-open');
        if (backdrop) backdrop.classList.remove('active');
        document.body.classList.remove('sidebar-visible');
      }}></div>

      <div class="content-area" id="main-content">
        <${Topbar}
          projectName=${storeState.projectName || ''}
          updatedAgo=${updatedAgo}
          onRefresh=${fetchAndRerender}
          onToggleTheme=${toggleTheme}
          onToggleSidebar=${toggleSidebar}
          themeLabel=${themeLabel}
        />

        <div class="main-scroll" id="main-scroll">
          ${/* Imperatively sync .active on frozen legacy host divs. */}
          <${LegacyViewSync} activeView=${view} />

          ${/* Migrated Preact views — rendered and managed by Preact. */}
          ${PreactView ? html`<${PreactView} subId=${subId} />` : null}

          ${/* Frozen placeholder hosts for un-migrated legacy views.
               FrozenHost never re-renders (memo(() => true)) so Preact
               does not clear legacy-injected innerHTML on store updates. */}
          ${LEGACY_VIEWS.map(v => html`<${FrozenHost} key=${v} id=${'view-' + v} />`)}
        </div>
      </div>
    </div>
  `;
}
