# Phase 27: Realtime Kanban Orchestration Dashboard - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a fully working real-time agent orchestration UI within the Majlis dashboard. Each kanban card can launch an independent `claude -p` session, stream its output in real-time to a side-panel terminal drawer, track file changes, and persist completed session logs to disk. The dashboard is redesigned with a proper UI library (shadcn-style prebuilt CSS). The orchestrator spawns automatically from dashboard.js.

This phase does NOT include: multi-user collaboration, remote cloud sessions (Claude Managed Agents API), database storage, authentication, or any write endpoints on dashboard.js (view-only constraint unchanged).

</domain>

<decisions>
## Implementation Decisions

### Design System
- **D-01:** Use a shadcn-style prebuilt CSS library (Pico CSS or equivalent minimal framework). Download once, inline into the HTML shell. No build step, no pnpm dependencies. Pure Node stdlib constraint on dashboard.js remains intact.
- **D-02:** Replace existing css.js class-by-class as views are refactored. Do not delete css.js until all classes are migrated.
- **D-03:** User explicitly requested "go wild" — the dashboard should be a proper, polished UI, not minimal. Full redesign of layout, typography, color system, and components is authorized.
- **D-04:** A custom Claude design system was provided via Anthropic design API. Fetch and apply `https://api.anthropic.com/v1/design/h/rAXzhDL0RATgofI_4NNMCQ` before implementing visual design.

### Terminal Layout
- **D-05:** Right side-panel drawer (30-40% width) slides open when Run is clicked. Kanban board remains visible on the left.
- **D-06:** Panel has tabs when multiple sessions run simultaneously — each tab = one story.
- **D-07:** Panel is fixed position, independent of scroll. Close button, minimize button.
- **D-08:** Each card shows a "running" indicator (pulsing dot) while its session is active, even when the panel is showing another tab.

### Shared Memory / Session Independence
- **D-09:** Filesystem IS the shared memory. Each `claude -p` session reads `.claude/projects/*/memory/` and `.planning/` files naturally — no extra coordination needed.
- **D-10:** Orchestrator tracks running story IDs to prevent duplicate sessions (already implemented via 409 conflict response).
- **D-11:** No lock files, no injected system prompts — sessions are fully independent workers on the same shared filesystem.

### Orchestrator Lifecycle
- **D-12:** `dashboard.js` spawns `server/orchestrator.js` as a child process on startup using `child_process.spawn`. Single start command: `node server/dashboard.js`.
- **D-13:** If orchestrator crashes, dashboard auto-restarts it (simple retry with backoff).
- **D-14:** Dashboard exposes orchestrator status in the header (green dot = running, red = down).

### Session Persistence
- **D-15:** Hybrid approach: running sessions stay in-memory only (fast). On session exit (done/error/stopped), write logs + fileOps to `~/.rcode/sessions/{storyId}-{ISO-date}.json`.
- **D-16:** On orchestrator restart, load the most recent completed session per storyId and replay into the card terminal on SSE reconnect.
- **D-17:** Add a `/api/clean-sessions` endpoint to orchestrator that deletes sessions older than N days. Dashboard exposes a "Clean Sessions" button in the Kanban view header (user selects: 7 days / 30 days / All).
- **D-18:** Session files are stored in `~/.rcode/sessions/` (home dir, not project dir) — keep them out of git.

### Claude's Discretion
- Specific Pico CSS version or alternative library selection (choose what integrates cleanest with the Claude design system from D-04)
- Exact panel animation duration and easing
- Tab ordering (most-recently-started first vs FIFO)
- Session file schema details beyond the agreed fields (logs, fileOps, storyId, exitCode, startTime, endTime)
- Whether to use CSS variables or utility classes for theming

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Implementation (feature/kanban-orchestrator branch)
- `server/orchestrator.js` — Port 7718. Sessions Map, SSE streaming, parseStreamLine, broadcastChunk/broadcast/broadcastFileOp/broadcastStatus
- `server/lib/html/client.js` — renderKanban(), runStory(), stopStory(), connectOrchestratorStream(), appendCardChunk(), appendCardLog(), appendCardFileOp(), wireKanbanCardButtons()
- `server/lib/html/css.js` — .kanban-board, .kanban-card, .kanban-terminal, .kt-line, .kt-stream, .kt-file, .kt-btn
- `server/lib/html/shell.js` — HTML shell, nav links, view divs

### Dashboard Architecture Rules
- `CLAUDE.md` §Dashboard Server Rules — dashboard.js must remain view-only (no write endpoints). Orchestrator (port 7718) owns all write/spawn operations.
- `server/dashboard.js` — Port 7717, view-only, pure Node stdlib, no framework

### Design
- Anthropic Claude Design System: `https://api.anthropic.com/v1/design/h/rAXzhDL0RATgofI_4NNMCQ` — fetch and apply before implementing visual design

### Project Constraints
- `AGENTS.md` — never push without explicit user approval, no AI attribution in commits
- `.planning/PROJECT.md` — Stack: Node.js 20+, pure Node stdlib for dashboard, no runtime deps

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `parseStreamLine(raw, toolBuf)` — already handles stream-json events correctly (chunk/text/fileOp)
- `sessions` Map in orchestrator.js — `{ pid, proc, status, logs[], fileOps[], toolBuf{}, sseClients: Set }`
- `broadcastChunk`, `broadcast`, `broadcastFileOp`, `broadcastStatus` — SSE broadcast helpers
- `kanbanCol(status)` — maps todo/in_progress/blocked/done → column IDs
- `renderKanban()` — builds 4-column board, cards with inline terminals (to be migrated to side-panel)

### Established Patterns
- SSE with `setNoDelay(true)` + `X-Accel-Buffering: no` — already working for real-time flush
- Template literal safety: use `data-action` attributes + event delegation (`wireKanbanCardButtons`) — never inline onclick strings with dynamic IDs
- `esc(s)` helper in shell.js for HTML escaping
- Dark/light theme via CSS custom properties on `[data-theme="dark"]`

### Integration Points
- `server/dashboard.js` needs to spawn `server/orchestrator.js` as child process on start
- Side-panel drawer replaces `.kanban-terminal` embedded in cards — panel is a fixed DOM element, not inside each card
- `_orchStreams[storyId]` tracks active EventSource connections — needs updating for panel/tab model
- `refreshOrchestratorStatus()` polls `/api/status` to sync card states on reconnect

### What to Migrate / Change
- Remove per-card `.kanban-terminal` HTML from card render loop
- Add fixed side-panel `#orch-panel` with tab strip `#orch-tabs` and terminal body `#orch-term-body`
- Cards show status indicators (pulsing dot) instead of inline terminals
- `openCardTerminal(storyId)` → `openOrchestratorPanel(storyId)` with tab management

</code_context>

<specifics>
## Specific Ideas

- User said "go wild" — full redesign authorized, not a minimal tweak
- User explicitly provided Anthropic Claude design system — this should be the visual foundation
- User wants "efficient maximum" — performance matters: SSE flush speed, no jank on chunk append, smooth panel animation
- Side-panel with tabs was immediately accepted — this is the primary terminal UX

</specifics>

<deferred>
## Deferred Ideas

- Multi-user collaboration (multiple users seeing the same kanban over network)
- Claude Managed Agents API integration (cloud sessions, not local)
- Story creation UI (creating new stories from the dashboard, not just running existing ones)
- Drag-to-run (dragging a card to a "Run" drop zone to trigger execution)
- Session replay scrubbing (seek forward/backward in session history)

</deferred>

---

*Phase: 27-realtime-kanban-orchestration-dashboard*
*Context gathered: 2026-05-15*
