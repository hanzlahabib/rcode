# Dashboard View Audit

**Date:** 2026-09-02

**Scope:** `server/dashboard.js`, `server/lib/api.js`, `server/lib/scanner.js`, and `server/lib/html/` (including the vendored Preact runtime and all client consumers)

**Method:** Static route/data-flow review, complete fetch-call review, relative ESM import and syntax checks, direct HTTP probes, direct `node server/dashboard.js` boot, and the existing dashboard boot/e2e tests. Read-only diagnosis; no implementation files were changed.

## Summary

- **P0:** 3
- **P1:** 3
- **P2:** 5
- **View-only verdict:** Fails. The dashboard starts an orchestration service and the client exposes mutating POST operations; the optional view-only flag does not cover every mutation path.
- **Database verdict:** No database imports, connections, queries, or persistence code were found in the audited files.
- **Route verdict:** All routes exercised by the existing e2e suite work for their exact, expected GET URLs, but HTTP methods are unrestricted and query strings break several otherwise valid routes.
- **Client error verdict:** No uncaught fetch rejection was found, but several failures are swallowed or reported as success/empty data.
- **File-size verdict:** `server/lib/html/css.js` is the only scoped file over the 1,000-line maximum (5,607 lines).
- **Boot verdict:** `node server/dashboard.js` starts cleanly and binds the dashboard plus orchestrator. The existing dashboard boot/e2e suite passes all 11 assertions when localhost binding is permitted.

## Findings

| Severity | File | Line | Finding | One-line fix suggestion |
|---|---|---:|---|---|
| P0 | `server/dashboard.js` | 235 | Starting the view automatically calls `ensurePty(spawnOrchestrator)` and launches the write-capable orchestrator, contradicting the repo-wide view-only requirement even though the dashboard header claims view-only behavior. | Remove orchestrator startup from the dashboard entry point and run any execution service as an explicit, separate command outside the view-only dashboard. |
| P0 | `server/lib/html/client/orchestrator.js` | 94 | The Preact client issues mutating POSTs for run (94), stop (127), rejection persistence (207), task-status persistence (232), and session cleanup (247); moreover, `submitRejection`, `setTaskStatus`, and direct `stopSession` callers do not enforce `isViewOnly()`. | Remove mutating client actions from the dashboard, or make every mutation path unavailable and server-refused under an always-on view-only boundary. |
| P0 | `server/dashboard.js` | 105 | Routing ignores `req.method`, so POST `/api/state` returns 200 and even DELETE `/` returns the dashboard HTML, meaning the nominally GET-only view has effective POST/DELETE handlers. | Reject every method except GET/HEAD before route dispatch and return `405 Allow: GET, HEAD`. |
| P1 | `server/lib/html/client/components/App.js` | 222 | Refresh only overwrites phases/current sprint/decisions/blockers when `newState.raw` is truthy, so deleting or corrupting `state.json` leaves the old project state visible while merely adding a parse-error banner. | Always replace or clear raw-derived store fields on every successful `/api/state` response, including the missing/malformed-state case. |
| P1 | `server/lib/html/client/views/AgentsView.js` | 33 | The server returns all 46 agent definitions, but the view iterates the static 18-entry `AGENTS` array and uses `/api/agents` only as metadata lookup, silently dropping 31 file-backed agents from the roster. | Make the server response (preferably sourced from `rcode/team.yaml`) the rendered roster, with static system-only entries merged explicitly if needed. |
| P1 | `server/lib/html/client/orchestrator.js` | 232 | `setTaskStatus()` parses every HTTP response as success and converts network/parse failures to `{}`, while `KanbanView.js:218-227` clears its optimistic state and can toast “Moved” regardless of persistence failure. | Check `response.ok`, reject with the server error, and have Kanban revert the optimistic move and show a failure toast before refreshing. |
| P2 | `server/lib/html/client/views/FilesView.js` | 110 | `/api/files` failures are collapsed to `[]`, so the user sees “No files found” instead of a load error and cannot distinguish an empty project from a broken request. | Track a separate error state, check `response.ok`, and render a retryable failure message. |
| P2 | `server/lib/html/client/orchestrator.js` | 146 | A 401 from `/api/sessions` is returned as `{ ok: true, sessions: [] }`, causing the poll to clear live sessions and mark the orchestrator online before token refresh succeeds. | Return an authentication/error state (or refresh and retry once) instead of treating 401 as a successful empty session list. |
| P2 | `server/dashboard.js` | 105 | Matching against raw `req.url` makes valid query-bearing URLs fail: `/api/state?x=1` returns 404 and `/api/files?x=1` falls into the broad `/api/file` prefix route and returns 400. | Parse `new URL(req.url, base).pathname` once and use exact pathname matches for every API route. |
| P2 | `server/lib/api.js` | 131 | `URLSearchParams` already decodes `path`, but `decodeURIComponent()` decodes it again and throws `URIError` for valid literal-percent names such as `%25.md`, which the top-level handler converts to 500. | Remove the second decode (or catch decode errors and return 400) and operate on the single decoded parameter value. |
| P2 | `server/lib/html/css.js` | 1001 | The CSS module is 5,607 lines, exceeding the repository's hard 1,000-line maximum by 4,607 lines. | Split the stylesheet incrementally into view/component CSS modules while preserving `renderCss()` composition and output order. |

## Verification

- `node server/dashboard.js` — **PASS**; dashboard listened on `127.0.0.1:7717`, orchestrator reported ready on `127.0.0.1:7718`, and SIGINT shut both down cleanly.
- `node --test test/dashboard-boot.test.cjs test/dashboard-e2e.test.cjs` — **PASS**; 11/11 tests.
- Client syntax check (`node --input-type=module --check` over every `server/lib/html/client/**/*.js`) — **PASS**.
- Relative ESM import resolution check over every client module — **PASS**.
- Scoped line-count check — **FAIL** only for `server/lib/html/css.js` (5,607 lines); `server/lib/scanner.js` is next largest at 937 lines.
- Direct route probes — POST `/api/state` **200**, DELETE `/` **200**, GET `/api/state?x=1` **404**, GET `/api/files?x=1` **400**.

## Clean Checks

- No missing relative imports or missing vendored Preact/HTM modules were found.
- The local Preact wrapper imports the vendored runtime/hooks correctly, and every scoped client file parses as an ES module.
- All declared GET routes (`/`, `/health`, `/api/state`, `/api/files`, `/api/file?path=...`, `/api/agents`, `/api/hierarchy`, `/api/memory`, `/api/orch-token`, and `/js/...`) are present; `/api/hierarchy` currently has no Preact consumer.
- No database code was found in the audited scope.
