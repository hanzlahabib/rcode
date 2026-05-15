---
phase: 31-preact-migration
sprint: 31.4
plan_number: 4
type: execute
wave: 4
depends_on: [31.3]
files_modified:
  - server/lib/html/client/components/App.js
  - server/lib/html/client/views/OrchestrationView.js
  - server/lib/html/client/components/XtermPanel.js
  - server/lib/html/client/components/OrchPanel.js
  - server/lib/html/client/orchestrator.js
  - server/lib/html/client/components/shared.js
  - server/lib/html/shell.js
  - server/lib/html/client.js
  - server/lib/html/client/client-render.js
  - server/lib/html/client/client-kanban.js
  - server/lib/html/client/client-main.js
autonomous: false
requirements: [phase-31-goal]
must_haves:
  truths:
    - "Orchestration view renders live sessions, polls /api/sessions, Stop and Terminal buttons work."
    - "The xterm terminal panel opens, attaches over WebSocket, is fully interactive (type, resize, min/fullscreen/stop), and the minimized pill restores it."
    - "Running-session badges appear on phase/sprint/task/kanban cards and update live."
    - "All three legacy client modules (client-render.js, client-kanban.js, client-main.js) are deleted; no string-concatenation rendering remains."
    - "node server/dashboard.js starts clean on :7717 and every one of the 12 views works."
  artifacts:
    - "OrchestrationView.js, XtermPanel.js, OrchPanel.js — the orchestration surfaces as components."
    - "client/orchestrator.js — the orchestrator client logic (run/stop/poll/SSE/WS) as ESM, no DOM-by-id."
  key_links:
    - "xterm.js stays a CDN global (Terminal, FitAddon) — XtermPanel wraps it via a useRef container, NOT replaces it."
    - "The BRIDGE(31.4) window globals from Sprints 31.2/31.3 (runAndOpenTerm, openTermPanel, runStory, stopStory, openOrchPanel, isSessionRunning, runningInPhase/Sprint/Total) must be re-exported from orchestrator.js AND still attached to window so any remaining bridge keeps working until removed."
    - "Deleting the 3 legacy modules requires client.js to stop emitting their <script src> tags."
---

<objective>
Migrate the last view (Orchestration) and the two panel surfaces (the xterm
terminal panel, the orchestrator side panel), wrap xterm.js as a Preact
component, make running-session awareness component-driven, then delete all three
legacy string-concat modules and remove every BRIDGE shim. Final full regression
sweep.

Purpose: this sprint finishes the migration — after it, the dashboard is 100%
Preact, no string concatenation, no `document.getElementById` rendering, and the
legacy files are gone.

Output: a fully Preact dashboard; `client-render.js`, `client-kanban.js`,
`client-main.js` deleted; `client.js` loads only the `app.js` module entry.
</objective>

<context>
@.planning/STATE.md
</context>

<current_state_evidence>
- `client-main.js:664-760` `renderOrchestration()` + `orchPollNow`/`_orchCard`/`_orchRender`/`orchStopSession`/`stopOrchPoll` — the Orchestration view, polls `/api/sessions` every 2s.
- `client-main.js:456-662` — xterm panel: `_ensureTerm()` builds the xterm via the CDN global `Terminal`/`FitAddon`; `openTermPanel`/`closeTermPanel`/`minimizeTermPanel`/`restoreTermPanel`/`termToggleFull`/`termStop`/`termSend`/`runAndOpenTerm`; WebSocket to `ws://localhost:7718/ws/{storyId}`.
- `client-main.js:762-823` — active-session poll: `startSessionsPoll`/`pollActiveSessions`/`activeSession`/`isSessionRunning`/`runningInSprint`/`runningInPhase`/`runningTotal`/`runningBadge`.
- `client-kanban.js:1-8` orchestrator constants; `:102-289` orch side-panel (`createPanelTab`/`activatePanelTab`/`openOrchPanel`/`closeOrchPanel`/`closePanelTab` etc.); `:291-395` `runStory`/`stopStory`/`connectOrchestratorStream` (SSE)/`refreshOrchestratorStatus`.
- `shell.js:250-285` — `#orch-panel` static markup; `:309-337` — `#term-panel`, `#term-backdrop`, `#term-pill` static markup.
- `shell.js:58-61` — CDN `<script>` tags for marked + xterm + xterm-addon-fit (these STAY — xterm is a CDN global by design).
- `client.js:38` `MODULES` array lists the 3 legacy files; `:41-42` emits their `<script src>` tags.
</current_state_evidence>

<tasks>

<task id="31.4.1" type="auto">
<title>Extract orchestrator client logic into an ESM module</title>
<read_first>server/lib/html/client/client-main.js (lines 456-823), server/lib/html/client/client-kanban.js (lines 1-8, 291-395)</read_first>
<files>
server/lib/html/client/orchestrator.js (create)
server/lib/html/client/store.js
</files>
<action>
Create `orchestrator.js` — the non-UI orchestrator client logic as ESM, with NO
`document.getElementById` calls (panels become components that read store/props):
- Constants: `ORCH_HTTP='http://localhost:7718'`, `ORCH_WS='ws://localhost:7718'`.
- `orchToken()` / `refreshOrchToken()` — port from client-main.js:467-476.
- `runSession(storyId, cmd)` — POST `/api/run` (port from `runAndOpenTerm`'s fetch).
- `stopSession(storyId)` — POST `/api/stop`.
- `fetchSessions()` — GET `/api/sessions`, returns the sessions array.
- `cleanSessions()` — POST `/api/clean-sessions`.
- Session-awareness helpers: `isSessionRunning`, `runningInSprint`, `runningInPhase`,
  `runningTotal` — these now read `activeSessions` from the store (passed in or
  imported), NOT a module global.
- Start a poll loop (`startSessionsPoll`) that calls `fetchSessions()` every 4s and
  writes `activeSessions` into the store via `setState` — components re-render
  reactively (replaces the `route()`-on-change hack at client-main.js:789).
Keep these as named exports. Also attach the still-needed ones to `window`
(`window.runAndOpenTerm` etc.) ONLY if any un-migrated bridge still needs them;
by end of this sprint every consumer is a component, so prefer pure imports and
remove the window attachments in task 31.4.6.
</action>
<acceptance_criteria>
- `grep -nE "export (function|const) (runSession|stopSession|fetchSessions|isSessionRunning|runningInPhase|startSessionsPoll)" server/lib/html/client/orchestrator.js` lists them.
- `grep -n "getElementById" server/lib/html/client/orchestrator.js` returns nothing.
- `grep -n "activeSessions" server/lib/html/client/orchestrator.js` shows it reads/writes the store.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rihal-code && node --check server/lib/html/client/orchestrator.js && node --check server/lib/html/client/store.js && echo OK
</automated>
</verify>
<done>orchestrator.js parses; no DOM-by-id; session poll writes the store.</done>
</task>

<task id="31.4.2" type="auto">
<title>Wrap xterm.js as XtermPanel + OrchPanel components</title>
<read_first>server/lib/html/client/client-main.js (lines 456-662), server/lib/html/client/client-kanban.js (lines 102-289), server/lib/html/shell.js (lines 250-337)</read_first>
<files>
server/lib/html/client/components/XtermPanel.js (create)
server/lib/html/client/components/OrchPanel.js (create)
server/lib/html/shell.js
</files>
<action>
1. `XtermPanel.js`: a Preact component wrapping the xterm.js terminal. xterm stays
   the CDN global (`Terminal`, `FitAddon` from the shell.js `<script>` tags) — do
   NOT replace it. The component:
   - holds a `useRef` for the terminal container div;
   - in `useEffect`, builds the xterm instance ONCE (port `_ensureTerm` config:
     theme, fontFamily, convertEol:false, scrollback) and calls `term.open(ref)`;
   - manages the WebSocket lifecycle (`openTermPanel` logic) — connect, `onmessage`
     write to term, `onData` send to PTY, resize via FitAddon;
   - exposes open/close/minimize/restore/fullscreen/stop/send as component state +
     props (panel visibility, fullscreen flag, the minimized pill).
   - Reproduce the `term-panel`, `term-header`, `term-input-row`, `term-pill`
     markup + classes from shell.js:309-337. Keep the input box + Send button.
   - The panel's open/target-session is driven by store state (a `terminal` field:
     `{ open, storyId, title, minimized, fullscreen }`) — add that to store.js.
2. `OrchPanel.js`: the orchestrator side panel (`#orch-panel`) — tab strip,
   terminal body, file-changes list, footer (Stop/Clear/Clean). Port the
   `createPanelTab`/`activatePanelTab`/`closePanelTab` logic as component state
   (a sessions map). The SSE stream (`connectOrchestratorStream`) appends
   chunks/lines/fileOps — keep that, driven by component state not DOM append.
   Reproduce classes (`orch-panel`, `orch-tabs`, `orch-tab`, `orch-terminal`,
   `orch-term-body`, `orch-files`, `orch-panel-footer`).
3. `shell.js`: DELETE the static `#orch-panel` (250-285) and `#term-panel` /
   `#term-backdrop` / `#term-pill` (309-337) markup — the components render them.
   Keep the CDN `<script>` tags for marked + xterm + xterm-addon-fit (58-61).
</action>
<acceptance_criteria>
- `grep -n "useRef" server/lib/html/client/components/XtermPanel.js` shows the container ref.
- `grep -n "new Terminal\|Terminal(" server/lib/html/client/components/XtermPanel.js` shows xterm reused (not replaced).
- `grep -n "WebSocket" server/lib/html/client/components/XtermPanel.js` shows the WS lifecycle.
- `grep -n "orch-tab\b" server/lib/html/client/components/OrchPanel.js` shows the tab strip.
- `grep -n "term-panel\|orch-panel" server/lib/html/shell.js` returns nothing (static markup deleted).
- `grep -n "xterm@5.3.0" server/lib/html/shell.js` STILL shows the CDN script (xterm kept).
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rihal-code && node --check server/lib/html/client/components/XtermPanel.js && node --check server/lib/html/client/components/OrchPanel.js && node -e "const {renderHtml}=require('./server/lib/html/shell.js');const h=renderHtml({exists:true,planningFiles:[],blockers:[],raw:{phases:[],decisions:[]}},'t');if(h.includes('id=\"term-panel\"'))process.exit(1);if(!h.includes('xterm@5.3.0'))process.exit(1);console.log('OK');"
</automated>
</verify>
<done>XtermPanel wraps the CDN xterm via a ref; OrchPanel parses; static panels removed from shell; xterm CDN kept.</done>
</task>

<task id="31.4.3" type="auto">
<title>Migrate Orchestration view</title>
<read_first>server/lib/html/client/client-main.js (lines 664-760)</read_first>
<files>
server/lib/html/client/views/OrchestrationView.js (create)
</files>
<action>
Create `OrchestrationView.js` reproducing `renderOrchestration()`: the title,
subtitle, and the session grid. Port `_orchCard` (status dot, id, badge, cmd,
elapsed/files/clients/pid meta, Terminal + Stop buttons) and `_orchRender` (sort:
waiting first, then running, then recent). Read sessions from the store
`activeSessions` (orchestrator.js's poll keeps it fresh) — no separate 2s poll
needed; if a tighter cadence is wanted while this view is open, a `useEffect`
interval is fine. Terminal button opens XtermPanel (set store `terminal` state);
Stop calls `orchestrator.stopSession`. Keep classes (`orch-grid`, `orch-card`,
`orch-card-head`, `orch-card-meta`, `orch-card-actions`, `term-status-dot`).
Port `_orchElapsed` into util.js (pure).
</action>
<acceptance_criteria>
- `grep -n "orch-card\b" server/lib/html/client/views/OrchestrationView.js` shows the card markup.
- `grep -n "stopSession\|fetchSessions\|activeSessions" server/lib/html/client/views/OrchestrationView.js` shows orchestrator wiring.
- `grep -n "_orchElapsed\|orchElapsed" server/lib/html/client/util.js` shows the helper moved.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rihal-code && node --check server/lib/html/client/views/OrchestrationView.js && node --check server/lib/html/client/util.js && echo OK
</automated>
</verify>
<done>OrchestrationView parses; reads sessions from store; elapsed helper in util.</done>
</task>

<task id="31.4.4" type="auto">
<title>Register Orchestration + panels in App; replace BRIDGE shims with imports</title>
<read_first>server/lib/html/client/components/App.js, server/lib/html/client/components/shared.js, all views/*.js with BRIDGE markers</read_first>
<files>
server/lib/html/client/components/App.js
server/lib/html/client/components/shared.js
server/lib/html/client/views/KanbanView.js
server/lib/html/client/views/PhasesView.js
server/lib/html/client/views/SprintsView.js
</files>
<action>
1. `App.js`: add `orchestration` to the view map (OrchestrationView). Render
   `<XtermPanel/>` and `<OrchPanel/>` as siblings of the content area (they are
   fixed-position overlays). All 12 views are now Preact.
2. Replace every `BRIDGE(31.4)` shim: in `shared.js` (RunBtn, RunningBadge,
   PhaseCard, SprintCard, TaskCard) and the views that call `window.runAndOpenTerm`
   / `window.openTermPanel` / `window.runStory` / `window.stopStory` /
   `window.openOrchPanel` / `window.isSessionRunning` / `window.runningInPhase` etc.
   — import the real functions from `orchestrator.js` instead. For terminal-opening
   actions, set the store `terminal` state (XtermPanel reacts).
   After this task `grep -rn "BRIDGE(31.4)" server/lib/html/client` MUST return
   nothing, and `grep -rn "window.run\|window.openTerm\|window.isSessionRunning" server/lib/html/client/components server/lib/html/client/views` MUST return nothing.
</action>
<acceptance_criteria>
- `grep -rn "BRIDGE(31.4)" server/lib/html/client` returns nothing.
- `grep -rn "window\.\(runAndOpenTerm\|openTermPanel\|runStory\|stopStory\|openOrchPanel\|isSessionRunning\|runningInPhase\|runningInSprint\)" server/lib/html/client/components server/lib/html/client/views` returns nothing.
- `grep -n "OrchestrationView\|XtermPanel\|OrchPanel" server/lib/html/client/components/App.js` shows all three.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rihal-code && for f in components/App.js components/shared.js views/KanbanView.js views/PhasesView.js views/SprintsView.js; do node --check "server/lib/html/client/$f" || exit 1; done && echo OK
</automated>
</verify>
<done>All 12 views routed; XtermPanel + OrchPanel mounted; every BRIDGE shim replaced with a real import.</done>
</task>

<task id="31.4.5" type="auto">
<title>Delete the three legacy modules; trim client.js to the module entry</title>
<read_first>server/lib/html/client.js (full), server/lib/html/client/client-render.js, client-kanban.js, client-main.js</read_first>
<files>
server/lib/html/client.js
server/lib/html/client/client-render.js (delete)
server/lib/html/client/client-kanban.js (delete)
server/lib/html/client/client-main.js (delete)
</files>
<action>
1. Before deleting, grep the whole `server/lib/html/client` tree for any import or
   reference to symbols that only existed in the 3 legacy files. The new modules
   must be fully self-contained (util.js / orchestrator.js / shared.js hold every
   ported helper). Fix any dangling reference FIRST.
2. Delete `client-render.js`, `client-kanban.js`, `client-main.js`.
3. `client.js`: remove the `MODULES` array and its `<script src>` loop. Emit only:
   `window.__S__`, `window.__ICONS__`, and the single
   `<script type="module" src="/js/app.js"></script>` entry. Keep the
   `</script>` escaping for `__S__`/`__ICONS__`.
4. Confirm no string-concatenation rendering remains: there must be no
   `.innerHTML =` building HTML from `'<div>' + ...` in the surviving client tree
   (component `html\`\`` templates are fine; small `innerHTML` for a CDN-rendered
   markdown blob is acceptable but should be minimal).
</action>
<acceptance_criteria>
- `test ! -f server/lib/html/client/client-render.js && test ! -f server/lib/html/client/client-kanban.js && test ! -f server/lib/html/client/client-main.js` — all three gone.
- `grep -n "client-render\|client-kanban\|client-main\|MODULES" server/lib/html/client.js` returns nothing.
- `grep -c "type=\"module\"\|type='module'" server/lib/html/client.js` is 1.
- `grep -rn "renderRoadmap\|renderKanban\|renderOrchestration\|_ensureTerm" server/lib/html/client` returns nothing.
</acceptance_criteria>
<verify>
<automated>
cd /home/hanzla/development/rihal-code && node --check server/lib/html/client.js && for f in $(find server/lib/html/client -name '*.js'); do node --check "$f" || exit 1; done && node -e "const srv=require('child_process').spawn('node',['server/dashboard.js'],{stdio:'ignore'});setTimeout(()=>{require('http').get('http://127.0.0.1:7717/',r=>{console.log(r.statusCode);srv.kill();process.exit(r.statusCode===200?0:1);});},1500);"
</automated>
</verify>
<done>3 legacy modules deleted; client.js emits only the module entry; all surviving JS parses; dashboard serves 200.</done>
</task>

<task id="31.4.6" type="checkpoint:human-verify">
<title>Final full-dashboard regression sweep</title>
<read_first>this sprint's must_haves block; the Phase 31 ROADMAP acceptance criteria</read_first>
<files></files>
<action>
With `node server/dashboard.js` running and the orchestrator up, do a complete
walkthrough in the browser (DevTools open, Console + Network tabs visible):
1. Page loads with NO console errors and NO failed esm.sh / CDN requests.
2. All 12 nav links work; every view renders correctly (Overview, Orchestration,
   Roadmap, Milestones, Phases, Sprints, Tasks, Kanban, Files, Agents, Decisions,
   Memory).
3. Drill-downs: phase -> phase detail -> sprint detail; breadcrumbs back.
4. Orchestration: run a real story from a card; the xterm terminal opens, shows
   live output, accepts typed input, resizes; minimize to pill and restore;
   fullscreen toggle; Stop ends the session.
5. Running badges appear on phase/sprint/task/kanban cards while a session runs
   and clear when it ends.
6. Kanban Run/Stop/View; drag-and-drop visual move + toast.
7. Files: open a file, markdown renders. Agents: jump to a skill file. Memory:
   sections render.
8. Theme toggle, sidebar collapse, manual + 30s auto-refresh, keyboard shortcuts
   (1-9, R, F, E/C on roadmap).
9. Reload on a deep hash (e.g. `#sprints/31.2`) — restores correctly.
10. `grep -rn "'<div>'\|innerHTML =" server/lib/html/client` — confirm no
    string-concat rendering remains (spot-check any hits are benign).
Report PASS/FAIL per item. This is the phase acceptance gate — any FAIL must be
fixed before the phase is marked complete.
</action>
<done>All 10 checks PASS; tester confirms zero regressions and no console errors; phase acceptance met.</done>
</task>

</tasks>

<verification>
- `node server/dashboard.js` boots clean on :7717; `/` returns 200.
- `for f in $(find server/lib/html/client -name '*.js'); do node --check "$f" || echo BAD $f; done` prints no BAD.
- The 3 legacy modules are deleted; `client.js` loads only `app.js`.
- No `BRIDGE(31.4)` markers and no `window.*` orchestrator shims remain.
</verification>

<success_criteria>
- All 12 dashboard views render as Preact components; no string-concatenation rendering left.
- xterm terminal wrapped as a component (CDN xterm reused, not replaced); fully interactive.
- Orchestration Run buttons, session badges, file browser, drill-down, auto-refresh all functional.
- `node server/dashboard.js` starts clean on :7717 — Phase 31 ROADMAP acceptance met.
</success_criteria>

<output>
Create `.planning/phases/31-preact-migration-rebuild-majlis-dashboard-client-as-preact-components-via-htm-esm-cdn-no-build-step/31-4-SUMMARY.md`
</output>
