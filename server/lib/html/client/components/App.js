/**
 * App — root Preact component.
 *
 * Owns:
 *   - Hash router (view + subId state, hashchange listener)
 *   - Layout: Sidebar + content area + Topbar + all 12 Preact view components
 *   - 30s auto-refresh: polls /api/state, diffs lastScanned, calls setState
 *   - Theme toggle: reads/persists localStorage('majlis-theme')
 *
 * Sprint 31.4 completed the Preact migration. All 12 views are Preact
 * components. Legacy client-main.js, client-render.js, and client-kanban.js
 * are deleted. No coexistence seam remains.
 */

import { html, useState, useEffect, useRef, useCallback } from '../preact.js';
import { getState, setState, subscribe } from '../store.js';
import { startSessionsPoll, refreshOrchToken } from '../orchestrator.js';
import { Sidebar } from './Sidebar.js';
import { Topbar } from './Topbar.js';
import { XtermPanel } from './XtermPanel.js';
import { OrchPanel } from './OrchPanel.js';
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
import { OrchestrationView } from '../views/OrchestrationView.js';

// Views served by Preact components (migrated)
// Sprint 31.4: +orchestration → all 12 views Preact. Migration complete.
const PREACT_VIEWS = {
  overview:      OverviewView,
  decisions:     DecisionsView,
  roadmap:       RoadmapView,
  milestones:    MilestonesView,
  phases:        PhasesView,
  sprints:       SprintsView,
  tasks:         TasksView,
  kanban:        KanbanView,
  files:         FilesView,
  agents:        AgentsView,
  memory:        MemoryView,
  orchestration: OrchestrationView,
};

// All views are now Preact — no legacy placeholder hosts needed.
const LEGACY_VIEWS = [];

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
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('majlis-theme') || 'dark';
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    return saved;
  });

  const toggleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next === 'dark' ? '' : next);
    localStorage.setItem('majlis-theme', next);
    setTheme(next);
  }, [theme]);

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
      if (!r.ok) return;
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
        if (!r.ok) return;
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

  // Start the global session poll and refresh the orchestrator token on boot.
  useEffect(() => {
    refreshOrchToken();
    startSessionsPoll();
  }, []);

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
          themeLabel=${theme}
        />

        <div class="main-scroll" id="main-scroll">
          ${PreactView ? html`<${PreactView} subId=${subId} />` : null}
        </div>
      </div>

      <${XtermPanel} />
      <${OrchPanel} />
    </div>
  `;
}
