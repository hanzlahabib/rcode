---
status: resolved
phase: 34
critical: 0
high: 0
medium: 0
low: 0
generated: 2026-06-13T00:00:00Z
resolved: 2026-06-21T00:00:00Z
---

# Phase 34 Code Review — Status Summary Bar with Multi-Attribute Filtering

Scope: `filter-state.js`, `StatusSummaryBar.js`, `FilterChips.js`, `App.js`, `css.js`, `PhasesView.js`, `SprintsView.js`.

---

## Resolution (2026-06-21)

- **H1, H2 — already fixed before this pass.** `StatusSummaryBar.js` uses a dedicated `sessionChip()` / `countSessionsByStatus()` for orchestrator sessions (no longer bucketing through `chip()`), and `phaseMilestone` is hoisted into `util.js` as the single source of truth, imported by both views. The original findings no longer hold.
- **M1** — `font-family: var(--font-sans)` added to `.filter-chip` and `.filter-chip-clear`.
- **M2** — `.filter-chip-clear:hover { border-color: var(--border-strong); color: var(--text-primary); }` added.
- **L1** — `humanLabel(cls)` helper added to `util.js`; both views now build `statusOptions` with human labels.
- **L2** — `aria-pressed=${isActive}` added to filter chip buttons.
- **L3** — `FilterChips` now accepts `viewPath` as a prop (passed `"phases"` / `"sprints"` by the views); falls back to the hash read only when omitted.

---

## HIGH

### H1 — Session status values fall through to unstyled "other" in StatusSummaryBar

**File:** `server/lib/html/client/components/StatusSummaryBar.js:24`, `server/lib/html/client/util.js:90`

`chip()` maps statuses as follows: `running → 'other'`, `stopped → 'other'`, `starting → 'other'`, `error → 'other'`. Only `blocked → 'blocked'` and `done → 'complete'` are handled. Session objects from the orchestrator poll (`orchestrator.js:232`) use `'running'` as the primary live-session status, but `chip('running')` returns `cls: 'other'` — a class that has no colour rule in `css.js`. The Sessions group in `StatusSummaryBar` will therefore render zero-styled grey chips labelled "N other" for most real session data. The aggregation is also misleading: `running` and `stopped` both bucket into the same chip, making the count meaningless.

The root cause is that `chip()` was designed for phase/sprint statuses, not orchestrator session statuses. Using it as the single normaliser for both entity types is incorrect.

**Recommended fix:** Either extend `chip()` to cover session statuses (`running → 'active'`, `stopped → 'planned'`, `error → 'blocked'`) — which must be carefully documented at the function because it changes semantics — or define a separate `sessionChip(status)` helper in `util.js` and use it in `countByStatus` when processing sessions. The latter is cleaner and avoids coupling two different status vocabularies into one function.

---

### H2 — `phaseMilestone` duplicated verbatim with hardcoded boundaries

**Files:** `server/lib/html/client/views/PhasesView.js:129–134`, `server/lib/html/client/views/SprintsView.js:125–130`

The function body is character-for-character identical. The milestone boundary numbers (19, 33) are magic constants that will silently diverge the moment a maintainer updates one file but not the other. Because `SprintsView` calls `phaseMilestone(s.phaseId)` and `PhasesView` calls `phaseMilestone(p.id)`, a future change to milestone boundaries in one view will produce inconsistent filter results between the two views — a user who filters by M2 in Sprints and then switches to Phases will see different items.

Why it matters in 6 months: the milestone map is a product decision; it will change. The current layout guarantees a regression when it does.

**Recommended fix:** Hoist `phaseMilestone` into `server/lib/html/client/util.js` (one export, one source of truth) and import it in both views.

---

## MEDIUM

### M1 — `filter-chip` and `filter-chip-clear` missing `font-family` declaration

**File:** `server/lib/html/css.js:4409–4435`

`<button>` elements do not inherit `font-family` from the page in all browsers (UA default is system-ui or Times depending on the browser). Every other interactive element in this codebase that renders as a button explicitly declares `font-family: var(--font-sans)` — for example `.header-btn` (line 397), `.kanban-run-btn` (line 1374), `.orch-footer-btn` (line 1697). The filter chips and clear button omit it, which can produce a font mismatch on non-Chromium browsers and will be obvious on Safari or Firefox where button default font differs.

**Recommended fix:** Add `font-family: var(--font-sans);` to `.filter-chip` and `.filter-chip-clear`.

---

### M2 — `filter-chip-clear` has no hover style

**File:** `server/lib/html/css.js:4425–4435`

`.filter-chip:hover` gets `border-color: var(--accent-primary)` (line 4419). `.filter-chip-clear:hover` has no rule at all. The clear button gives no hover affordance despite being an interactive element sitting in the same row. This is visually inconsistent and makes the element feel broken in its enabled state.

**Recommended fix:** Add `.filter-chip-clear:hover { border-color: var(--border-strong); color: var(--text-primary); }` to match the surrounding design language without adopting the accent colour (the clear action is destructive-neutral, not a selection).

---

## LOW

### L1 — Status chip labels show normalised CSS class names, not human labels

**File:** `server/lib/html/client/components/StatusSummaryBar.js:41–43`, `server/lib/html/client/views/PhasesView.js:165`

`SummaryGroup` renders `${count} ${cls}` where `cls` is the CSS-normalised value (`'complete'`, `'active'`, `'planned'`). `FilterChips` in the views builds `statusOptions` as `{ value: cls, label: cls }` — same cls for both. Users see machine labels ("complete", "active") rather than the original status string from data ("done", "in_progress"). For most statuses the class name is readable, but `'in_progress'` is normalised to `'active'`, so the filter chip label "active" does not match what a user might search for. This is low severity because the project's status vocabulary is controlled, but it is a presentational inconsistency worth tracking.

**Recommended fix:** Build `statusOptions` as `{ value: cls, label: humanLabel(cls) }` where `humanLabel` maps `'complete' → 'Done'`, `'active' → 'In Progress'`, etc. A small helper in `util.js` handles this in one place.

---

### L2 — `FilterChips` buttons have no `aria-pressed` attribute

**File:** `server/lib/html/client/components/FilterChips.js:42–51`

Toggle buttons that represent a selected/unselected state should carry `aria-pressed` so assistive technology can report current filter state. The `<button>` elements use only a CSS class (`filter-chip active`) to convey the toggled state. This is a low-risk gap on a dashboard not currently targeting WCAG compliance, but it is worth noting as the feature was explicitly framed as Archon-style interactive chips.

**Recommended fix:** Add `aria-pressed=${isActive}` to the button.

---

### L3 — `viewPath()` in `FilterChips.js` reads `location.hash` at call time rather than receiving it as a prop

**File:** `server/lib/html/client/components/FilterChips.js:20–22`

`viewPath()` reads `location.hash` imperatively at click time. This is correct in practice because the click always happens in the same tick as the current hash, but it makes the component impossible to test in isolation (the test harness must mock `location`) and creates a subtle assumption: if `handleClick` were ever called asynchronously (debounced, in a Promise chain), it would read a stale hash. The rest of the filter machinery accepts `filters` as a prop (clean); `viewPath` is the one outlier.

**Recommended fix:** Accept `viewPath` as a prop in `FilterChips` (passed down from the view, which already has the routing context), removing the direct `location` read from inside the component.

---

## Pattern check summary

- HTM syntax: correct — all component invocations use `<${Component}/>` form.
- No `React.FC`, no `style=` attribute in new code added by this phase (pre-existing `style=` in `VelocityBars` and `SprintDetail` are out of scope for this review).
- No `import` inside function bodies.
- `filter-state.js` is a clean pure module; `parseFilters` wraps the try/catch correctly.
- `applyFilters` correctly round-trips through `URLSearchParams` — no hand-rolled query string construction.
- `parseHash` in `App.js` correctly strips the `?query` segment before routing, preventing filter tokens leaking into view/subId.
- CSS added is in the correct append location (after RunnerPicker block, before command palette block).
