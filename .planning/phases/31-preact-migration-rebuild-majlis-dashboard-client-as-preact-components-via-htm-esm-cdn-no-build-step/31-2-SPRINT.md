---
phase: 31-preact-migration
sprint: 31.2
plan_number: 2
type: execute
wave: 2
depends_on: [31.1]
files_modified:
  - server/lib/html/client/components/App.js
  - server/lib/html/client/components/shared.js
  - server/lib/html/client/views/RoadmapView.js
  - server/lib/html/client/views/MilestonesView.js
  - server/lib/html/client/views/PhasesView.js
  - server/lib/html/client/views/SprintsView.js
  - server/lib/html/client/views/TasksView.js
  - server/lib/html/client/views/OverviewView.js
  - server/lib/html/client/client-render.js
autonomous: true
requirements: [phase-31-goal]
must_haves:
  truths:
    - "Roadmap, Milestones, Phases, Sprints, Tasks views render as Preact components."
    - "Drill-down navigation works: phase card -> phase detail -> sprint detail; breadcrumbs go back."
    - "Task expand/collapse, status filter, sort, and per-card command hints all still work."
    - "Roadmap tree expand/collapse and filter still work."
  artifacts:
    - "server/lib/html/client/components/shared.js — ProgressBar, CompletionRing, Chip, Tag, CmdHints, RunBtn, RunningBadge, Breadcrumb components."
    - "Five view modules under views/ replacing the renderRoadmap/Milestones/Phases/Sprints/Tasks functions."
  key_links:
    - "RunBtn / RunningBadge must call the same orchestrator entry points (runAndOpenTerm, isSessionRunning) — those still live in legacy modules until Sprint 31.4; bridge via window globals for now."
    - "App.js view map must add the 5 migrated views; their legacy render funcs must be removed from client-render.js to avoid double-render into the same id."
---

<objective>
Migrate the five planning views (Roadmap, Milestones, Phases, Sprints, Tasks) to
Preact components, and extract the shared visual primitives (progress bar,
completion ring, chip, tag, command hints, run button, running badge, breadcrumb)
into one `components/shared.js` so every view imports instead of re-templating.

Purpose: these five views are the bulk of the planning surface and share the same
card vocabulary. Migrating them together lets the shared primitives be designed
once against five real consumers.

Output: 7 of 12 views now Preact (Overview, Decisions, Roadmap, Milestones,
Phases, Sprints, Tasks); Kanban, Files, Agents, Memory, Orchestration still legacy.
</objective>

<context>
@.planning/STATE.md
</context>

<current_state_evidence>
- `client-render.js:40-54` — `progressBar()` + `completionRing()` return HTML strings; `:11-13` `chip()`/`tag()`; `:70-80` `cmdHint()`/`cmdAccordion()`; `:141-144` `runBtn()`; `:34-36` `breadcrumb()`; `client-main.js:819-821` `runningBadge()`.
- `client-render.js:347-403` `renderRoadmap()` + `:405-410` `filterRoadmap()`; tree uses `toggleNode` (client-main.js:18-25) and `toggleAllRoadmap` (client-main.js:28-40).
- `client-render.js:412-473` `renderMilestones(subId)`; `:475-526` `renderPhases(subId)`; `:528-579` `renderSprints(subId)`; `:581-654` `renderTasks()` + `renderTasksGrouped` + `filterTasksByStatus` + `sortTasks`.
- `client-render.js:190-242` `taskCard()` + `toggleTaskDetail()` — expand/collapse via DOM display toggle.
- `client-render.js:81-136` `sprintHints()`/`phaseHints()` build cmd-hint arrays from status — pure logic, portable.
- Orchestration bridge functions live in legacy modules: `runAndOpenTerm` (client-main.js:643), `openTermPanel` (client-main.js:518), `isSessionRunning`/`runningInPhase`/`runningInSprint`/`runningTotal` (client-main.js:800-818). These are NOT migrated until Sprint 31.4.
</current_state_evidence>

<tasks>

<task id="31.2.1" type="auto">
<title>Extract shared visual-primitive components</title>
<read_first>server/lib/html/client/client-render.js (lines 1-145), server/lib/html/client/client-main.js (lines 800-821)</read_first>
<files>
server/lib/html/client/components/shared.js (create)
server/lib/html/client/views/OverviewView.js
</files>
<action>
Create `components/shared.js` with these Preact components (htm `html` from
preact.js), each reproducing the existing HTML/class output exactly:
- `Chip({status})` — port `chip()` color mapping (client-render.js:5-12); render
  `<span class="status-chip {cls}">● {status}</span>`.
- `Tag({children})` — `<span class="tag">…</span>`.
- `ProgressBar({done, total})` — port `progressBar()` width + color logic.
- `CompletionRing({done, total})` — port the SVG ring math (client-render.js:46-54).
- `Breadcrumb({items})` — items = `[{label, hash}]`; renders the back buttons,
  each `onClick` setting `location.hash`.
- `CmdHint({cmd, desc})` + `CmdHints({hints})` — port `cmdHint`/`cmdAccordion`;
  copy-to-clipboard on click via `navigator.clipboard` + a toast.
- `RunBtn({storyId, cmd, label})` — calls `window.runAndOpenTerm` (legacy global,
  still present); `stopPropagation` on click. Add `// BRIDGE(31.4): window.runAndOpenTerm becomes an imported fn`.
- `RunningBadge({count})` — `count ? <span class="run-badge">● {count} running</span> : null`.
Then update `OverviewView.js` to import `ProgressBar` and `CmdHints` from shared.js
and delete its inline copies (resolve the `TODO(31.2)` left in Sprint 31.1).
Keep `sprintHints()`/`phaseHints()` logic — move those pure functions into
`util.js` (they return cmd arrays, no DOM). Export them.
</action>
<acceptance_criteria>
- `grep -nE "export (function|const) (Chip|Tag|ProgressBar|CompletionRing|Breadcrumb|CmdHints|CmdHint|RunBtn|RunningBadge)" server/lib/html/client/components/shared.js` lists all 9.
- `grep -n "BRIDGE(31.4)" server/lib/html/client/components/shared.js` shows the bridge marker on RunBtn.
- `grep -n "TODO(31.2)" server/lib/html/client/views/OverviewView.js` returns nothing (resolved).
- `grep -n "sprintHints\|phaseHints" server/lib/html/client/util.js` shows both moved into util.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/components/shared.js && node --check server/lib/html/client/util.js && node --check server/lib/html/client/views/OverviewView.js && echo OK
</automated>
</verify>
<done>shared.js exports 9 primitives; OverviewView imports them; hint logic lives in util.js.</done>
</task>

<task id="31.2.2" type="auto">
<title>Migrate Roadmap view (tree, filter, expand/collapse)</title>
<read_first>server/lib/html/client/client-render.js (lines 347-410), server/lib/html/client/client-main.js (lines 18-40)</read_first>
<files>
server/lib/html/client/views/RoadmapView.js (create)
</files>
<action>
Create `RoadmapView.js` reproducing `renderRoadmap()`: the milestone -> phase ->
sprint -> task tree. Replace the imperative `toggleNode`/`toggleAllRoadmap` DOM
hacks with component state — each tree node owns an `expanded` `useState`
(default collapsed for phases/sprints per the #272 behavior, root open). Filter is
a `useState` query string; matching nodes filtered in the render, not by toggling
`style.display`. Keep every CSS class (`tree-container`, `tree-node`, `tree-row`,
`tree-chevron`, `tree-icon`, `tree-label`, `tree-badge`, `tree-children`,
`progress-bar`). Phase label double-click still navigates to `phases/{id}`.
Keep the keyboard E/C expand/collapse-all — App.js owns global keydown; expose an
expand-all/collapse-all via store or a ref. Use `Chip`, `ProgressBar`, `CmdHints`
from shared.js.
</action>
<acceptance_criteria>
- `grep -n "useState" server/lib/html/client/views/RoadmapView.js` shows per-node expansion state.
- `grep -n "tree-children" server/lib/html/client/views/RoadmapView.js` shows the tree markup retained.
- `grep -n "style.display\|toggleNode" server/lib/html/client/views/RoadmapView.js` returns nothing (no DOM hacks).
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/views/RoadmapView.js && echo OK
</automated>
</verify>
<done>RoadmapView parses; tree expansion is component state, not DOM toggling.</done>
</task>

<task id="31.2.3" type="auto">
<title>Migrate Milestones + Phases views (list + drill-down detail)</title>
<read_first>server/lib/html/client/client-render.js (lines 412-526)</read_first>
<files>
server/lib/html/client/views/MilestonesView.js (create)
server/lib/html/client/views/PhasesView.js (create)
</files>
<action>
1. `MilestonesView.js`: reproduce `renderMilestones(subId)` — list mode (the M1
   card with completion ring) and detail mode (velocity history bars, phase
   timeline, completion ring, phase cards). Takes `subId` as a prop from App's
   router. Use `CompletionRing`, `Chip`, `Breadcrumb`, shared `PhaseCard`.
2. `PhasesView.js`: reproduce `renderPhases(subId)` — list mode (filter + phase
   cards) and detail mode (entity header, attr grid, progress bar, the
   `term-action-bar` Run/Terminal/View-plan buttons, sprint velocity bars, sprint
   cards, command hints accordion). The Run Phase / Terminal buttons call
   `window.runAndOpenTerm` / `window.openTermPanel` (legacy bridge — mark with
   `// BRIDGE(31.4)`). View-plan-file calls `window.viewPlanFile`.
Build a `PhaseCard` and `SprintCard` component IN shared.js (reused by Roadmap,
Milestones, Phases, Sprints) — port `phaseCard()`/`sprintCard()` from
client-render.js:146-188, including the `RunBtn`, `RunningBadge`, `ProgressBar`,
current-phase highlight. `runningInPhase`/`runningInSprint` are still legacy
globals — call `window.runningInPhase` etc. with a BRIDGE marker.
</action>
<acceptance_criteria>
- `grep -nE "export (function|const) (PhaseCard|SprintCard)" server/lib/html/client/components/shared.js` shows both card components.
- `grep -n "subId" server/lib/html/client/views/MilestonesView.js server/lib/html/client/views/PhasesView.js` shows both accept the router subId.
- `grep -c "BRIDGE(31.4)" server/lib/html/client/views/PhasesView.js` is >= 1.
- `grep -n "term-action-bar" server/lib/html/client/views/PhasesView.js` shows the Run/Terminal bar retained.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/views/MilestonesView.js && node --check server/lib/html/client/views/PhasesView.js && node --check server/lib/html/client/components/shared.js && echo OK
</automated>
</verify>
<done>Both views + PhaseCard/SprintCard parse; detail mode driven by router subId.</done>
</task>

<task id="31.2.4" type="auto">
<title>Migrate Sprints + Tasks views</title>
<read_first>server/lib/html/client/client-render.js (lines 190-242, 528-654)</read_first>
<files>
server/lib/html/client/views/SprintsView.js (create)
server/lib/html/client/views/TasksView.js (create)
server/lib/html/client/components/shared.js
</files>
<action>
1. `SprintsView.js`: reproduce `renderSprints(subId)` — list mode (filter + sprint
   cards) and detail mode (full breadcrumb, entity header, attr grid, progress
   bar, Run/Terminal action bar, task cards, acceptance-criteria section, command
   hints). Uses `SprintCard`, `Breadcrumb`, `Chip`, `ProgressBar`, `TaskCard`.
2. `TasksView.js`: reproduce `renderTasks()` — text filter, status `<select>`,
   sort `<select>`, points total, grouped-by-sprint task list, command hints.
   Filter/status/sort are component `useState` — NOT the DOM `filterTasksByStatus`
   / `sortTasks` hacks. Group-by-sprint is computed in render.
3. Add `TaskCard` to shared.js — port `taskCard()` (client-render.js:190-234)
   including the expand/collapse detail panel. Expansion is component `useState`,
   replacing `toggleTaskDetail`. Keeps the `RunBtn`, status chip, points/id/sprint
   tags, the running badge (`window.isSessionRunning` — BRIDGE marker), and the
   per-task command hints.
</action>
<acceptance_criteria>
- `grep -nE "export (function|const) TaskCard" server/lib/html/client/components/shared.js` shows the TaskCard component.
- `grep -n "useState" server/lib/html/client/views/TasksView.js` shows filter/status/sort state.
- `grep -n "toggleTaskDetail\|filterTasksByStatus\|sortTasks" server/lib/html/client/views/TasksView.js server/lib/html/client/components/shared.js` returns nothing (no DOM hacks).
- `grep -n "subId" server/lib/html/client/views/SprintsView.js` shows detail-mode routing.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/views/SprintsView.js && node --check server/lib/html/client/views/TasksView.js && node --check server/lib/html/client/components/shared.js && echo OK
</automated>
</verify>
<done>Both views + TaskCard parse; filter/sort/expand are component state.</done>
</task>

<task id="31.2.5" type="auto">
<title>Register migrated views in App router; remove dead legacy render functions</title>
<read_first>server/lib/html/client/components/App.js, server/lib/html/client/client-render.js (full), server/lib/html/client/client-main.js (lines 45-82)</read_first>
<files>
server/lib/html/client/components/App.js
server/lib/html/client/client-render.js
</files>
<action>
1. `App.js`: add `roadmap, milestones, phases, sprints, tasks` to the view map,
   importing the new view modules. Pass the router `subId` to Milestones/Phases/
   Sprints. Now 7 views are Preact; only `kanban, files, agents, memory,
   orchestration` still render via legacy placeholders.
2. `client-render.js`: DELETE the now-replaced functions —
   `renderOverview, renderRoadmap, filterRoadmap, renderMilestones, renderPhases,
   renderSprints, renderTasks, renderTasksGrouped, filterTasksByStatus, sortTasks,
   phaseCard, sprintCard, taskCard, toggleTaskDetail` and the string helpers now
   in shared.js (`progressBar, completionRing, chip, tag, cmdHint, cmdAccordion,
   breadcrumb, runBtn, sprintHints, phaseHints, filterInput, attr`).
   CAUTION: legacy `client-main.js` `route()` (lines 72-81) still calls
   `renderKanban`/`renderMemory`/`renderDecisions`/`renderOrchestration` — leave
   those and their dependencies. Verify with grep that nothing still-loaded calls a
   deleted function before deleting it. `esc`/`pct`/`humanDate`/`allSprints`/
   `allTasks` are still used by kanban (legacy) — KEEP those in client-render.js
   until Sprint 31.3 migrates kanban.
   The legacy `route()` must no longer dispatch overview/roadmap/milestones/phases/
   sprints/tasks/decisions — App owns those. Edit `route()` to only handle the
   still-legacy views, OR (cleaner) gate the legacy `route()` so it is a no-op for
   migrated views.
</action>
<acceptance_criteria>
- `grep -cE "renderRoadmap|renderMilestones|renderPhases|renderSprints|renderTasks\b|renderOverview" server/lib/html/client/client-render.js` is 0.
- `grep -n "RoadmapView\|MilestonesView\|PhasesView\|SprintsView\|TasksView" server/lib/html/client/components/App.js` shows all 5 imported.
- `grep -nE "function (renderKanban|renderMemory|renderDecisions)" server/lib/html/client/client-main.js` still shows the legacy funcs (NOT deleted — Sprint 31.3/done).
- No still-loaded module references a deleted symbol: `grep -rn "renderTasksGrouped\|toggleTaskDetail" server/lib/html/client/client-main.js server/lib/html/client/client-kanban.js` returns nothing.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/client-render.js && node --check server/lib/html/client/components/App.js && node -e "const srv=require('child_process').spawn('node',['server/dashboard.js'],{stdio:'ignore'});setTimeout(()=>{require('http').get('http://127.0.0.1:7717/',r=>{console.log('status',r.statusCode);srv.kill();process.exit(r.statusCode===200?0:1);});},1500);"
</automated>
</verify>
<done>5 views registered in App; replaced legacy functions deleted; no dangling references; dashboard serves 200.</done>
</task>

<task id="31.2.6" type="checkpoint:human-verify">
<title>Manual regression sweep — planning views</title>
<read_first>this sprint's must_haves block</read_first>
<files></files>
<action>
With `node server/dashboard.js` running, in a browser verify:
1. Roadmap: tree renders; expand/collapse a phase and a sprint; filter input
   narrows nodes; press E then C (expand/collapse all) on the roadmap view.
2. Milestones: list shows M1 card with ring; click into M1 detail — velocity
   bars, timeline, phase cards render; breadcrumb back works.
3. Phases: list + filter; click a phase — detail shows attr grid, progress,
   Run/Terminal/View-plan buttons; the Run button opens the terminal panel.
4. Sprints: list + filter; click a sprint — task cards, acceptance criteria,
   breadcrumb chain (All Sprints / Phase N) works.
5. Tasks: text filter, status select, sort select all work; expand a task card.
6. No console errors; the still-legacy views (kanban/files/agents/memory/
   orchestration) still render.
Report PASS/FAIL per item. Any FAIL blocks Sprint 31.3.
</action>
<done>All 6 checks PASS; no console errors; legacy views unaffected.</done>
</task>

</tasks>

<verification>
- `node server/dashboard.js` boots clean; `/` returns 200.
- `for f in $(find server/lib/html/client -name '*.js'); do node --check "$f" || echo BAD $f; done` prints no BAD.
- No still-loaded module references a deleted legacy function.
</verification>

<success_criteria>
- 7 of 12 views are Preact components; drill-down + breadcrumbs functional.
- Shared visual primitives extracted into one components/shared.js.
- Filter/sort/expand are component state, not DOM mutation hacks.
</success_criteria>

<output>
Create `.planning/phases/31-preact-migration-rebuild-majlis-dashboard-client-as-preact-components-via-htm-esm-cdn-no-build-step/31-2-SUMMARY.md`
</output>
