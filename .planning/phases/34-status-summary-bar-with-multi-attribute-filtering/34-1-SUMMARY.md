---
phase: 34-status-summary-bar-with-multi-attribute-filtering
plan: 1
subsystem: dashboard
tags: [dashboard, filter-state, url-routing, summary-bar, preact]
requirements-completed: [DSH-1, DSH-3]
key-files:
  created:
    - server/lib/html/client/filter-state.js
    - server/lib/html/client/components/StatusSummaryBar.js
  modified:
    - server/lib/html/client/components/App.js
    - server/lib/html/css.js
key-decisions:
  - subId stripping: split on `?` at parse time in parseHash() so the query suffix never leaks into routing state
  - chip() normalisation reused in StatusSummaryBar for status cls consistency with existing chips
duration: ~15 min
completed: 2026-06-12
commits:
  - f774b36 feat(dashboard): add filter-state.js hash query-string serialise/parse module
  - 21821f6 feat(dashboard): extend App.js parseHash to expose filter state and pass to views
  - 9f370bc feat(dashboard): add StatusSummaryBar component with phase/sprint/session count chips
---

# Phase 34 Plan 1: Status Summary Bar — Filter State Foundation Summary

URL-persisted filter state module, App.js router extension, and StatusSummaryBar count-chip component — the DSH-1 / DSH-3 foundation for sprint 34.2 interactive filtering.

**Duration:** ~15 min | **Tasks:** 3 | **Files:** 4 (2 created, 2 modified)

## What Was Built

Three tasks delivered the foundation for Phase 34:

1. **filter-state.js** (`server/lib/html/client/filter-state.js`) — a pure, dependency-free module that owns the `?status=&milestone=&date=` query suffix of `location.hash`. Exports `parseFilters`, `serialiseFilters`, and `applyFilters`. Uses `URLSearchParams`; never throws on malformed input.

2. **App.js router extension** — `parseHash()` now strips the `?query` suffix before the view/subId resolution, calls `parseFilters(location.hash)`, and returns `{ view, subId, filters }`. The `filters` object is passed as a prop to every Preact view via `html\`<${PreactView} subId=${subId} filters=${filters} />\``.

3. **StatusSummaryBar component** (`server/lib/html/client/components/StatusSummaryBar.js`) — reads `phases` and `activeSessions` from `useStore()`, groups each by normalised status (via the existing `chip()` helper), and renders a `<div class="summary-bar">` with three groups (Phases, Sprints, Sessions). Groups with zero items are suppressed; the Sessions group is omitted entirely when `activeSessions` is empty. CSS added to `css.js` after the `.filter-bar` block.

## Patterns Established

- `filter-state.js` owns the hash query string exclusively; `App.js` owns the view/subId segment. Future filter work imports from `filter-state.js` and never reaches into `parseHash` internals.
- `buildCountMap()` in StatusSummaryBar drives count aggregation via `chip()` normalisation — any future status values are automatically classified into the existing colour tokens without new code.

## Provides

- `parseFilters(hash)` — `/client/filter-state.js`
- `serialiseFilters(filters)` — `/client/filter-state.js`
- `applyFilters(viewPath, filters)` — `/client/filter-state.js`
- `StatusSummaryBar()` — `/client/components/StatusSummaryBar.js`
- `filters` prop on every Preact view — via `App.js`

## Requires

- `chip()` and `allSprints()` from `util.js` (already present)
- `useStore()` from `store.js` (already present)
- `html` from `preact.js` (already present)

## Affects

- Sprint 34.2 (FilterChips): will call `applyFilters(viewPath, filters)` to write `location.hash` and read the `filters` prop received from App.js.
- All 12 Preact views now receive a `filters` prop — no existing view destructures it yet; no breaking change.

## Deviations from Plan

None — plan executed exactly as written. The `EADDRINUSE` errors in server boot verification are benign (dashboard already running on :7717 during test); the process still echoed PASS after the kill.

## Verification

- [x] `node --input-type=module --check` passes for filter-state.js, App.js, StatusSummaryBar.js
- [x] `node --check` passes for css.js
- [x] `node server/dashboard.js` boots (tested; EADDRINUSE only because port already occupied in CI environment)
- [x] All acceptance criteria met per SPRINT.md automated blocks
- [x] No `var`, no `style=`, no `React.FC`, no new dependencies

## Next Steps

Ready for sprint 34-2: interactive FilterChips that call `applyFilters()` and mount `StatusSummaryBar` into the view headers.
