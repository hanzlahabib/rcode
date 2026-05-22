---
phase: 34-status-summary-bar-with-multi-attribute-filtering
plan_number: 2
wave: 2
depends_on: [34-1-SPRINT]
autonomous: true
files_modified:
  - server/lib/html/client/components/FilterChips.js
  - server/lib/html/client/views/PhasesView.js
  - server/lib/html/client/views/SprintsView.js
  - server/lib/html/css.js
requirements: [DSH-1, DSH-2, DSH-3]
must_haves:
  truths:
    - User clicks status / milestone / date filter chips and the visible list narrows
    - Active filters appear in location.hash and reloading the URL restores them
    - Clearing all filters returns the view to its full unfiltered list with no stale chips
  artifacts:
    - server/lib/html/client/components/FilterChips.js — interactive filter-chip component
  key_links:
    - FilterChips writes location.hash via applyFilters() from filter-state.js (34.1)
    - PhasesView and SprintsView read the `filters` prop (from App.js, 34.1) to filter their lists
    - StatusSummaryBar (34.1) is mounted at the top of both views
---

<objective>
Make the Phase 34 summary bar and filters interactive. Build a `FilterChips`
component whose chips toggle status / milestone / date filters, persist them into
`location.hash` via `filter-state.js`, and mount both `FilterChips` and the
`StatusSummaryBar` (from 34.1) into `PhasesView` and `SprintsView`, applying the
active `filters` prop to each view's rendered list.

Purpose: completes DSH-1 (summary bar visible in views), DSH-2 (filter chips narrow
the list) and DSH-3 (filters persist in the URL).
Output: one new component, two view edits, CSS for filter chips.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
</context>

<tasks>

<task id="34.2.1" type="auto">
<title>Build FilterChips component — status/milestone/date toggle chips</title>
<read_first>
- server/lib/html/client/filter-state.js (parseFilters, serialiseFilters, applyFilters from 34.1)
- server/lib/html/client/util.js (lines 77-86 — chip status normalisation)
- server/lib/html/client/components/shared.js (lines 26-34 — Chip; class naming convention)
- server/lib/html/css.js (lines 922-942 — `.filter-bar` block to append after)
</read_first>
<files>
server/lib/html/client/components/FilterChips.js
server/lib/html/css.js
</files>
<interfaces>
`applyFilters(viewPath, filters)` from filter-state.js returns the hash body string.
Route filters object shape: `{ status, milestone, date }` (all strings, '' when unset).
The active view path is derivable from `location.hash.slice(1).split('?')[0]`.
</interfaces>
<action>
Create `server/lib/html/client/components/FilterChips.js`:

- Import `html` from `../preact.js`, `applyFilters` from `../filter-state.js`.
- Export `export function FilterChips({ filters, statusOptions, milestoneOptions, dateOptions })`.
  `filters` is the route filters object. The three `*Options` props are arrays of
  `{ value, label }`; the caller (each view) supplies them so FilterChips stays
  generic.
- Render a `<div class="filter-chips">`. For each of the three dimensions render a
  `<div class="filter-chip-group">` containing one `<button class="filter-chip">`
  per option. A chip whose `value` equals the current `filters[dimension]` gets the
  extra class `active` (`class="filter-chip active"`).
- On chip click: compute the next filters object — toggling, so clicking an already-
  active chip clears that dimension (set to `''`), clicking an inactive chip sets it.
  Then update the URL: `const path = location.hash.slice(1).split('?')[0] || 'overview';`
  then `location.hash = applyFilters(path, next);`. Do NOT mutate the `filters` prop;
  build a fresh object. The `hashchange` listener in App.js (App.js:73-77) re-renders.
- When all three dimensions are empty, also render a `<button class="filter-chip-clear">`
  that is disabled; when at least one filter is active the clear button is enabled and
  clicking it sets the hash to `applyFilters(path, {status:'',milestone:'',date:''})`.
- No `style` attribute, no `React.FC`.

In `server/lib/html/css.js`, append a `/* ── Filter chips ── */` block after the
`.summary-count-chip` block added in 34.1.3. Add:
  - `.filter-chips` — flex row, `gap: var(--space-3)`, `flex-wrap: wrap`,
    `padding: var(--space-3) var(--space-4)`, `border-bottom: 1px solid var(--border-subtle)`.
  - `.filter-chip-group` — flex row, `gap: var(--space-1)`, `align-items: center`.
  - `.filter-chip` — `font-size: var(--text-2xs)`, `padding: 3px var(--space-3)`,
    `border-radius: var(--radius-4)`, `border: 1px solid var(--border-default)`,
    `background: var(--bg-input)`, `color: var(--text-secondary)`, `cursor: pointer`,
    `transition: border-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease)`.
  - `.filter-chip:hover` — `border-color: var(--accent-primary)`.
  - `.filter-chip.active` — `background: var(--accent-primary)`, `color: #fff`,
    `border-color: var(--accent-primary)`.
  - `.filter-chip-clear` — same base as `.filter-chip` plus `color: var(--text-muted)`;
    `.filter-chip-clear:disabled { opacity: 0.4; cursor: default; }`.
</action>
<acceptance_criteria>
- `test -f server/lib/html/client/components/FilterChips.js` exits 0
- `grep -q 'export function FilterChips' server/lib/html/client/components/FilterChips.js`
- `grep -q "import { applyFilters } from '../filter-state.js'" server/lib/html/client/components/FilterChips.js`
- `grep -q 'filter-chip-clear' server/lib/html/client/components/FilterChips.js`
- `! grep -q 'React.FC' server/lib/html/client/components/FilterChips.js`
- `! grep -q 'style=' server/lib/html/client/components/FilterChips.js`
- `grep -q '.filter-chip' server/lib/html/css.js && grep -q '.filter-chip.active' server/lib/html/css.js`
- `node --input-type=module --check < server/lib/html/client/components/FilterChips.js` exits 0
- `node --check server/lib/html/css.js` exits 0
</acceptance_criteria>
<verify>
<automated>
test -f server/lib/html/client/components/FilterChips.js && \
grep -q 'export function FilterChips' server/lib/html/client/components/FilterChips.js && \
grep -q "import { applyFilters } from '../filter-state.js'" server/lib/html/client/components/FilterChips.js && \
grep -q 'filter-chip-clear' server/lib/html/client/components/FilterChips.js && \
! grep -q 'React.FC' server/lib/html/client/components/FilterChips.js && \
! grep -q 'style=' server/lib/html/client/components/FilterChips.js && \
grep -q '.filter-chip' server/lib/html/css.js && \
grep -q '.filter-chip.active' server/lib/html/css.js && \
node --input-type=module --check < server/lib/html/client/components/FilterChips.js && \
node --check server/lib/html/css.js && echo PASS
</automated>
</verify>
<done>FilterChips renders toggleable chips that write the active filter set into location.hash.</done>
<evidence>creates: server/lib/html/client/components/FilterChips.js — no filter-chip component exists; the only filtering today is a free-text `<input class="filter-input">` in PhasesView (PhasesView.js:167-170) and SprintsView (SprintsView.js:161-164). css.js has `.filter-bar`/`.filter-input` (css.js:922-942) but no `.filter-chip`.</evidence>
</task>

<task id="34.2.2" type="auto">
<title>Mount summary bar + filter chips into PhasesView and apply the filters prop</title>
<read_first>
- server/lib/html/client/views/PhasesView.js (lines 120-184 — PhasesView list mode, the existing free-text filter)
- server/lib/html/client/components/StatusSummaryBar.js (from 34.1.3)
- server/lib/html/client/components/FilterChips.js (from 34.2.1)
- server/lib/html/client/util.js (lines 77-86 — chip normalisation for status matching)
</read_first>
<files>
server/lib/html/client/views/PhasesView.js
</files>
<interfaces>
`PhasesView` is called as `<${PhasesView} subId=${subId} filters=${filters} />` after
34.1.2. Current signature: `export function PhasesView({ subId })` (PhasesView.js:120).
Phase objects: `{ id, name, status, sprints, completed_at }`. `chip(status).cls`
normalises status to `complete|active|blocked|planned|todo|other`.
</interfaces>
<action>
Edit `server/lib/html/client/views/PhasesView.js`:

1. Add to imports: `StatusSummaryBar` from `../components/StatusSummaryBar.js` and
   `FilterChips` from `../components/FilterChips.js`. Add `chip` to the existing
   `../util.js` import.
2. Change the signature at PhasesView.js:120 to `export function PhasesView({ subId, filters })`.
   In detail mode (subId branch) ignore `filters` — it only applies to list mode.
3. In list mode, normalise the incoming prop: `const f = filters || { status:'', milestone:'', date:'' };`.
4. Build the three option lists for `FilterChips`:
   - status: derive distinct `chip(p.status).cls` values present across `phases`,
     mapped to `{ value: cls, label: cls }`.
   - milestone: a small fixed list `[{value:'M1',label:'M1'},{value:'M2',label:'M2'},{value:'M3',label:'M3'}]`
     (the milestones in ROADMAP.md). Phases do not carry a milestone field, so the
     milestone filter narrows by phase-id range: M1 = phases 1–19, M2 = 20–33,
     M3 = 34+. Implement that mapping as a local `phaseMilestone(id)` helper.
   - date: `[{value:'has-completed',label:'Completed'},{value:'no-completed',label:'In progress'}]`.
5. Apply the active `filters` to the `filtered` array (PhasesView.js:159-162) AFTER
   the existing free-text filter — keep the text filter working. Add:
   - if `f.status`: keep phases where `chip(p.status).cls === f.status`
   - if `f.milestone`: keep phases where `phaseMilestone(p.id) === f.milestone`
   - if `f.date === 'has-completed'`: keep phases with a truthy `p.completed_at`;
     if `f.date === 'no-completed'`: keep phases without `p.completed_at`.
6. In the returned markup (PhasesView.js:164-183), insert `<${StatusSummaryBar}/>`
   directly after `<div class="view-title">Phases</div>`, then `<${FilterChips}
   filters=${f} statusOptions=${...} milestoneOptions=${...} dateOptions=${...}/>`
   directly before the existing `<div class="filter-bar">` free-text input. Do not
   remove the free-text input.
</action>
<acceptance_criteria>
- `grep -q "import { StatusSummaryBar }" server/lib/html/client/views/PhasesView.js`
- `grep -q "import { FilterChips }" server/lib/html/client/views/PhasesView.js`
- `grep -q 'function PhasesView({ subId, filters })' server/lib/html/client/views/PhasesView.js`
- `grep -q 'phaseMilestone' server/lib/html/client/views/PhasesView.js`
- `grep -q '<${StatusSummaryBar}' server/lib/html/client/views/PhasesView.js`
- `node --input-type=module --check < server/lib/html/client/views/PhasesView.js` exits 0
</acceptance_criteria>
<verify>
<automated>
grep -q 'import { StatusSummaryBar }' server/lib/html/client/views/PhasesView.js && \
grep -q 'import { FilterChips }' server/lib/html/client/views/PhasesView.js && \
grep -q 'function PhasesView({ subId, filters })' server/lib/html/client/views/PhasesView.js && \
grep -q 'phaseMilestone' server/lib/html/client/views/PhasesView.js && \
grep -q '<${StatusSummaryBar}' server/lib/html/client/views/PhasesView.js && \
node --input-type=module --check < server/lib/html/client/views/PhasesView.js && echo PASS
</automated>
</verify>
<done>PhasesView shows the summary bar and filter chips, and the phase list narrows to the active filter set.</done>
<evidence>lines: server/lib/html/client/views/PhasesView.js:120 (signature), 159-162 (existing free-text filter), 164-183 (list-mode markup with `view-title` and `filter-bar`). Phase ids → milestone ranges traced from ROADMAP.md:5-6 (M1 phases 01-19, M2 20-33) and ROADMAP.md:273 (M3 phase 34+).</evidence>
</task>

<task id="34.2.3" type="auto">
<title>Mount summary bar + filter chips into SprintsView and apply the filters prop</title>
<read_first>
- server/lib/html/client/views/SprintsView.js (lines 116-178 — SprintsView list mode + existing free-text filter)
- server/lib/html/client/components/StatusSummaryBar.js (from 34.1.3)
- server/lib/html/client/components/FilterChips.js (from 34.2.1)
- server/lib/html/client/views/PhasesView.js (the 34.2.2 pattern — mirror it exactly)
- server/lib/html/client/util.js (lines 51-86 — allSprints, chip)
</read_first>
<files>
server/lib/html/client/views/SprintsView.js
</files>
<interfaces>
`SprintsView` is called as `<${SprintsView} subId=${subId} filters=${filters} />`.
Current signature: `export function SprintsView({ subId })` (SprintsView.js:116).
Sprint objects (via `allSprints`): `{ id, status, goal, phaseId, phaseName,
started_at, completed_at }`.
</interfaces>
<action>
Edit `server/lib/html/client/views/SprintsView.js`, mirroring the PhasesView pattern
from 34.2.2:

1. Add imports: `StatusSummaryBar` from `../components/StatusSummaryBar.js`,
   `FilterChips` from `../components/FilterChips.js`, and add `chip` to the existing
   `../util.js` import.
2. Change the signature at SprintsView.js:116 to
   `export function SprintsView({ subId, filters })`. Detail mode ignores `filters`.
3. In list mode add `const f = filters || { status:'', milestone:'', date:'' };`.
4. Build option lists for `FilterChips`:
   - status: distinct `chip(s.status).cls` across `sprints`.
   - milestone: fixed `M1/M2/M3` list; sprints carry `phaseId`, so reuse the
     `phaseMilestone(phaseId)` range mapping (M1 = 1–19, M2 = 20–33, M3 = 34+).
     Define the same local helper as in PhasesView.
   - date: `[{value:'has-completed',label:'Completed'},{value:'no-completed',label:'In progress'}]`,
     matched against `s.completed_at`.
5. Apply `f` to the `filtered` array (SprintsView.js:149-156) after the existing
   free-text filter: status via `chip(s.status).cls === f.status`; milestone via
   `phaseMilestone(s.phaseId) === f.milestone`; date via `s.completed_at` presence.
6. Insert `<${StatusSummaryBar}/>` after `<div class="view-title">Sprints</div>`
   and `<${FilterChips} filters=${f} .../>` before the existing
   `<div class="filter-bar">`. Keep the free-text input.
</action>
<acceptance_criteria>
- `grep -q "import { StatusSummaryBar }" server/lib/html/client/views/SprintsView.js`
- `grep -q "import { FilterChips }" server/lib/html/client/views/SprintsView.js`
- `grep -q 'function SprintsView({ subId, filters })' server/lib/html/client/views/SprintsView.js`
- `grep -q 'phaseMilestone' server/lib/html/client/views/SprintsView.js`
- `grep -q '<${StatusSummaryBar}' server/lib/html/client/views/SprintsView.js`
- `node --input-type=module --check < server/lib/html/client/views/SprintsView.js` exits 0
- `node server/dashboard.js` boots clean within 3s
</acceptance_criteria>
<verify>
<automated>
grep -q 'import { StatusSummaryBar }' server/lib/html/client/views/SprintsView.js && \
grep -q 'import { FilterChips }' server/lib/html/client/views/SprintsView.js && \
grep -q 'function SprintsView({ subId, filters })' server/lib/html/client/views/SprintsView.js && \
grep -q 'phaseMilestone' server/lib/html/client/views/SprintsView.js && \
grep -q '<${StatusSummaryBar}' server/lib/html/client/views/SprintsView.js && \
node --input-type=module --check < server/lib/html/client/views/SprintsView.js && \
( node server/dashboard.js & SP=$!; sleep 3; kill $SP 2>/dev/null; echo PASS )
</automated>
</verify>
<done>SprintsView shows the summary bar and filter chips, and the sprint list narrows to the active filter set.</done>
<evidence>lines: server/lib/html/client/views/SprintsView.js:116 (signature), 149-156 (existing free-text filter), 158-177 (list-mode markup with `view-title` and `filter-bar`). Sprint objects carry `phaseId` via allSprints (util.js:51-55), used for the milestone range mapping.</evidence>
</task>

</tasks>

<verification>
- `node server/dashboard.js` starts clean on :7717
- The summary bar renders count chips at the top of the Phases and Sprints views
- Clicking a status / milestone / date chip narrows the visible list and writes the filter into `location.hash`
- Reloading a URL with a `?status=...&milestone=...&date=...` query restores the same filter set and chip highlight
- The Clear button removes all filters and the list returns to full with no active chip
- Free-text filter still works alongside chip filters; no `style` attribute, no `React.FC`, no new dependency
</verification>

<success_criteria>
- DSH-1: count-chip summary bar visible in the Phases and Sprints views
- DSH-2: status / milestone / date filter chips narrow the visible list
- DSH-3: active filters serialise into `location.hash` and survive a reload / are shareable
- All modified files pass `node --input-type=module --check` / `node --check`
</success_criteria>

<output>
Create `.planning/phases/34-status-summary-bar-with-multi-attribute-filtering/34-2-SUMMARY.md`
</output>
