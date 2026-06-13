# Sprint 35.2 Summary — Session History Panel

## What was built

Four tasks across six files to add a Run History panel to the Orchestration view in the dashboard SPA.

## Files modified

- `server/lib/html/client/store.js` — added `history: []` field to the state seed
- `server/lib/html/client/orchestrator.js` — added `fetchHistory()`, `mergeSessionsAndHistory()`, rewrote `_poll()` with Promise.all
- `server/lib/html/client/views/OrchestrationView.js` — added `durationLabel()`, `HistoryRow`, `HistoryPanel` components; wired into OrchestrationView
- `server/lib/html/icons.js` — added `history` icon path (server-side CJS)
- `server/lib/html/client/icons-client.js` — added `history` icon path (client ESM, kept in sync)
- `server/lib/html/css.js` — added `.term-status-dot.exited` modifier and full `.hist-*` CSS block

## Key implementation decisions

**Field-aware dedup-merge**: `mergeSessionsAndHistory` gives live session fields priority but falls back to history values for `durationMs` and `endTime` — a running session won't have these yet, so the persisted history value is preserved until the session ends.

**Promise.all poll**: `_poll()` now calls `fetchSessionsWithStatus()` and `fetchHistory()` in parallel, avoiding serialized sequential fetches. The dedup guard (`_lastSessionsJson`) includes history content so a history change alone triggers a re-render.

**Status ordering**: HistoryPanel groups ended runs by status in the order `done → exited → stopped → error`, then by date (using existing `humanDate` from util.js), with runs sorted newest-first within each date group.

**No inline styles**: all layout uses CSS classes only, satisfying the project constraint.

## Commit

`9add71d feat(dashboard): add session history panel with live/persisted dedup-merge`
