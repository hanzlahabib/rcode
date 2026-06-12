# Phase 35 Plan 1: Orchestrator Run Persistence and History Read Endpoint — Summary

**Phase:** 35-session-history-panel-with-live-persisted-dedup-merge
**Plan:** 1
**Completed:** 2026-06-12
**Duration:** ~10 min

## What Was Built

`server/orchestrator.js` now persists every completed orchestration run to `~/.rcode/orch-history.json` (capped at 200 entries) and exposes a `GET /api/history` endpoint that returns those persisted runs newest-first. The in-memory history is loaded at boot so restarts do not wipe the record.

**Start time:** 2026-06-12T00:00:00Z
**End time:** 2026-06-12T00:10:00Z
**Tasks completed:** 2
**Files modified:** 1 (server/orchestrator.js)

## Stories Completed

| ID | Title | Status |
|----|-------|--------|
| 35.1.1 | Add run-history persistence layer to the orchestrator | Done |
| 35.1.2 | Expose GET /api/history read endpoint | Done |

## Files Modified

| File | Change |
|------|--------|
| `server/orchestrator.js` | +50 lines: fs/os requires, HISTORY_FILE/HISTORY_MAX constants, loadHistory(), persistRun(), history module-level init, handleHistory(), GET /api/history route, doc-comment update |

## Patterns Established

- Persistence helpers (`loadHistory` / `persistRun`) are pure module-level functions that live directly in `server/orchestrator.js`. No separate file; no new dependency. This pattern should be followed for any future lightweight JSON-file persistence in the orchestrator.
- New read endpoints follow the existing pattern: registered in the authed route table after the `authed(req)` gate at line ~359, GET-only, response envelope mirrors sibling endpoints (`{ history: [...] }` mirrors `{ sessions: [...] }`).

## Provides

- `GET /api/history` — returns `{ history: HistoryEntry[] }` sorted newest-first. Available to `Sprint 35.2` for the client history panel.
- `~/.rcode/orch-history.json` — the persisted file. `HistoryEntry` shape: `{ storyId, cmd, status, startTime, endTime, durationMs }`.
- `loadHistory()` — callable at boot to populate the in-memory `history` array.
- `persistRun(storyId, s, status)` — callable from any terminal-exit handler that needs to record a run.

## Requires

- No new dependencies. Uses `fs` and `os` from Node stdlib, already available.
- `server/orchestrator.js` sessions Map and `handleRun`/`proc.onExit` lifecycle from Phase 27/29/33 work.

## Affects

- Sprint 35.2 (client history panel) consumes `GET /api/history` directly — if the `{ history: [...] }` envelope or `HistoryEntry` key names change, `35.2` must be updated accordingly.
- Any future cleanup of `proc.onExit` in `handleRun` must preserve the `persistRun(storyId, s, status)` call.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- [x] `node --check server/orchestrator.js` exits 0
- [x] `function loadHistory` present in orchestrator.js
- [x] `function persistRun` present in orchestrator.js
- [x] `persistRun(storyId, s, status)` call present in proc.onExit
- [x] `orch-history.json` referenced in orchestrator.js
- [x] `function handleHistory` present in orchestrator.js
- [x] `pathOnly === '/api/history'` registered exactly once (GET-only)
- [x] `server/dashboard.js` byte-identical — untouched
- [x] No new entries in package.json dependencies

## Commit Hashes

| Task | Hash | Description |
|------|------|-------------|
| 35.1.1 | 39b4909 | feat(35-1): add run-history persistence layer to orchestrator |
| 35.1.2 | 4e034ee | feat(35-1): expose GET /api/history read endpoint |

## Next Steps

Ready for Sprint 35.2 — client history panel that fetches `GET /api/history`, dedup-merges with live session data, and renders grouped by status/date in `OrchestrationView`.
