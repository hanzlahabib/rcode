---
phase: 34-status-summary-bar-with-multi-attribute-filtering
plan_number: 1
wave: 1
depends_on: []
autonomous: true
files_modified:
  - server/lib/html/client/filter-state.js
  - server/lib/html/client/components/App.js
  - server/lib/html/client/components/StatusSummaryBar.js
  - server/lib/html/css.js
requirements: [DSH-1, DSH-3]
must_haves:
  truths:
    - User sees a row of count chips for phases, sprints, and sessions each grouped by status
    - A filter set encoded in location.hash query string survives a page reload
  artifacts:
    - server/lib/html/client/filter-state.js — parse/serialise filter state to and from the hash query string
    - server/lib/html/client/components/StatusSummaryBar.js — count-chip summary bar component
  key_links:
    - App.js parseHash() must also expose the filter query object so views can read it
    - StatusSummaryBar reads phases from useStore() and activeSessions for the session counts
---

<objective>
Build the foundation for the Phase 34 status summary bar and URL-persisted filters:
a `filter-state.js` module that serialises/deserialises filter state into the
`location.hash` query string, an extension of the existing `App.js` `parseHash`
router to expose that filter state, and a `StatusSummaryBar` component that renders
aggregate count chips for phases / sprints / sessions grouped by status.

Purpose: DSH-1 (count chips) and DSH-3 (URL-persisted filters) — the second sprint
(34.2) builds the interactive filter chips on top of this state layer.
Output: one new state module, one new component, App.js router extension, CSS classes.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
</context>

<tasks>

<task id="34.1.1" type="auto">
<title>Create filter-state.js — hash query-string serialise/parse module</title>
<read_first>
- server/lib/html/client/components/App.js (lines 57-66 — parseHash; the hash format `view` or `view/subId`)
- server/lib/html/client/util.js (module style — pure stateless exported functions)
</read_first>
<files>
server/lib/html/client/filter-state.js
</files>
<interfaces>
App.js parseHash currently: `location.hash.slice(1)` → `{ view, subId }`. Hash form is
`#view` or `#view/subId`. This task introduces a query suffix: `#view/subId?status=done&milestone=M3&date=2026-05`.
</interfaces>
<action>
Create `server/lib/html/client/filter-state.js`. It owns the filter query string only —
never the `view`/`subId` segment. Export exactly three pure functions:

1. `export function parseFilters(hash)` — takes a raw hash string (with or without
   leading `#`). Splits on the first `?`; everything after `?` is parsed with
   `URLSearchParams`. Returns a plain object `{ status, milestone, date }` where each
   value is a string or `''` when absent. Recognise ONLY the keys `status`,
   `milestone`, `date` — ignore any others. Never throw on malformed input; return
   all-empty object on a missing `?`.
2. `export function serialiseFilters(filters)` — takes `{ status, milestone, date }`,
   builds a `URLSearchParams`, appends only keys whose value is a non-empty string,
   returns the query string WITHOUT a leading `?` (empty string when no active
   filter). Keys must be appended in fixed order `status`, `milestone`, `date` so
   the serialised form is stable.
3. `export function applyFilters(viewPath, filters)` — takes the view path segment
   (e.g. `phases` or `sprints/3`) and a filters object, returns the full hash body
   `viewPath` or `viewPath?query`. Used by FilterChips in 34.2 to update
   `location.hash` without disturbing the view segment.

Use `URLSearchParams` (modern, no deps). No `var`, no string-concat URL building.
Add a JSDoc block to each function. File header comment must state the module owns
the `?status=&milestone=&date=` filter query and nothing else.
</action>
<acceptance_criteria>
- `test -f server/lib/html/client/filter-state.js` exits 0
- `grep -q 'export function parseFilters' server/lib/html/client/filter-state.js`
- `grep -q 'export function serialiseFilters' server/lib/html/client/filter-state.js`
- `grep -q 'export function applyFilters' server/lib/html/client/filter-state.js`
- `grep -q 'URLSearchParams' server/lib/html/client/filter-state.js`
- `grep -Lq 'var ' server/lib/html/client/filter-state.js` (no `var` keyword)
- `node --input-type=module --check < server/lib/html/client/filter-state.js` exits 0
</acceptance_criteria>
<verify>
<automated>
test -f server/lib/html/client/filter-state.js && \
grep -q 'export function parseFilters' server/lib/html/client/filter-state.js && \
grep -q 'export function serialiseFilters' server/lib/html/client/filter-state.js && \
grep -q 'export function applyFilters' server/lib/html/client/filter-state.js && \
grep -q 'URLSearchParams' server/lib/html/client/filter-state.js && \
! grep -q '\bvar ' server/lib/html/client/filter-state.js && \
node --input-type=module --check < server/lib/html/client/filter-state.js && echo PASS
</automated>
</verify>
<done>filter-state.js round-trips a `{status,milestone,date}` object through the hash query string.</done>
<evidence>creates: server/lib/html/client/filter-state.js — no existing module owns hash query parsing; App.js parseHash (App.js:57-66) only splits on `/` and does not touch `?`. util.js holds only data helpers (util.js:11-186), not routing.</evidence>
</task>

<task id="34.1.2" type="auto">
<title>Extend App.js parseHash to expose filter state and pass it to views</title>
<read_first>
- server/lib/html/client/components/App.js (lines 57-77 — parseHash + the hashchange useEffect; lines 178-209 — PreactView render)
- server/lib/html/client/filter-state.js (the parseFilters function from task 34.1.1)
</read_first>
<files>
server/lib/html/client/components/App.js
</files>
<interfaces>
Current `parseHash()` returns `{ view, subId }` (App.js:58-66). Current render passes
`subId` to the active view: `html\`<${PreactView} subId=${subId} />\`` (App.js:203).
</interfaces>
<action>
Edit `server/lib/html/client/components/App.js`:

1. Add `import { parseFilters } from '../filter-state.js';` next to the other imports
   (App.js:15-33 import block).
2. In `parseHash()` (App.js:58-66): after computing `view` and `subId`, strip any
   `?query` from `subId` BEFORE the `ALL_VIEWS` check by also stripping `?` from
   `raw`. Compute `filters` by calling `parseFilters(location.hash)`. The `subId`
   returned must NOT contain the `?query` part — split `subId` on `?` and keep
   `[0]` (or null when there is no subId). Return `{ view, subId, filters }`.
3. The existing `hashchange` listener (App.js:73-77) already calls
   `setRoute(parseHash())` — no change needed; it will now also pick up filter
   changes since `parseFilters` re-reads `location.hash`.
4. In the render (App.js:203), pass filters through:
   `html\`<${PreactView} subId=${subId} filters=${filters} />\``. Destructure
   `filters` from the route state at App.js:71 alongside `view`/`subId`.

Do NOT add a routing library. Do NOT change the 30s refresh or theme logic.
</action>
<acceptance_criteria>
- `grep -q "import { parseFilters } from '../filter-state.js'" server/lib/html/client/components/App.js`
- `grep -q 'filters=\${filters}' server/lib/html/client/components/App.js`
- `grep -q 'parseFilters(location.hash)' server/lib/html/client/components/App.js`
- `node --input-type=module --check < server/lib/html/client/components/App.js` exits 0
- `node server/dashboard.js` started in background prints a listening line and does not crash within 3s
</acceptance_criteria>
<verify>
<automated>
grep -q "import { parseFilters } from '../filter-state.js'" server/lib/html/client/components/App.js && \
grep -q 'filters=\${filters}' server/lib/html/client/components/App.js && \
grep -q 'parseFilters(location.hash)' server/lib/html/client/components/App.js && \
node --input-type=module --check < server/lib/html/client/components/App.js && \
( node server/dashboard.js & SP=$!; sleep 3; kill $SP 2>/dev/null; echo PASS )
</automated>
</verify>
<done>App.js parseHash returns `{view, subId, filters}` and every view receives a `filters` prop.</done>
<evidence>lines: server/lib/html/client/components/App.js:57-66 (parseHash), 71 (route destructure), 203 (PreactView render). subId currently never strips `?` so a query suffix would leak into subId — this task fixes that.</evidence>
</task>

<task id="34.1.3" type="auto">
<title>Build StatusSummaryBar component with phase/sprint/session count chips</title>
<read_first>
- server/lib/html/client/components/shared.js (lines 26-34 — Chip component and `status-chip` class usage)
- server/lib/html/client/util.js (lines 51-86 — allSprints, chip helper)
- server/lib/html/client/store.js (lines 16-40 — phases, activeSessions store fields)
- server/lib/html/client/orchestrator.js (lines 99-129 — activeSessions session shape: `{storyId, status, ...}`)
- server/lib/html/css.js (lines 944-949 — existing `.badge` class for visual reference)
</read_first>
<files>
server/lib/html/client/components/StatusSummaryBar.js
server/lib/html/css.js
</files>
<interfaces>
`useStore()` returns state with `phases` (each `{id, name, status, sprints}`) and
`activeSessions` (each `{storyId, status, startTime}`). `allSprints(phases)` from
util.js flattens sprints. `chip(status)` from util.js returns `{cls, label}`.
</interfaces>
<action>
Create `server/lib/html/client/components/StatusSummaryBar.js`:

- Import `html` from `../preact.js`, `useStore` from `../store.js`, `allSprints` and
  `chip` from `../util.js`.
- Export `export function StatusSummaryBar()`. Read `S = useStore()`.
- Compute three count maps. Phases: group `S.phases` by normalised status using the
  same normalisation as `chip()` — count per `cls` value (`complete`, `active`,
  `blocked`, `planned`, `todo`, `other`). Sprints: same on `allSprints(S.phases)`.
  Sessions: group `S.activeSessions` by `status` (`running`, `exited`, etc.).
- Render a `<div class="summary-bar">` containing three groups, each a
  `<div class="summary-group">` with a `<span class="summary-group-label">` (text:
  `Phases`, `Sprints`, `Sessions`) followed by one `<span class="summary-count-chip {cls}">`
  per non-zero status, showing `{count} {label}`. Suppress a group entirely when its
  source array is empty (render nothing for that group). When `S.activeSessions` is
  empty, omit the Sessions group.
- No `style` attribute — all visuals via className. No `React.FC`, plain function.

In `server/lib/html/css.js`, append a `/* ── Status summary bar ── */` block AFTER
the existing `.filter-bar` block (after css.js:942). Add:
  - `.summary-bar` — flex row, `gap: var(--space-4)`, `flex-wrap: wrap`,
    `padding: var(--space-3) var(--space-4)`, `border-bottom: 1px solid var(--border-subtle)`.
  - `.summary-group` — flex row, `align-items: center`, `gap: var(--space-2)`.
  - `.summary-group-label` — `font-size: var(--text-2xs)`, `color: var(--text-muted)`,
    `text-transform: uppercase`, `letter-spacing: 0.04em`.
  - `.summary-count-chip` — `display: inline-flex`, `gap: 4px`, `font-size: var(--text-2xs)`,
    `padding: 2px var(--space-2)`, `border-radius: var(--radius-3)`,
    `background: var(--bg-elev-3)`, `border: 1px solid var(--border-subtle)`.
  - Status accents reusing existing accent tokens: `.summary-count-chip.complete { color: var(--accent-green); }`,
    `.summary-count-chip.active { color: var(--accent-blue); }`,
    `.summary-count-chip.blocked { color: var(--accent-red); }`,
    `.summary-count-chip.planned, .summary-count-chip.todo { color: var(--text-secondary); }`.
</action>
<acceptance_criteria>
- `test -f server/lib/html/client/components/StatusSummaryBar.js` exits 0
- `grep -q 'export function StatusSummaryBar' server/lib/html/client/components/StatusSummaryBar.js`
- `grep -q "summary-count-chip" server/lib/html/client/components/StatusSummaryBar.js`
- `! grep -q 'React.FC' server/lib/html/client/components/StatusSummaryBar.js`
- `! grep -q 'style=' server/lib/html/client/components/StatusSummaryBar.js`
- `grep -q '.summary-bar' server/lib/html/css.js && grep -q '.summary-count-chip' server/lib/html/css.js`
- `node --input-type=module --check < server/lib/html/client/components/StatusSummaryBar.js` exits 0
- `node server/dashboard.js` boots and serves css.js without a syntax error
</acceptance_criteria>
<verify>
<automated>
test -f server/lib/html/client/components/StatusSummaryBar.js && \
grep -q 'export function StatusSummaryBar' server/lib/html/client/components/StatusSummaryBar.js && \
grep -q 'summary-count-chip' server/lib/html/client/components/StatusSummaryBar.js && \
! grep -q 'React.FC' server/lib/html/client/components/StatusSummaryBar.js && \
! grep -q 'style=' server/lib/html/client/components/StatusSummaryBar.js && \
grep -q '.summary-bar' server/lib/html/css.js && \
grep -q '.summary-count-chip' server/lib/html/css.js && \
node --input-type=module --check < server/lib/html/client/components/StatusSummaryBar.js && \
node --check server/lib/html/css.js && \
( node server/dashboard.js & SP=$!; sleep 3; kill $SP 2>/dev/null; echo PASS )
</automated>
</verify>
<done>StatusSummaryBar renders count chips for phases, sprints, and sessions grouped by status.</done>
<evidence>creates: server/lib/html/client/components/StatusSummaryBar.js — no summary-bar component exists; shared.js only has the per-item Chip (shared.js:31-34). css.js has `.filter-bar` at css.js:923 but no `.summary-bar`. Session shape confirmed at orchestrator.js:172-183 (`storyId, status, startTime`).</evidence>
</task>

</tasks>

<verification>
- `node server/dashboard.js` starts clean on :7717 with no console error
- `filter-state.js` parse → serialise → parse round-trips a `{status,milestone,date}` object
- App.js `parseHash` returns a third `filters` key and views receive a `filters` prop
- StatusSummaryBar renders phase/sprint/session count chips grouped by status
- No `style` attribute, no `React.FC`, no new dependency, no server write endpoint added
</verification>

<success_criteria>
- DSH-1 foundation: a count-chip summary bar component exists (mounted into views in 34.2)
- DSH-3 foundation: filter state serialises to and parses from the URL hash query string
- All four files pass `node --input-type=module --check` / `node --check`
</success_criteria>

<output>
Create `.planning/phases/34-status-summary-bar-with-multi-attribute-filtering/34-1-SUMMARY.md`
</output>
