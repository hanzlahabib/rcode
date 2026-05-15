# Phase 27 — Realtime Kanban Orchestration Dashboard

**Status:** Complete
**Plan:** 27-1
**Completed:** 2026-05-15

## What Was Built

Full redesign of the Majlis dashboard into a real-time agent orchestration UI:

1. **Linear design system** — Dark-first CSS with `--bg-page: #08090a`, Inter + JetBrains Mono, `#5e6ad2` accent. Full token set in `server/lib/html/css.js` (1494 lines).

2. **Orchestrator side-panel** — Fixed right drawer with tab strip. Each `claude -p` session gets its own tab with a status dot, terminal body, and file-changes pane. Panel slides open/close with CSS transform.

3. **SSE streaming** — Real-time log streaming from orchestrator to browser. Handles `chunk` (in-place text append), `line` (new row), `fileOp` (file changes), `status` (card column moves). Orchestrator parses `stream-json` format from `claude -p --output-format stream-json --verbose`.

4. **Multi-tab session management** — `_sessions` map stores terminal DOM elements per session. Tabs switch by swapping `#orch-term-body` content. Close button removes tab and auto-selects next.

5. **Session persistence** — Completed sessions written to `~/.rihal/sessions/{storyId}-{date}.json`. Replayed via SSE on reconnect. `/api/clean-sessions` endpoint with UI button.

6. **Auto-spawn orchestrator** — `dashboard.js` spawns `orchestrator.js` as child process. Auto-restarts on crash (3s backoff). Single start command: `node server/dashboard.js`.

7. **Kanban enhancements** — Cards show Run/Stop/Logs buttons per column state. Running cards get pulsing indicator. Drag-drop moves cards visually. Column counts update live.

## Files Modified

- `server/lib/html/css.js` — full rewrite with Linear design system
- `server/lib/html/shell.js` — added `#orch-panel` HTML, simplified kanban container
- `server/lib/html/client.js` — orchestrator panel, session tabs, SSE streaming, kanban
- `server/orchestrator.js` — session persistence, `/api/clean-sessions`, SSE replay
- `server/dashboard.js` — auto-spawn orchestrator child process

## Issues Encountered

None significant. Port conflicts on restart required `kill $(lsof -t -i:7717)`.

## Decisions Honored

All 18 decisions from 27-CONTEXT.md (D-01 through D-18) implemented exactly as decided.
