/**
 * App — root Preact component.
 *
 * Owns:
 *   - Hash router (view + subId state, hashchange listener)
 *   - Layout: Sidebar + content area + Topbar + active view
 *   - View dispatch: migrated views rendered as components; un-migrated
 *     views rendered as stable placeholder divs for the legacy string-concat
 *     modules to fill (COEXISTENCE SEAM — see note below)
 *   - 30s auto-refresh: polls /api/state, diffs lastScanned, calls setState
 *   - Theme toggle: reads/persists localStorage('majlis-theme')
 *
 * COEXISTENCE-SEAM NOTE:
 *   Legacy client-main.js still registers its own hashchange listener and
 *   calls route() to toggle .active on view host divs. App renders stable,
 *   keyed placeholder divs for un-migrated views. Preact MUST NOT unmount
 *   or replace those nodes (and thus destroy legacy-injected innerHTML) on
 *   re-renders triggered by store updates, theme toggle, or auto-refresh.
 *   Strategy: the placeholder divs are rendered unconditionally in the JSX
 *   tree; their children are never managed by Preact (no inner content here).
 *   Preact's VDOM diff will leave the DOM children alone because it only sees
 *   the host element itself, not the legacy-written innerHTML.
 */

import { html, useState, useEffect, useRef, useCallback } from '../preact.js';
import { getState, setState, subscribe } from '../store.js';
import { Sidebar } from './Sidebar.js';
import { Topbar } from './Topbar.js';
import { OverviewView } from '../views/OverviewView.js';
import { DecisionsView } from '../views/DecisionsView.js';

// Views served by Preact components (migrated)
const PREACT_VIEWS = { overview: OverviewView, decisions: DecisionsView };

// All 12 view keys (order matches nav). Un-migrated ones get placeholder divs.
const ALL_VIEWS = [
  'overview', 'orchestration', 'roadmap', 'milestones', 'phases',
  'sprints', 'tasks', 'kanban', 'files', 'agents', 'decisions', 'memory',
];

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
  const [refreshLabel, setRefreshLabel] = useState('↺ Refresh');
  const lastScannedRef = useRef(null);

  const fetchAndRerender = useCallback(async () => {
    setRefreshLabel('↺ …');
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
    setRefreshLabel('↺ Refresh');
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

  // Expose manualRefresh globally so legacy Topbar onclick still works
  useEffect(() => {
    window._preactRefresh = fetchAndRerender;
  }, [fetchAndRerender]);

  // ---- View rendering ----
  const PreactView = PREACT_VIEWS[view];

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

          ${PreactView
            ? html`<${PreactView} subId=${subId} />`
            : null
          }

          ${/* Stable placeholder hosts for un-migrated legacy views.
               Preact renders these divs but NEVER manages their children.
               Legacy route() writes innerHTML into them directly.
               Key ensures Preact reuses the same DOM node across re-renders. */
            ALL_VIEWS
              .filter(v => !PREACT_VIEWS[v])
              .map(v => html`<div
                key=${v}
                id=${'view-' + v}
                class=${'view' + (view === v ? ' active' : '')}
              />`)
          }

        </div>
      </div>
    </div>
  `;
}
