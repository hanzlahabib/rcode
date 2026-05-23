# Observability & Error Handling Audit

## Summary

| Check | Count |
|---|---|
| Unguarded `execSync` calls (no try/catch) | 4 |
| Empty catch blocks (no logging, no re-throw) | 21 |
| Fire-and-forget promises | 5 |
| Silent `.catch(() => {})` swallowers | 6 |
| Has structured logger | **no** — 760 scattered `console.log` calls |
| Global `uncaughtException` / `unhandledRejection` handlers | **0** |

---

## Findings

### [HIGH] `stopSession` in orchestrator client is fire-and-forget with no feedback

- `server/lib/html/client/orchestrator.js:221` — `stopSession(storyId)` is called inside `stopStory()` with no `await`, no `.catch`, and no UI response. If the POST to `/api/stop` fails (network error, auth failure), the user sees no indication; the "Stop" button silently does nothing.
- Same file line 182: `runSession(storyId, cmd).catch(() => {})` — a session launch failure is silently eaten; the terminal panel opens but never shows an error.

### [HIGH] `orchestrator.js` server has no `uncaughtException` / `unhandledRejection` handlers

- `server/orchestrator.js` — the HTTP server has no global process error handlers. An unhandled rejection in any `async` route handler can crash the orchestrator silently. The async request handler at line 340 is not wrapped in a try/catch, so a thrown error after headers are sent will crash the process. The dashboard's dashboard.js does have SIGTERM/SIGINT handlers but no rejection guard.

### [HIGH] `rcode-hooks.cjs` — empty catch inside commit-message validation loop

- `rcode/bin/rcode-hooks.cjs:391` — parsing the git log output is wrapped in `try { } catch {}` with no logging. If `execSync` fails for a non-trivial reason (e.g. corrupt repo state), the hook silently falls back to an empty commit list, masking the underlying error.

### [MEDIUM] 21 empty catch blocks across install, memory-bank, and client code

- `cli/lib/memory-bank.cjs` lines 75, 110, 127, 146, 182 — five empty catches around memory fingerprint reads/writes. A permissions error or JSON corruption returns `null` with no log, making memory drift silent.
- `cli/install.js` lines 1546, 1632, 1641, 2021 — empty catches in the install critical path. Failed file operations during install silently continue; the user may end up with a partial install that looks successful.
- `server/lib/html/client/orchestrator.js:34` — `refreshOrchToken()` swallows token refresh failure with `.catch(() => {})`. If the token drifts and the refresh fails, all subsequent API calls fail with 401 with no user-visible message (except the unrelated generic toast at line 279).

### [MEDIUM] `execSync` calls in `rcode-tools.cjs` git-clone path lack per-call error context

- `rcode/bin/rcode-tools.cjs:5968-5974` — four sequential `execSync` git clone/sparse-checkout commands each throw on non-zero exit, but the wrapping catch (if present) does not identify which step failed. A `--filter=blob:none` negotiation failure produces a generic error with no hint of which clone URL or branch caused it.

### [LOW] No structured logger — 760 `console.log` calls across 15+ files

- Top offenders: `cli/install.js` (128), `rcode/bin/rcode-tools.cjs` (108), `cli/uninstall.js` (85), `cli/github-sync.js` (64). There is no `winston`, `pino`, `debug`, or any logging library in `package.json`. All output is unstructured; there is no log level control, no timestamps, and no way to redirect output to a file in production without shell redirection.

### [LOW] `server/orchestrator.js` — no `server.on('error', ...)` handler

- If the orchestrator HTTP server fails to bind (port in use, permission denied), Node emits an `'error'` event on the server object. Without a handler this is an unhandled `EventEmitter` error that crashes the process with no useful message passed back to `dashboard.js`.

---

## Strengths

- `rcode-tools.cjs` and `rcode-hooks.cjs` both have top-level `.catch()` on `main()` that log `err.message` and exit 1 — the CLI entry points are sound.
- `server/orchestrator.js` handles PTY spawn failures with a proper `json(res, 500, ...)` response rather than crashing.
- `cli/lib/github.cjs` exec calls capture both stdout and stderr for error reporting; `spawnSync` status codes are checked before returning.
- WebSocket clients have `ws.on('error', ...)` handlers that remove stale connections rather than crashing.

---

## Recommendations (Top 5)

1. **Add `process.on('unhandledRejection', ...)` to `server/orchestrator.js`** — one guard at the top prevents silent process death from any future async route.
2. **Propagate `stopSession` and `runSession` errors to the UI** — replace `.catch(() => {})` with `.catch(err => showToast('Session error: ' + err.message))` in `orchestrator.js:182,221`.
3. **Log inside the five empty catches in `cli/lib/memory-bank.cjs`** — at minimum `console.error('[memory-bank] read failed:', e.message)` so install telemetry and drift detection failures surface during debugging.
4. **Add `server.on('error', err => ...)` to `server/orchestrator.js`** — log the bind error and exit cleanly instead of crashing with Node's default uncaught EventEmitter message.
5. **Introduce a minimal `logger` module** (even a thin wrapper around `console`) with `DEBUG` flag gating, so verbose install output can be silenced in production without losing the ability to turn it on.
