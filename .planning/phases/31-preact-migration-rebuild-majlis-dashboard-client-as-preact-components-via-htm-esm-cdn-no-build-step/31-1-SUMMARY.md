# Execution Summary

**Phase:** 31 — Preact migration — Majlis dashboard client
**Sprint:** 31.1 — Preact runtime, store, router, shell components, 2 views
**Completed:** 2026-05-16
**Executor:** Claude Sonnet 4.6 (sequential executor)

## What Was Built

Established the complete Preact + htm ESM foundation for the Majlis dashboard with no build step:

- `/js/` route in `dashboard.js` widened to serve nested ESM module paths (`components/App.js`, `views/OverviewView.js`, etc.) with defense-in-depth traversal protection.
- `preact.js` — single pinned-version dependency surface (Preact 10.24.3, htm 3.1.1) re-exporting all hooks plus `memo`.
- `icons-client.js` — ESM counterpart to CJS `icons.js`, exporting `ICONS` map and `Icon` Preact component; cross-referenced in both files.
- `store.js` — minimal observable store seeded from `window.__S__`, exposing `getState`, `setState`, `subscribe`, `useStore`.
- `util.js` — stateless pure helpers (`esc`, `pct`, `pctNum`, `dateStr`, `humanDate`, `allSprints`, `allTasks`, `chip`) with no module-global phase state.
- `Sidebar.js` — 12 SVG-icon nav links (zero emoji) using existing CSS classes; `data-view` attributes preserved for legacy compat.
- `Topbar.js` — brand, live dot, updated-ago, Refresh/theme/copy-link buttons.
- `App.js` — root component owning hash router, theme, sidebar toggle, 30s auto-refresh, and coexistence seam.
- `app.js` — ESM entry point mounting App into `#app-root`.
- `OverviewView.js` — Preact port of `renderOverview()` reading from `useStore()`.
- `DecisionsView.js` — Preact port of `renderDecisions()` with `useState` filter (replaces DOM hack).
- `shell.js` — sidebar/topbar static markup removed; `#app-root` added as the Preact mount.
- `client.js` — now emits `window.__ICONS__`, `window.__S__`, legacy `<script src>` modules, and `<script type="module" src="/js/app.js">`.

## Stories Completed

| ID | Title | Status |
|----|-------|--------|
| 31.1.1 | Widen /js/ static route to serve nested ESM modules | done |
| 31.1.2 | Add Preact/htm ESM runtime module + make icons.js dual-mode | done |
| 31.1.3 | Build the reactive store + shared client utilities | done |
| 31.1.4 | App root, Sidebar, Topbar components + hash router | done |
| 31.1.5 | Migrate Overview + Decisions views; wire entry into shell.js + client.js | done |
| 31.1.6 | Manual regression sweep — foundation | checkpoint (awaiting human verify) |

## Files Modified

| File | Change |
|------|--------|
| `server/dashboard.js` | Widened `/js/` regex; added path containment check |
| `server/lib/html/client/preact.js` | Created — pinned Preact 10.24.3 + htm 3.1.1 re-export; added `memo` |
| `server/lib/html/client/icons-client.js` | Created — ESM icon set + `Icon` component |
| `server/lib/html/client/store.js` | Created — observable store seeded from `window.__S__` |
| `server/lib/html/client/util.js` | Created — stateless pure helpers |
| `server/lib/html/client/components/Sidebar.js` | Created — 12 SVG-icon nav links |
| `server/lib/html/client/components/Topbar.js` | Created — topbar component |
| `server/lib/html/client/components/App.js` | Created — root component; COEXISTENCE SEAM with `FrozenHost` + `memo` |
| `server/lib/html/client/app.js` | Created — ESM entry point |
| `server/lib/html/client/views/OverviewView.js` | Created — Preact port of renderOverview() |
| `server/lib/html/client/views/DecisionsView.js` | Created — Preact port of renderDecisions() |
| `server/lib/html/shell.js` | Removed static sidebar/topbar markup; added `#app-root`; cleaned unused vars |
| `server/lib/html/client.js` | Added `window.__ICONS__` injection and `<script type=module>` entry |
| `server/lib/html/client/client-main.js` | Made file list lazy (`initFileList()`); suppressed legacy renderOverview/renderDecisions calls |

## Deviations from Plan

**Coexistence seam architecture:** The sprint plan expected legacy view host divs to be rendered as "stable" placeholder divs inside App's virtual tree. The naive approach (rendering `<div id="view-files" />`) would have Preact wipe legacy-injected innerHTML on re-renders.

Resolution: Used Preact's `memo(() => true)` pattern (`FrozenHost` component) — the component never re-renders after first mount, so Preact's diff algorithm never touches the DOM children again. The `.active` class is toggled imperatively by `LegacyViewSync` (a null-render component with `useEffect`).

**File list lazy initialization:** The file-list IIFE in `client-main.js` ran at boot time but `#file-list-inline` doesn't exist until Preact mounts (since `type=module` scripts are deferred). Converted the IIFE to a lazy `initFileList()` function called on navigation to the Files view, with self-bootstrapping inner DOM creation if `#file-list-inline` is absent.

**Legacy route() override for migrated views:** `route()` in `client-main.js` called `renderOverview()` and `renderDecisions()` — but those views are now owned by Preact. Added guards in `route()` to skip legacy render calls for `overview` and `decisions`.

## Blockers Encountered

None that blocked the sprint. The coexistence seam required careful analysis (documented above as a deviation).

## Next Steps

- Sprint 31.2: Migrate Roadmap, Milestones, Phases, Sprints, Tasks views to Preact components.
- Sprint 31.3: Migrate Orchestration (session list, live poll), Kanban, Files, Agents, Memory views.
- Sprint 31.4: Delete legacy string-concat modules; clean dead code.

## Verification

- [x] `node server/dashboard.js` starts cleanly on :7717
- [x] All client JS files pass `node --check`
- [x] `renderHtml()` emits `app-root`, `/js/app.js`, `__ICONS__`
- [x] Both view modules parse cleanly and use `useStore()`
- [x] Sidebar has 12 nav links with SVG icons (zero emoji)
- [x] esm.sh imports are pinned to exact versions
- [ ] Human in-browser regression sweep (task 31.1.6 — checkpoint pending)
