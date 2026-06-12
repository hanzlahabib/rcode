# Sprint 35.1 Summary — Run History Persistence + GET /api/history

## What Was Built

Every orchestration run that ends (done/exited/stopped) is now persisted to
`~/.rcode/orch-history.json`. A new authenticated GET /api/history endpoint
returns all persisted runs sorted newest-first, capped at 200 entries.

## Files Modified

- `server/orchestrator.js` — only file touched

## Key Implementation Decisions

1. **`os` require added** — `os.homedir()` gives the canonical home path; `os` was the only missing stdlib import (`fs` and `path` were already present).

2. **`loadHistory()` reads synchronously at boot** — safe at startup before any requests arrive; errors (missing file, bad JSON) return `[]` and never crash the process.

3. **`persistRun` wraps disk writes in try/catch** — a filesystem failure (permissions, disk full) logs via `console.error` and allows the session lifecycle to continue normally.

4. **`HISTORY_MAX = 200`** — slices the oldest entries once the cap is hit so the JSON file cannot grow unbounded over long-running deployments.

5. **`handleHistory` is synchronous** — no I/O needed; the in-memory `history` array is the source of truth (loaded from disk at boot, kept in sync by `persistRun`).

6. **Route sits behind the existing `authed()` gate** — identical security posture to `/api/sessions`.

## Commit

`01d4231` feat(dashboard): add orchestrator run persistence and GET /api/history
