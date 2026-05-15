---
phase: 29
plan_number: 1
sprint: 29.1
type: execute
status: complete
requirements: [REQ-752]
---

# Sprint 29-1 Summary — Close Orchestrator RCE (#752)

## Objective

Close the unauthenticated, network-reachable RCE in `server/orchestrator.js`.
The orchestrator bound `0.0.0.0:7718` with `Access-Control-Allow-Origin: *`
and fed a network-supplied `cmd` into `spawn(claude, ['-p', cmd,
'--dangerously-skip-permissions'])`. Any LAN host or any webpage in the
user's browser could run arbitrary commands and write arbitrary files via
path traversal in `storyId`.

## Tasks Completed

| Task   | Title                                                      | Status |
| ------ | ---------------------------------------------------------- | ------ |
| 29.1.1 | Bind to 127.0.0.1, remove CORS wildcard                    | done   |
| 29.1.2 | Per-session bearer-token gate on all endpoints             | done   |
| 29.1.3 | Validate storyId against path traversal before fs use      | done   |
| 29.1.4 | Add orchestrator security regression test suite            | done   |

## Changes

### `server/orchestrator.js`

- **Loopback bind:** `server.listen(PORT, '127.0.0.1', ...)` — a remote/LAN
  host now gets connection refused. Boot log prints `Bind: 127.0.0.1
  (loopback only)`.
- **CORS removed:** deleted the `cors()` helper, its call, and the
  `OPTIONS` preflight branch. The server is only ever called by the
  same-machine dashboard; cross-origin browser access is no longer a
  feature.
- **Auth token gate:** added `crypto`, `AUTH_TOKEN` (from `ORCH_TOKEN` env
  or a freshly generated 24-byte hex), and an `authed(req)` helper. The
  token is accepted via `Authorization: Bearer <token>` or, for the SSE
  endpoint which cannot set headers, a `?token=` query param. Compared in
  constant time with `crypto.timingSafeEqual`, guarding the length-mismatch
  case first. The router rejects any token-less request with HTTP 401
  before dispatch — every route (`/api/run`, `/api/stop`,
  `/api/clean-sessions`, `/api/stream`, `/api/status`) is gated. Boot log
  prints the token for the dashboard/user to read.
- **storyId validation:** added `STORY_ID_RE = /^[A-Za-z0-9._-]+$/` and
  `validStoryId(id)` (non-empty, <=128 chars, no `..`, charset match).
  `handleRun`, `handleStop`, and `handleStream` reject invalid storyIds
  with 400 before any filesystem call. Defense-in-depth: `persistSession`
  and `loadLastSession` assert the resolved path stays inside
  `SESSIONS_DIR`.

## Deviations

1. **`ORCH_PORT` env var added** — Task 29.1.4 specifies the test must run
   the orchestrator on PORT 7799, but the orchestrator hard-coded
   `PORT = 7718` with no override. Made `PORT` read `process.env.ORCH_PORT`
   (default 7718). Minimal, in-scope: the test depends on it and the change
   does not alter default behaviour.
2. **SSE storyId query-string strip** — the router previously sliced the
   raw URL (including `?token=...`) into the storyId for `/api/stream/`.
   With the new `?token=` auth param this would corrupt the storyId. The
   router now strips the query string before decoding the storyId. This is
   a correctness fix required for task 29.1.3's intent (valid storyId +
   working SSE auth).

## Verification

- `node -c server/orchestrator.js` — parses clean.
- Task verifies 29.1.1 / 29.1.2 / 29.1.3 — all printed `PASS`.
- `grep "0.0.0.0" server/orchestrator.js` — 0 matches.
- `grep "Access-Control-Allow-Origin" server/orchestrator.js` — 0 matches.
- `node --test test/orchestrator-security.test.cjs` — 6/6 pass:
  status no-token 401, status valid-token 200, run traversal-storyId 400,
  run no-token 401, clean-sessions no-token 401, stream wrong-token 401.
- `node --test` (full repo) — 3 failures, all pre-existing baseline
  (`scope-history-parity`, `broken @-references`, `command-workflow
  @-includes`). No new failures introduced.

## Commit

- `cd66def` — `fix(dashboard): close unauthenticated orchestrator RCE (#752)`

## Success Criteria

- [x] Orchestrator listens on 127.0.0.1 only — remote host refused.
- [x] All endpoints reject token-less requests with 401.
- [x] Traversal `storyId` rejected with 400 before any filesystem call.
- [x] Regression suite locks all three properties.
