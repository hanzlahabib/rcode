---
phase: 31-preact-migration
sprint: 31.3
plan_number: 3
type: execute
wave: 3
depends_on: [31.2]
files_modified:
  - server/lib/html/client/components/App.js
  - server/lib/html/client/views/KanbanView.js
  - server/lib/html/client/views/FilesView.js
  - server/lib/html/client/views/AgentsView.js
  - server/lib/html/client/views/MemoryView.js
  - server/lib/html/client/agents-data.js
  - server/lib/html/shell.js
  - server/lib/html/client/client-main.js
autonomous: true
requirements: [phase-31-goal]
must_haves:
  truths:
    - "Kanban renders 4 columns from live state; Run/Stop/View card buttons work; drag-and-drop still moves cards visually."
    - "Files view: file tree loads from /api/files, clicking a file renders markdown from /api/file."
    - "Agents view: real + AI agent cards render, filter works, clicking an agent jumps to its skill file."
    - "Memory view: loads /api/memory and renders sections, distillates, change records."
  artifacts:
    - "Four view modules: KanbanView, FilesView, AgentsView, MemoryView."
    - "server/lib/html/client/agents-data.js — the 18-agent roster array moved out of shell.js into a client module."
  key_links:
    - "Kanban Run/Stop still bridge to orchestrator functions in client-kanban.js / client-main.js — those migrate in Sprint 31.4; KanbanView calls them via window globals with BRIDGE markers."
    - "Drag-and-drop is visual-only (not persisted) — preserve that exact behavior + the 'visual only' toast."
    - "Agent roster currently lives in shell.js:17-36 and renders server-side; moving it client-side must keep viewAgentSkill jump behavior."
---

<objective>
Migrate the four remaining complex views — Kanban, Files, Agents, Memory — to
Preact components. After this sprint only the Orchestration view and the
xterm/orch panels remain on legacy code (Sprint 31.4).

Purpose: these four views are the hardest because they touch live data (Kanban
sessions, file tree fetch, memory API) and DOM-heavy interactions (drag-and-drop,
file selection). Isolating them in their own sprint keeps the blast radius small.

Output: 11 of 12 views Preact; the agent roster moves out of server-rendered
shell.js into a client data module.
</objective>

<context>
@.planning/STATE.md
</context>

<current_state_evidence>
- `client-kanban.js:17-98` `renderKanban()` — 4-column board, effective-column logic (`isSessionRunning` overrides stored status), card action buttons, calls `wireKanbanDnd()`.
- `client-kanban.js:9-14` `kanbanCol()`; `:399-489` `moveKanbanCard`/`wireKanbanDnd`/`wireKanbanCardButtons`/`refreshKanbanCounts` — DOM drag-and-drop.
- `client-kanban.js:295-310` `runStory`/`stopStory`; the orchestrator panel functions `:102-289` (createPanelTab etc.) belong to the orch-panel side surface — Sprint 31.4 handles that panel; Kanban only needs Run/Stop/View bridges.
- `client-main.js:206-272` — Files view: `_filesPromise` fetch of `/api/files`, the inline-file-list IIFE, `filterInlineFiles`, `loadInlineFile` (fetches `/api/file`, renders markdown).
- `client-main.js:274-301` — `stripFrontmatter`, `renderMd` (uses global `marked`), `openFile`.
- `client-main.js:84-144` `renderMemory()` — fetches `/api/memory`, renders sections/distillates/changeRecords/archive/postMortems.
- `shell.js:17-36` — the 18-agent roster array; `:41-49` `agentCard()`; `:212-229` the server-rendered `#view-agents` markup; `:288-307` `viewAgentSkill()` inline script.
- `shell.js:205-209` `#view-files` static markup; `:234-241` `#view-memory` static markup — these static hosts get removed when their views go Preact.
</current_state_evidence>

<tasks>

<task id="31.3.1" type="auto">
<title>Migrate Kanban view (4-column board, card actions, drag-and-drop)</title>
<read_first>server/lib/html/client/client-kanban.js (lines 1-98, 399-489)</read_first>
<files>
server/lib/html/client/views/KanbanView.js (create)
</files>
<action>
Create `KanbanView.js` reproducing `renderKanban()`: the topbar (orch status dot,
Sync, Sessions buttons), 4 columns (todo/in_progress/blocked/done), and cards.
- Column bucketing: port `kanbanCol()` + the effective-column rule (a story with a
  live session shows in `in_progress`). Read `activeSessions` from `useStore()`.
- Card action buttons: Run (todo/blocked) / Stop+View (in_progress) / Logs (done) —
  Run calls `window.runStory`, Stop calls `window.stopStory`, View calls
  `window.openOrchPanel` (legacy globals — `// BRIDGE(31.4)`).
- Drag-and-drop: visual-only, not persisted. Keep this behavior. Use Preact
  `onDragStart`/`onDragOver`/`onDrop` handlers instead of `wireKanbanDnd`'s
  imperative listeners. On drop, move the card to the target column in component
  state and show the exact existing toast: `'Moved (visual only — not persisted)'`.
  Do NOT persist — the dashboard is view-only.
- Keep every CSS class: `kanban-topbar`, `kanban-board`, `kanban-col`,
  `kanban-col-head`, `kanban-card`, `kanban-card-actions`, `s-{col}`, `running`,
  `card-run-indicator`, `run-pulse`, etc.
The `renderKanban` function in client-kanban.js stays for now (legacy route may
still reference it) — Sprint 31.4 deletes it. App.js (task 31.3.5) routes kanban
to KanbanView.
</action>
<acceptance_criteria>
- `grep -n "onDrop\|onDragStart" server/lib/html/client/views/KanbanView.js` shows Preact DnD handlers.
- `grep -n "visual only — not persisted" server/lib/html/client/views/KanbanView.js` shows the preserved toast.
- `grep -c "BRIDGE(31.4)" server/lib/html/client/views/KanbanView.js` is >= 1.
- `grep -n "kanban-col\b" server/lib/html/client/views/KanbanView.js` shows the 4-column markup.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/views/KanbanView.js && echo OK
</automated>
</verify>
<done>KanbanView parses; DnD via Preact handlers; visual-only toast preserved.</done>
</task>

<task id="31.3.2" type="auto">
<title>Migrate Files view (tree fetch, file load, markdown render)</title>
<read_first>server/lib/html/client/client-main.js (lines 206-301)</read_first>
<files>
server/lib/html/client/views/FilesView.js (create)
</files>
<action>
Create `FilesView.js` reproducing the Files view: a search filter + grouped file
list (groups, optional `subGroups` as `<details>`), and a file-content pane.
- On mount (`useEffect`), fetch `/api/files`; hold the groups in `useState`.
- Search filter is component state, not the `filterInlineFiles` DOM hack.
- Clicking a file fetches `/api/file?path=...` and renders the markdown — port
  `stripFrontmatter` + `renderMd` (still uses the global `marked` CDN lib — that
  stays a CDN global, fine) into FilesView or util.js. Show the path header with a
  copy-path button + toast.
- Keep classes: `inline-file-group`, `inline-subgroup`, `inline-file-entry`,
  `item-clickable`, `file-path-header`, `md-render`, `skeleton`.
- `viewAgentSkill` (jump from Agents view) needs to drive FilesView selection.
  Expose a way for AgentsView to request a file: simplest is a store field
  `requestedFile` that FilesView's `useEffect` watches. Implement that store field.
</action>
<acceptance_criteria>
- `grep -n "/api/files" server/lib/html/client/views/FilesView.js` shows the tree fetch.
- `grep -n "/api/file" server/lib/html/client/views/FilesView.js` shows the file-content fetch.
- `grep -n "useState\|useEffect" server/lib/html/client/views/FilesView.js` shows fetch+filter state.
- `grep -n "requestedFile" server/lib/html/client/views/FilesView.js server/lib/html/client/store.js` shows the agent-jump bridge.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/views/FilesView.js && node --check server/lib/html/client/store.js && echo OK
</automated>
</verify>
<done>FilesView parses; tree + content fetched via hooks; agent-jump bridge wired through store.</done>
</task>

<task id="31.3.3" type="auto">
<title>Migrate Agents view; move roster out of shell.js</title>
<read_first>server/lib/html/shell.js (lines 17-49, 212-229, 288-307)</read_first>
<files>
server/lib/html/client/agents-data.js (create)
server/lib/html/client/views/AgentsView.js (create)
server/lib/html/shell.js
</files>
<action>
1. Create `agents-data.js` — export the 18-agent roster array verbatim from
   shell.js:17-36 (name, arabic, role, real, type). This is the same data; it just
   moves client-side so AgentsView can render it.
2. Create `AgentsView.js` reproducing the `#view-agents` markup: a filter input,
   a "Team" group (real agents) and an "AI Agents" group, each agent an
   `agent-card`. Port `agentCard()` markup + classes (`agent-card`, `name`,
   `real-badge`, `type-badge`, `arabic`, `role`). Filter is component state.
   Clicking an agent card calls `viewAgentSkill(skillName)` behavior — set the
   store `requestedFile` to the agent's skill slug and `location.hash='files'`
   (replaces the legacy `viewAgentSkill` setTimeout DOM-poll hack).
3. `shell.js`: DELETE the server-rendered agent roster array (17-36),
   `agentCard()` (41-49), the `#view-agents` static markup (212-229), and the
   `viewAgentSkill` inline `<script>` (287-307). The roster is now client-side.
   Keep `esc()` — still used elsewhere in shell.js.
</action>
<acceptance_criteria>
- `grep -c "name:" server/lib/html/client/agents-data.js` is 18 (full roster moved).
- `grep -n "viewAgentSkill" server/lib/html/shell.js` returns nothing (inline script deleted).
- `grep -n "agentCard\|realAgents\|aiAgents" server/lib/html/shell.js` returns nothing.
- `grep -n "agent-card" server/lib/html/client/views/AgentsView.js` shows the card markup.
- `grep -n "requestedFile" server/lib/html/client/views/AgentsView.js` shows the file-jump via store.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/agents-data.js && node --check server/lib/html/client/views/AgentsView.js && node -e "const {renderHtml}=require('./server/lib/html/shell.js');renderHtml({exists:true,planningFiles:[],blockers:[],raw:{phases:[],decisions:[]}},'t');console.log('OK');"
</automated>
</verify>
<done>Roster moved to agents-data.js; AgentsView parses; shell.js no longer renders agents.</done>
</task>

<task id="31.3.4" type="auto">
<title>Migrate Memory view</title>
<read_first>server/lib/html/client/client-main.js (lines 84-144), server/lib/html/shell.js (lines 234-241)</read_first>
<files>
server/lib/html/client/views/MemoryView.js (create)
server/lib/html/shell.js
</files>
<action>
1. Create `MemoryView.js` reproducing `renderMemory()`: `useEffect` fetches
   `/api/memory`; handle the `!exists` / `!initialised` / populated cases. Render
   the sections map, plus Distillates / Change Records / Milestone Archive /
   Post-mortems groups, and the command-hints accordion. Keep classes
   (`memory-group-header`, `decision-list`, `item`, `item-title`, `item-meta`).
   Loading + error states are component state.
2. `shell.js`: DELETE the `#view-memory` static markup (234-241) — App renders a
   placeholder/host or routes straight to MemoryView.
</action>
<acceptance_criteria>
- `grep -n "/api/memory" server/lib/html/client/views/MemoryView.js` shows the fetch.
- `grep -n "useEffect\|useState" server/lib/html/client/views/MemoryView.js` shows load/error state.
- `grep -n "view-memory-content" server/lib/html/shell.js` returns nothing (static host removed).
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/views/MemoryView.js && echo OK
</automated>
</verify>
<done>MemoryView parses; static memory host removed from shell.js.</done>
</task>

<task id="31.3.5" type="auto">
<title>Register the 4 views in App router; trim legacy route dispatch</title>
<read_first>server/lib/html/client/components/App.js, server/lib/html/client/client-main.js (lines 45-82, 84-189)</read_first>
<files>
server/lib/html/client/components/App.js
server/lib/html/client/client-main.js
</files>
<action>
1. `App.js`: add `kanban, files, agents, memory` to the view map. Now 11 of 12
   views are Preact; only `orchestration` remains legacy.
2. `client-main.js`: in `route()` (45-82) remove the dispatch lines for the now-
   migrated views (`renderKanban, renderMemory, renderDecisions` — Decisions
   migrated in 31.1; verify it was already removed). Keep `renderOrchestration`
   dispatch — that view is still legacy until Sprint 31.4.
   DELETE `renderMemory` (84-144) and `renderDecisions` (146-189) function bodies —
   confirm via grep nothing else calls them. Keep the Files/markdown helpers IF
   still referenced; if FilesView ported `renderMd`/`stripFrontmatter`/`openFile`,
   delete the legacy copies and confirm no caller remains.
   Do NOT delete the xterm/orch-panel functions (456-823) or `renderKanban`'s
   orchestrator-panel helpers in client-kanban.js — Sprint 31.4 owns those.
</action>
<acceptance_criteria>
- `grep -n "KanbanView\|FilesView\|AgentsView\|MemoryView" server/lib/html/client/components/App.js` shows all 4 imported.
- `grep -nE "function (renderMemory|renderDecisions)" server/lib/html/client/client-main.js` returns nothing.
- `grep -n "renderOrchestration" server/lib/html/client/client-main.js` STILL shows the function (kept for Sprint 31.4).
- Boot test: dashboard `/` returns 200.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rcode && node --check server/lib/html/client/components/App.js && node --check server/lib/html/client/client-main.js && node -e "const srv=require('child_process').spawn('node',['server/dashboard.js'],{stdio:'ignore'});setTimeout(()=>{require('http').get('http://127.0.0.1:7717/',r=>{console.log(r.statusCode);srv.kill();process.exit(r.statusCode===200?0:1);});},1500);"
</automated>
</verify>
<done>4 views routed in App; legacy renderMemory/renderDecisions deleted; renderOrchestration kept; dashboard serves 200.</done>
</task>

<task id="31.3.6" type="checkpoint:human-verify">
<title>Manual regression sweep — complex views</title>
<read_first>this sprint's must_haves block</read_first>
<files></files>
<action>
With the dashboard running and the orchestrator up, verify in a browser:
1. Kanban: 4 columns populate from state; a todo card shows Run; click Run — card
   moves to In Progress and the terminal opens; drag a card to another column —
   it moves and the "visual only" toast appears; Sync button re-renders.
2. Files: tree loads, groups + subgroups expand; click a markdown file — content
   renders; copy-path button works; search filter narrows the tree.
3. Agents: Team + AI groups render; filter narrows; click an agent — jumps to
   Files view with that agent's skill file selected/searched.
4. Memory: loads /api/memory; sections + distillates render (or the not-initialised
   empty state if applicable).
5. No console errors; Orchestration view (still legacy) still renders.
Report PASS/FAIL per item. Any FAIL blocks Sprint 31.4.
</action>
<done>All 5 checks PASS; no console errors; Orchestration legacy view unaffected.</done>
</task>

</tasks>

<verification>
- `node server/dashboard.js` boots clean; `/` returns 200.
- `for f in $(find server/lib/html/client -name '*.js'); do node --check "$f" || echo BAD $f; done` prints no BAD.
- `renderHtml` test passes (shell.js still composes a valid page).
</verification>

<success_criteria>
- 11 of 12 views are Preact; only Orchestration remains legacy.
- Agent roster moved out of server-rendered shell.js into a client module.
- Drag-and-drop preserved as visual-only; file/memory fetches work via hooks.
</success_criteria>

<output>
Create `.planning/phases/31-preact-migration-rebuild-majlis-dashboard-client-as-preact-components-via-htm-esm-cdn-no-build-step/31-3-SUMMARY.md`
</output>
