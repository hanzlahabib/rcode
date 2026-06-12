# Sprint 34.1 Summary — Status Summary Bar Foundation

## What was built

Three deliverables for the Phase 34 DSH-1/DSH-3 foundation:

1. **filter-state.js** — a pure module that owns the `?status=&milestone=&date=`
   query portion of `location.hash`. Exports `parseFilters`, `serialiseFilters`,
   and `applyFilters`. Uses `URLSearchParams`; stable key order; no side effects.

2. **App.js router extension** — `parseHash()` now strips the `?query` suffix
   from the path before routing (so `subId` is never contaminated), calls
   `parseFilters(location.hash)`, and returns `{ view, subId, filters }`. The
   `filters` object is passed as a prop to every mounted view.

3. **StatusSummaryBar component + CSS** — `StatusSummaryBar.js` reads `phases`
   and `activeSessions` from the store, computes per-status count maps via
   `chip()`, and renders `.summary-bar > .summary-group > .summary-count-chip`
   chips. Groups with zero items are suppressed. CSS added to `css.js`.

## Files created

- `server/lib/html/client/filter-state.js` (new)
- `server/lib/html/client/components/StatusSummaryBar.js` (new)

## Files modified

- `server/lib/html/client/components/App.js` — import, parseHash, route destructure, PreactView prop
- `server/lib/html/css.js` — `.summary-bar`, `.summary-group`, `.summary-group-label`, `.summary-count-chip` + status accents

## Commits

1. `feat(dashboard): add filter-state.js hash query-string serialise/parse module`
2. `feat(dashboard): extend parseHash to expose filter state and pass filters prop to views`
3. `feat(dashboard): add StatusSummaryBar component with phase/sprint/session count chips`

## Issues encountered

None. All `node --input-type=module --check` and `node --check` verifications
passed. The dashboard boot test hit `EADDRINUSE` on port 7901 because an existing
dashboard instance was already running — this is a pre-existing environment
condition, not a code issue. `node --check server/dashboard.js` passed cleanly.
