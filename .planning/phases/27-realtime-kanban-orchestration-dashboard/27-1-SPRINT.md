<phase>27</phase>
<plan>1</plan>
<objective>
Deliver a fully working real-time agent orchestration UI within the Majlis dashboard.
Each kanban card can launch an independent `claude -p` session, stream its output in real-time
to a side-panel terminal drawer, track file changes, and persist completed session logs to disk.
The dashboard is redesigned with the Claude/Linear design system. The orchestrator spawns automatically.
</objective>

<autonomous>true</autonomous>

<wave>1</wave>

## Stories

### 27-1-01 · Linear design system CSS (css.js)

**Status:** done
**Points:** 3

Rewrote `server/lib/html/css.js` with full Linear-inspired dark design system:
- Color tokens: `--bg-page: #08090a`, elevation layers, `--accent-primary: #5e6ad2`
- Inter + JetBrains Mono fonts via Google Fonts
- Orchestrator panel classes: `#orch-panel` (fixed right drawer), `.orch-tab`, `.orch-terminal`, `.orch-files`, `.orch-panel-footer`
- Kanban card classes: `.kanban-card.running` (blue glow), `.run-pulse` animation, `.kanban-run-btn`, `.kanban-stop-btn`

**Commits:** `504c505`

---

### 27-1-02 · HTML shell with side-panel (shell.js)

**Status:** done
**Points:** 2

Rewrote `server/lib/html/shell.js` to add the `#orch-panel` fixed side panel:
- Header + tab strip (`#orch-tabs`), terminal body (`#orch-term-body`), file-changes pane (`#orch-files`), footer controls
- `#view-kanban` simplified to empty container — JS renders dynamically
- Sidebar uses Linear `.nav-section` / `.nav-link` classes
- Header backdrop blur + live dot + `#updated-ago`

**Commits:** `504c505`

---

### 27-1-03 · Kanban rendering + card wiring (client.js)

**Status:** done
**Points:** 3

New `renderKanban()` in `server/lib/html/client.js`:
- 4-column board: Todo / In Progress / Blocked / Done
- Cards show title, ID badge, sprint meta (points, phase), status badge
- Run / Stop / View Logs action buttons per column state
- `.running` class + `.card-run-indicator` + `.run-pulse` on In Progress cards
- Column count badges update in real time via `refreshKanbanCounts()`

**Commits:** `504c505`, `203aa45`

---

### 27-1-04 · Orchestrator side-panel multi-tab sessions (client.js)

**Status:** done
**Points:** 5

Multi-session orchestrator panel:
- `_sessions = {}` — Map<storyId, {termEl, fileOpBuf}>
- `createPanelTab(storyId)` — creates tab with status dot + close button
- `activatePanelTab(storyId)` — swaps terminal body content, shows correct file-ops list
- `openOrchPanel(storyId)` — slides panel open via `.open` class
- `closeOrchPanel()` — slides panel closed
- `closePanelTab(storyId)` — removes tab + session; reverts to next active tab
- Tab close on ✕ button; auto-selects next tab when current is closed

**Commits:** `504c505`

---

### 27-1-05 · SSE streaming (client.js + orchestrator.js)

**Status:** done
**Points:** 5

End-to-end streaming:
- `connectOrchestratorStream(storyId)` — opens `EventSource` on `/api/stream/:storyId`
- Handles `chunk` (streaming text, in-place append), `line` (new log row), `fileOp` (file-changes pane), `status` (tab dot update + card column move)
- `appendCardChunk()` — appends to `.kt-stream` span; creates new div if last child isn't a stream span
- `appendCardLog()` — new `.kt-line` div per log entry
- `appendCardFileOp()` — creates `.kt-file` with `✎`/`$`/`👁` op icons
- Orchestrator `parseStreamLine()` handles `content_block_delta`, `content_block_start`, `content_block_stop`, `result`, legacy `assistant` format

**Commits:** `504c505`, `203aa45`

---

### 27-1-06 · Session persistence + replay (orchestrator.js)

**Status:** done
**Points:** 3

Session persistence:
- `SESSIONS_DIR = ~/.rcode/sessions/` — auto-created on startup
- `persistSession(storyId, exitStatus)` — writes `{storyId, status, startTime, endTime, logs, fileOps}` JSON on exit
- `loadLastSession(storyId)` — returns most recent session file for storyId
- `cleanSessions(olderThanDays)` — deletes by mtime
- SSE handler replays last session when no live session found for storyId
- `POST /api/clean-sessions` endpoint wired to `openCleanSessions()` button

**Commits:** `504c505`

---

### 27-1-07 · Auto-spawn orchestrator (dashboard.js)

**Status:** done
**Points:** 2

`spawnOrchestrator()` in `server/dashboard.js`:
- Spawns `server/orchestrator.js` via `child_process.spawn` on dashboard startup
- Pipes stdout/stderr to `[orch]` prefixed console logs (omits noisy stdin warning)
- Auto-restarts on crash with 3s delay (unless killed by SIGTERM/SIGINT)
- `shutdown()` kills orchestrator child on graceful shutdown
- Single start command: `node server/dashboard.js`

**Commits:** `504c505`

---

### 27-1-08 · Orchestrator status dot + refresh

**Status:** done
**Points:** 1

- `#orch-dot` in kanban topbar turns green (`.up`) when any SSE stream is active
- `#orch-panel-orch-dot` in panel header mirrors this state
- `_updateOrchDot()` called on every stream open/close/error
- `refreshOrchestratorStatus()` — polls `/api/status` to restore running sessions after page reload, replays log history from status response

**Commits:** `504c505`

---

### 27-1-09 · Drag-and-drop (client.js)

**Status:** done
**Points:** 1

- `wireKanbanDnd()` — `dragstart`/`dragend`/`dragover`/`dragleave`/`drop` on `.kanban-card` and `.kanban-col-body` elements
- Prevents button clicks from triggering drag
- Visual: card opacity 0.5 while dragging; column gets `.drag-target` class on dragover
- Shows "Moved (visual only — not persisted)" toast on drop — explicit user expectation management

**Commits:** `504c505`

---

## Verification

- [x] `node server/dashboard.js` starts both dashboard (7717) and orchestrator (7718) in one command
- [x] Kanban board renders from sprint/story data in state.json
- [x] Run button on todo card → POST /api/run → card moves to In Progress → panel opens with live log stream
- [x] Stop button → POST /api/stop → card moves to blocked
- [x] View Logs button → opens panel, activates tab for that session
- [x] Panel tabs work: multiple concurrent sessions, close button, tab switching
- [x] SSE chunks arrive in real-time, appended in-place to terminal
- [x] Session persisted to ~/.rcode/sessions/ on completion
- [x] Page reload → refreshOrchestratorStatus restores running sessions
- [x] Clean Sessions button → /api/clean-sessions → toast with count
- [x] Linear design system renders with dark-first palette, Inter font
- [x] Drag-drop moves cards visually between columns

## SUMMARY

Phase 27 delivered the complete Realtime Kanban Orchestration Dashboard. All 18 decisions from the discuss-phase (D-01 through D-18) are implemented. The dashboard is production-ready as a local developer tool.

**Architecture highlights:**
- Zero external dependencies — pure Node stdlib for server, CDN-only for client (marked.js)
- View-only dashboard constraint maintained — orchestrator owns all write paths
- Single boot command: `node server/dashboard.js`
- Sessions persist to `~/.rcode/sessions/` for replay across restarts
- Multi-tab side panel handles N concurrent agent sessions without UI clutter
