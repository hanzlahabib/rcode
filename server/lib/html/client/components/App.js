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
import { parseFilters } from '../filter-state.js';
import { getState, setState, subscribe, registerRefresh } from '../store.js';
import { startSessionsPoll, refreshOrchToken } from '../orchestrator.js';
import { Sidebar } from './Sidebar.js';
import { Topbar } from './Topbar.js';
import { XtermPanel } from './XtermPanel.js';
import { OrchPanel } from './OrchPanel.js';
import { RunnerPicker } from './RunnerPicker.js';
import { RunConfirmDialog } from './RunConfirmDialog.js';
import { CommandPalette } from './CommandPalette.js';
import { BlockedToasts } from './NotifyCenter.js';
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

/** Parse location.hash into { view, subId, filters } — port of client-main.js:45-49. */
function parseHash() {
  const raw = location.hash.slice(1) || 'overview';
  // Strip ?query suffix before routing so it never leaks into view/subId.
  const qIdx  = raw.indexOf('?');
  const path  = qIdx === -1 ? raw : raw.slice(0, qIdx);
  const slash = path.indexOf('/');
  const view  = slash === -1 ? path : path.slice(0, slash);
  // subId must not include the ?query portion.
  const subId = slash === -1 ? null : path.slice(slash + 1);
  // #263: unknown hash falls back to overview
  const resolvedView = ALL_VIEWS.includes(view) ? view : 'overview';
  const filters = parseFilters(location.hash);
  return { view: resolvedView, subId, filters };
}

/** Full-width banner shown when /api/state polling is failing. */
function OfflineBanner({ offline }) {
  if (!offline) return null;
  return html`<div class="offline-banner" role="alert">⚠ Dashboard offline — retrying every 30s…</div>`;
}

/** Dismissible banner shown when .rcode/state.json failed to parse. */
function ParseErrorBanner({ error, dismissed }) {
  if (!error || dismissed) return null;
  return html`
    <div class="parse-error-banner" role="alert">
      <span>⚠ .rcode/state.json is corrupted — data shown may be stale or empty (${error})</span>
      <button class="banner-dismiss" aria-label="Dismiss"
        onClick=${() => setState({ parseErrorDismissed: true })}>✕</button>
    </div>
  `;
}

/** Close the mobile slide-in sidebar (no-op on desktop where it is static). */
function closeMobileSidebar() {
  const sidebar  = document.querySelector('.sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('show');
}

/** Thin IDE-style status bar: project path · rcode version · last refresh. */
function StatusBar({ projectRoot, projectName, version, updatedAgo, offline, refreshing }) {
  const path = projectRoot || projectName || 'no project';
  const dotCls = 'statusbar-dot'
    + (offline ? ' statusbar-dot--offline' : '')
    + (refreshing ? ' statusbar-dot--busy' : '');
  return html`
    <footer class="statusbar">
      <span class=${dotCls}></span>
      <span class="statusbar-path" title=${path}>${path}</span>
      <span class="statusbar-version">rcode v${version || '?'}</span>
      <span>${offline ? 'offline' : refreshing ? 'syncing…' : 'updated ' + updatedAgo}</span>
    </footer>
  `;
}

/** Root App component. No props needed — reads everything from the store. */
export function App() {
  // ---- Router state ----
  const [{ view, subId, filters }, setRoute] = useState(parseHash);

  useEffect(() => {
    function onHashChange() {
      setRoute(parseHash());
      closeMobileSidebar(); // navigating from the mobile nav should reveal the view
    }
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
  // Class names match the mobile CSS contract: .sidebar.open + #sidebar-backdrop.show
  const toggleSidebar = useCallback(() => {
    const sidebar  = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;
    const open = sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('show', open);
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

  // ---- Refresh (manual + 30s poll share this) ----
  const lastScannedRef = useRef(null);

  const fetchAndRerender = useCallback(async () => {
    setState({ refreshing: true });
    try {
      const r = await fetch('/api/state');
      if (!r.ok) { setState({ refreshing: false, offline: true }); return; }
      const newState = await r.json();
      // The server's scan cache keeps lastScanned stable while nothing on
      // disk changed — same stamp means identical data, so skip the patch
      // entirely instead of committing fresh object identities that would
      // re-render every subscribed component.
      if (lastScannedRef.current && lastScannedRef.current === newState.lastScanned) {
        scanTimeRef.current = Date.now();
        setUpdatedAgo('just now');
        setState({ refreshing: false, offline: false });
        return;
      }
      lastScannedRef.current = newState.lastScanned;
      scanTimeRef.current = Date.now();
      setUpdatedAgo('just now');
      const patch = {
        refreshing: false, offline: false, lastRefresh: Date.now(),
        // Surface state.json corruption (§1.4) — also clears the banner once fixed.
        rawParseError: newState.rawParseError || null,
      };
      // Redesign contract slices (DATA-CONTRACT.md) — derived server-side and
      // returned under newState.dashboard. Keep them fresh on every poll.
      const d = newState.dashboard || {};
      Object.assign(patch, {
        initialized: newState.exists !== false,
        project:   d.project   || null,
        progress:  d.progress  || null,
        timeline:  d.timeline  || null,
        tasks:     d.tasks     || null,
        health:    d.health    || null,
      });
      if (newState.raw) {
        Object.assign(patch, {
          phases:           d.phases       || newState.phaseTree || newState.raw.phases || [],
          milestone:        newState.raw.milestone        || '',
          currentPhase:     d.currentPhase || newState.raw.current_phase || null,
          currentSprint:    newState.raw.current_sprint   || null,
          decisions:        d.decisions    || newState.raw.decisions || [],
          blockers:         d.blockers     || newState.raw.blockers  || [],
          council_sessions: newState.raw.council_sessions || [],
          last_session:     newState.raw.last_session     || null,
        });
      }
      setState(patch);
    } catch {
      // Network failure → mark offline so the banner shows; the poll keeps retrying.
      setState({ refreshing: false, offline: true });
    }
  }, []);

  // ---- 30s auto-refresh ----
  useEffect(() => {
    const id = setInterval(fetchAndRerender, 30000);
    return () => clearInterval(id);
  }, [fetchAndRerender]);

  // Register the refresh handler with the store so any component can call
  // refresh() directly. Also keeps window._preactRefresh in sync for legacy.
  useEffect(() => {
    registerRefresh(fetchAndRerender);
  }, [fetchAndRerender]);

  // Start the global session poll and refresh the orchestrator token on boot.
  useEffect(() => {
    refreshOrchToken();
    startSessionsPoll();
  }, []);

  // ---- Command palette ----
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ---- View rendering ----
  const PreactView = PREACT_VIEWS[view] || null;

  return html`
    <div class="app-shell">
      <${Sidebar} activeView=${view} projectName=${storeState.projectName || ''} />

      <div id="sidebar-backdrop" onClick=${closeMobileSidebar}></div>

      <div class="content-area" id="main-content">
        <${Topbar}
          projectName=${storeState.projectName || ''}
          updatedAgo=${updatedAgo}
          refreshing=${storeState.refreshing}
          onRefresh=${fetchAndRerender}
          onToggleTheme=${toggleTheme}
          onToggleSidebar=${toggleSidebar}
          themeLabel=${theme}
        />

        <div class="main-scroll" id="main-scroll">
          <${OfflineBanner} offline=${storeState.offline} />
          <${ParseErrorBanner}
            error=${storeState.rawParseError}
            dismissed=${storeState.parseErrorDismissed}
          />
          ${PreactView ? html`<${PreactView} subId=${subId} filters=${filters} />` : null}
        </div>

        <${StatusBar}
          projectRoot=${storeState.projectRoot}
          projectName=${storeState.projectName}
          version=${storeState.version}
          updatedAgo=${updatedAgo}
          offline=${storeState.offline}
          refreshing=${storeState.refreshing}
        />
      </div>

      <${XtermPanel} />
      <${OrchPanel} />
      <${BlockedToasts} />
      <${RunnerPicker} />
      <${RunConfirmDialog} pending=${storeState.runConfirm} />
      <${CommandPalette} open=${paletteOpen} onClose=${() => setPaletteOpen(false)} />
    </div>
  `;
}
