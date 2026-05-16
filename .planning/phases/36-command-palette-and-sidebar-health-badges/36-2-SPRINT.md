---
phase: 36-command-palette-and-sidebar-health-badges
plan_number: 2
wave: 2
depends_on: [36-1]
sequential: true
sequential_after: 36-1
autonomous: true
files_modified:
  - server/lib/html/client/components/Sidebar.js
  - server/lib/html/css.js
requirements:
  - DSH-5
must_haves:
  truths:
    - The sidebar shows a badge with the count of active (running) orchestration sessions
    - The sidebar shows a badge with the count of blockers
    - Both badge counts update reactively as sessions start/stop and blockers change, with no manual refresh
    - A badge with a zero count is visually de-emphasised or hidden, not shown as an alarming "0"
  artifacts:
    - server/lib/html/client/components/Sidebar.js renders a health-badges block
  key_links:
    - Sidebar reads activeSessions and blockers from store.js via useStore — no prop drilling, no manual poll
    - The active-session count counts only sessions with status === 'running'
---

<objective>
Add live health badges to the dashboard sidebar: one showing the count of running
orchestration sessions, one showing the count of blockers. Both read reactively from the
store so they update on every session poll and state refresh without a manual reload.
Purpose: DSH-5 — at-a-glance project health from the sidebar.
Output: a health-badges block in Sidebar.js plus its CSS.
</objective>

<sequencing>
This sprint is `wave: 2` and `depends_on: [36-1]`. It runs SEQUENTIALLY after 36-1, never
in parallel. Reason: both sprints append CSS to `server/lib/html/css.js` immediately before
the same closing `</style>` — running them concurrently would clobber that region. 36-1
must land its CSS first; 36-2 then appends after it. App.js is NOT in this sprint's
`files_modified` because task 36-2.2 step 1 proves App.js needs no edit (it already writes
`blockers` into the store at App.js:144) — see the hard precondition in 36-2.2.
</sequencing>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<constraints>
- Client is Preact via htm + ESM CDN, no build step. No React.FC. No new dependencies.
- No inline `style` attribute — use className + css.js classes.
- Badges read `activeSessions` and `blockers` from store.js. No new poll, no new endpoint,
  no change to server/dashboard.js.
- Do NOT edit server/lib/html/client/components/App.js — 36-2.2 step 1 verifies it already
  carries `blockers` into the store; if that verification fails, raise a BLOCKER rather
  than silently editing App.js (App.js is owned by sprint 36-1).
</constraints>

<tasks>

<task id="36-2.1" type="auto">
<title>Render live health badges in the Sidebar</title>
<read_first>
- server/lib/html/client/components/Sidebar.js (whole file, 73 lines — NAV_SECTIONS + Sidebar)
- server/lib/html/client/store.js (state fields: activeSessions is [], blockers is [], lines 16-40)
- server/lib/html/client/orchestrator.js (session shape — status === 'running' marks a live session, lines 106-129)
- server/lib/html/client/icons-client.js (Icon component + available names: 'activity', 'alert-triangle')
</read_first>
<files>
server/lib/html/client/components/Sidebar.js
</files>
<interfaces>
import { useStore } from '../store.js';
// useStore() returns { activeSessions: [...], blockers: [...], ... }
// activeSessions entry: { storyId, status, ... } — 'running' === live
// blockers: array of strings or { title } objects (scanner.js:235-237)
export function Sidebar({ activeView, projectName }) { ... }   // current signature
</interfaces>
<action>
1. Add `import { useStore } from '../store.js';` to Sidebar.js imports.
2. Inside `Sidebar(...)`, call `const { activeSessions, blockers } = useStore();` so the
   component subscribes to the store and re-renders on every setState.
3. Compute:
   - `const sessionCount = (activeSessions || []).filter(s => s.status === 'running').length;`
   - `const blockerCount = (blockers || []).length;`
4. Render a `div.sidebar-health` block between the `.sidebar-project` div and the `<nav>`.
   It contains two `span.health-badge` elements:
   - Sessions badge: `<${Icon} name="activity" size=${12}/>` + sessionCount + " active".
     Add class ` health-badge--zero` when `sessionCount === 0`.
   - Blockers badge: `<${Icon} name="alert-triangle" size=${12}/>` + blockerCount + " blocked".
     Add class ` health-badge--alert` when `blockerCount > 0`, else ` health-badge--zero`.
   Use a `title` attribute on each badge for the full description.
Keep the existing NAV_SECTIONS markup and nav rendering unchanged. No inline `style`.
</action>
<acceptance_criteria>
- `grep -q "import { useStore }" server/lib/html/client/components/Sidebar.js` exits 0
- `grep -q "sidebar-health" server/lib/html/client/components/Sidebar.js` exits 0
- `grep -q "status === 'running'" server/lib/html/client/components/Sidebar.js` exits 0
- `grep -q "blockers" server/lib/html/client/components/Sidebar.js` exits 0
- Sidebar.js has no `style=` attribute: `grep -q "style=" server/lib/html/client/components/Sidebar.js` exits 1
- `node --input-type=module --check < server/lib/html/client/components/Sidebar.js` exits 0
</acceptance_criteria>
<verify>
<automated>
grep -q "import { useStore }" server/lib/html/client/components/Sidebar.js && \
grep -q "sidebar-health" server/lib/html/client/components/Sidebar.js && \
grep -q "status === 'running'" server/lib/html/client/components/Sidebar.js && \
grep -q "blockers" server/lib/html/client/components/Sidebar.js && \
! grep -q "style=" server/lib/html/client/components/Sidebar.js && \
node --input-type=module --check < server/lib/html/client/components/Sidebar.js
</automated>
</verify>
<done>The sidebar shows a live active-session badge and a live blocker badge that update with the store.</done>
<evidence>
lines: server/lib/html/client/components/Sidebar.js:49-73 (Sidebar function — currently takes only activeView/projectName, no store subscription)
lines: server/lib/html/client/store.js:24,31 (`blockers` and `activeSessions` store fields the badges read)
lines: server/lib/html/client/orchestrator.js:106-129 (isSessionRunning/runningTotal — confirms `status === 'running'` is the live-session predicate)
lines: server/lib/scanner.js:235-237 (blockers normalised to string|{title} array — `.length` is a valid count)
</evidence>
</task>

<task id="36-2.2" type="auto">
<title>Add health-badge CSS to css.js (App.js confirmed no-edit)</title>
<read_first>
- server/lib/html/client/components/App.js (fetchAndRerender setState call, lines 137-148 — VERIFY it already sets blockers)
- server/lib/html/css.js (sidebar-project / nav-section block at lines 164-206, run-badge at line 1974, file ends `</style>` + module.exports at 2265-2268)
- server/lib/html/client/components/Sidebar.js (class names from 36-2.1)
</read_first>
<files>
server/lib/html/css.js
</files>
<interfaces>
// css.js renderCss() returns one template string ending with `</style>`.
// App.js fetchAndRerender already writes blockers into the store (App.js:144) — this is
// a HARD PRECONDITION, not an open question (see action step 1).
</interfaces>
<action>
1. HARD PRECONDITION — App.js needs NO edit. Read App.js lines 137-148 and confirm
   `fetchAndRerender` already passes `blockers: newState.raw.blockers || []` into setState
   (it does, at App.js:144) and that the boot seed in store.js already includes `blockers`
   (store.js:24). Both hold today. Therefore:
   - DO NOT modify server/lib/html/client/components/App.js. It is not in this sprint's
     `files_modified` and is owned by sprint 36-1.
   - If — and only if — this verification FAILS (App.js does not set blockers), STOP and
     raise a BLOCKER. Do not silently edit App.js.
   - Record in the SUMMARY that App.js was verified to already propagate `blockers` and
     was intentionally left untouched.
2. Append a CSS block to css.js before the closing `</style>` for the Sidebar health
   badges, using existing design tokens only (var(--text-2xs), var(--text-muted),
   var(--space-*), var(--radius-2), var(--bg-elev-2), var(--accent-amber),
   var(--accent-green), var(--border-subtle)):
   - `.sidebar-health` — flex row, gap, padding matching `.sidebar-project` horizontal
     padding, bottom border var(--border-subtle).
   - `.health-badge` — flex row, align-items center, gap, var(--text-2xs),
     var(--radius-2), small padding, var(--bg-elev-2) background, var(--text-secondary).
   - `.health-badge--alert` — color var(--accent-amber) (or a danger token) to flag
     non-zero blockers.
   - `.health-badge--zero` — var(--text-muted), reduced opacity so a zero count is
     de-emphasised, not alarming.
No inline styles, no new tokens.
</action>
<acceptance_criteria>
- `grep -q ".sidebar-health" server/lib/html/css.js` exits 0
- `grep -q ".health-badge--alert" server/lib/html/css.js` exits 0
- `grep -q ".health-badge--zero" server/lib/html/css.js` exits 0
- `grep -q "blockers" server/lib/html/client/components/App.js` exits 0  (App already passes blockers — verification only, no edit)
- `node -e "require('./server/lib/html/css.js').renderCss()"` exits 0
- `node server/dashboard.js` boots clean
</acceptance_criteria>
<verify>
<automated>
grep -q ".sidebar-health" server/lib/html/css.js && \
grep -q ".health-badge--alert" server/lib/html/css.js && \
grep -q ".health-badge--zero" server/lib/html/css.js && \
grep -q "blockers" server/lib/html/client/components/App.js && \
node -e "require('./server/lib/html/css.js').renderCss()" && \
(node server/dashboard.js & P=$!; sleep 1; kill $P 2>/dev/null; true)
</automated>
</verify>
<done>The health badges are styled from design tokens; App.js confirmed to already carry blockers into the store, so it was left untouched.</done>
<evidence>
lines: server/lib/html/client/components/App.js:137-148 (fetchAndRerender setState — already includes `blockers: newState.raw.blockers || []` at line 144, so the data path exists and App.js needs no edit)
lines: server/lib/html/client/store.js:24 (`blockers: _seed.blockers || []` — boot seed already carries blockers)
lines: server/lib/html/css.js:164-206 (sidebar-project / nav-section block — token vocabulary + the insertion neighbourhood)
grep: `grep -n "sidebar-health\|health-badge" server/lib/html/css.js` → 0 hits — no badge CSS exists yet
</evidence>
</task>

</tasks>

<verification>
- `node server/dashboard.js` starts clean on :7717.
- `node --input-type=module --check` passes for Sidebar.js.
- Sidebar.js subscribes to the store via useStore — counts re-render on every poll/refresh.
- No `style=` attribute in Sidebar.js; CSS uses only existing design tokens.
- App.js confirmed to already propagate `blockers` into the store — it was NOT edited by
  this sprint (App.js is owned by 36-1).
</verification>

<success_criteria>
- DSH-5 met: the sidebar shows a live active-session count badge and a live blocker count
  badge; both update reactively as sessions start/stop (4 s poll) and blockers change
  (30 s state refresh) — no manual refresh.
- Zero-count badges are de-emphasised; non-zero blockers are visually flagged.
- No new dependency, no build step, no change to server/dashboard.js, no change to App.js.
</success_criteria>

<output>
Create `.planning/phases/36-command-palette-and-sidebar-health-badges/36-2-SUMMARY.md`
</output>
</content>
</invoke>
