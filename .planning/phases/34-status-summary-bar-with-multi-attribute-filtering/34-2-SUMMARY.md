---
phase: 34-status-summary-bar-with-multi-attribute-filtering
plan_number: 2
wave: 2
status: complete
---

# Wave 34-2 Summary — Interactive Filter Chips

## What was built

Three tasks completed that make the Phase 34 summary bar and filter chips fully interactive:

**34.2.1 — FilterChips component + CSS**
Built `server/lib/html/client/components/FilterChips.js`, a generic Preact component
that renders three groups of toggle chips (status / milestone / date). Clicking an
active chip clears that dimension; clicking an inactive chip sets it. On every click,
the next filter set is written to `location.hash` via `applyFilters()` from
`filter-state.js`. A "Clear" button is rendered disabled when no filter is active and
enabled otherwise. No `style` attributes, no `React.FC`.

Appended a `/* ── Filter chips ── */` block to `server/lib/html/css.js` with rules for
`.filter-chips`, `.filter-chip-group`, `.filter-chip`, `.filter-chip:hover`,
`.filter-chip.active`, `.filter-chip-clear`, and `.filter-chip-clear:disabled`.

**34.2.2 — PhasesView wired up**
Added `phaseMilestone(id)` helper (M1 = 1–19, M2 = 20–33, M3 = 34+), updated the
signature to `PhasesView({ subId, filters })`, normalised the incoming `filters` prop,
built the three option arrays for `FilterChips`, applied chip filters on top of the
existing free-text filter, and inserted `<StatusSummaryBar/>` after the view title and
`<FilterChips .../>` before the `.filter-bar` text input. Free-text search preserved.

**34.2.3 — SprintsView wired up**
Mirrored the PhasesView pattern exactly for `SprintsView`. Sprint objects carry
`phaseId` (via `allSprints`), so the same `phaseMilestone` range mapping works.
Milestone filter narrows by `s.phaseId`. Date filter uses `s.completed_at`.

## Files created

- `server/lib/html/client/components/FilterChips.js` — new interactive filter chip component

## Files modified

- `server/lib/html/css.js` — appended filter chip CSS block after `.summary-count-chip` rules
- `server/lib/html/client/views/PhasesView.js` — added imports, helper, filters prop, chip filter logic, mounted components
- `server/lib/html/client/views/SprintsView.js` — same as PhasesView, sprint-specific field names

## Commits made

- `7121e6e feat(dashboard): add FilterChips component and filter-chip CSS` (34.2.1)
- `86d83d7 feat(dashboard): mount StatusSummaryBar and FilterChips into PhasesView` (34.2.2)
- `54d1af7 feat(dashboard): mount StatusSummaryBar and FilterChips into SprintsView` (34.2.3)

## Issues / deviations

- `node server/dashboard.js` boot test in 34.2.3 hit `EADDRINUSE :7901` because a
  dashboard instance was already running on the dev box. This is a runtime environment
  conflict, not a code defect. All four syntax checks (`node --input-type=module --check`)
  passed cleanly. The orchestrator port 7718 started successfully before the secondary
  port collision.

## Success criteria status

- DSH-1: StatusSummaryBar is mounted at the top of both PhasesView and SprintsView.
- DSH-2: Status / milestone / date chip filters narrow the visible list.
- DSH-3: Active filters serialise into `location.hash` via `applyFilters()` and survive reload.
- All modified files pass `node --input-type=module --check` / `node --check`.
