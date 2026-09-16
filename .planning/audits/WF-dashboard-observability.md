# WF Audit: dashboard-observability

**Lens:** dashboard-observability
**Date:** 2026-09-16
**Files read:** `server/dashboard.js` (356 lines), `server/lib/api.js` (278 lines), `server/lib/scanner.js` (938 lines), `server/orchestrator.js` (partial)

---

## Verdict

The dashboard is a **planned-state viewer** wearing the clothes of a live observability surface. It shows you what you intended to build, decorated with some derived health signals (phase verification, sprint counts). It shows you nothing about what is actually happening right now — no executing agent, no running session, no blocked task, no real-time file activity. The single most valuable thing it does NOT surface: **live agent execution state** — which story is running, what file the executor last touched, whether it is waiting for a permission prompt or actively writing code.

The deeper problem: the gap between "planned" and "live" is architecturally invisible. The dashboard calls itself live (`/health` returns `{ mode: 'live' }`; `dashboard.js:117`) but the data contract in `buildDashboard()` has no field for current execution output, no field for session status, and no WebSocket channel to the dashboard client. Live orchestrator data (`GET /api/sessions`) lives in `server/orchestrator.js` on a different port — the dashboard's own HTTP server has no proxy for it and the Preact client has no code path to fetch it.

---

## The user's actual experience

A user watching the dashboard while an executor is running sees:

1. **Phase health badges** — derived by `buildPhaseTree()` (`scanner.js:114–237`). Correct in one important way: unverified "complete" phases are downgraded to `active` (`scanner.js:301–302`). Valuable. Stale by up to 2 seconds (scan TTL, `scanner.js:671`).

2. **Sprint/story cards** — populated from SPRINT.md files, not from `state.json`. The filesystem is ground truth (`scanner.js:114`). What it cannot show: which story the executor is mid-execution on, because that state is never written to disk during execution — only the final commit changes the file.

3. **Blockers widget** — reads `raw.blockers` from `state.json` only (`scanner.js:384`). Never derived from sprint status, from task exit codes, from executor stderr, or from stalled sessions. If no human hand-typed a blocker entry, the widget is empty regardless of how stuck the project is.

4. **30-second poll** — the client polls `/api/state` every 30 seconds (`server/lib/html/client/` — standard interval per project docs). A user watching an agent execute sees state that is at minimum 30 seconds old, and at maximum 30 + 2 seconds old (poll + scan TTL). During a 5-minute sprint execution, they get ~10 snapshots, all of planned state, never of runtime state.

5. **Memory Bank panel** — backed by `scanMemoryBank()` with a 5-second TTL (`scanner.js:925`). Each source file triggers a synchronous `execSync('git log -1 --format=%cI', {timeout: 3000})` call (`scanner.js:753–768`). For a project with 20 memory files that is 20 synchronous git calls, each up to 3 seconds, blocking the Node.js event loop and blocking every pending HTTP request on the server's single thread.

6. **Orchestrator panel** — gated on `orchPort !== null` (`dashboard.js:46`). The port is set only after the child process fires an IPC `orch-ready` message (`dashboard.js:317–319`). Until that message arrives — including across every dashboard restart — orchestration renders as disabled. The user cannot tell whether the orchestrator is starting, failed to bind, or was never spawned. There is no retry-status indicator.

---

## Leaks

**L1 — No live execution surface anywhere in the data model.**
`buildDashboard()` (`scanner.js:280–477`) has no field for current session, active story, or executor output. The orchestrator tracks this: `GET /api/sessions` (`orchestrator.js:14`) returns session status including `'blocked'` when the PTY is idle on a question and `lastOutputAt`. This endpoint is unreachable from the dashboard client — the dashboard's HTTP server has no `/api/sessions` route (`dashboard.js:105–208`) and the client has no code to call the orchestrator's different port. The user's most urgent question — "is my agent stuck?" — has zero answer.

**L2 — `parseSimpleYaml()` silently drops `depends_on` arrays.**
`scanner.js:45–53`: the YAML parser handles only `key: scalar` lines. A `depends_on: [22-1, 30-1]` entry is parsed as `depends_on: '[22-1, 30-1]'` (a string) or dropped. `parseYamlList()` exists (`scanner.js:60–82`) and is called for `depends_on` in `buildPhaseTree()`, but only after the frontmatter block is extracted. Any sprint file that uses flow-style arrays (`[a, b]`) instead of block-style (`- a\n- b`) silently has no dependencies. The DAG edges in `buildPhaseTree` are incomplete for the subset of files using flow style — verified by `37-1-SPRINT.md`'s own comment in this repo.

**L3 — Blockers are disconnected from reality.**
`scanner.js:384`: `blockers: raw.blockers || []`. The "blockers" a user sees are manually-entered strings in `state.json`. A sprint that has been sitting in `status: planned` for 60 days with a `depends_on` pointing at an incomplete phase is not a blocker here — it is invisible. The dashboard shows zero blockers on most projects not because the project is healthy but because nobody typed the blocker text.

**L4 — `/api/files` hardcodes four artifact directories and misses three real ones.**
`api.js:17`: `const ARTIFACT_DIRS = ['phases', 'brainstorms', 'council-sessions', 'summaries', 'memory']`. The `audits/` directory (written by this audit), `prds/`, and `epics/` directories that exist in real projects are invisible in the Files panel. Users cannot browse audit reports from the dashboard.

**L5 — Memory Bank distillate freshness check blocks the event loop.**
`scanner.js:753–768`: `gitLastCommitMs()` calls `execSync('git log -1 --format=%cI HEAD -- ' + file, {timeout: 3000})`. This is `execSync` — synchronous, event-loop-blocking. Called once per source file in the distillate list. A Memory Bank with 10 source files = 10 synchronous git calls in a single scan cycle, all before the HTTP response is sent. On a machine under git load (an executor is committing) these calls can hit the 3000ms timeout and throw, which `scanMemoryBank()` catches but then returns a stale result with no indication to the client that freshness was untestable.

**L6 — `handleApiAgents` reads only one agent directory.**
`api.js:254–275`: scans `projectRoot/rcode/agents/` then falls back to `packageRoot/rcode/agents/`. It never reads `.claude/agents/` (the user's project-local agents). Projects that define custom agents for their own use see an agent roster that excludes their own extensions.

---

## Strengthenings

**S1 — Proxy `/api/sessions` and `/api/history` from the orchestrator.**
The orchestrator already tracks session state (`orchestrator.js:14–15`). Dashboard's `handleRequest` (`dashboard.js:105`) should proxy these two routes to `orchPort` when it is non-null. The Preact client can then poll sessions every 5 seconds (a tighter interval is fine for this small payload) and show a "currently running" card with story ID, elapsed time, and whether the PTY is `blocked`. Cost: ~30 lines in `dashboard.js` + a new client component. No orchestrator changes needed.

**S2 — Add `audits/`, `prds/`, `epics/` to the `ARTIFACT_DIRS` array.**
`api.js:17`. One-line fix. The Files panel immediately surfaces audit reports, PRDs, and epics without any schema changes.

**S3 — Replace `execSync` in `gitLastCommitMs()` with a non-blocking approach.**
`scanner.js:753–768`. The simplest fix: `execFile` (async) or cache git mtime once at startup and invalidate on file write. The current pattern will deadlock under concurrent executor git commits because `execSync` on the Node.js event loop serializes with every other HTTP request. Even replacing it with `try { execFileSync } catch {}` with a shorter timeout (200ms) plus a cached fallback would eliminate the worst-case 3-second stall.

**S4 — Derive blockers from sprint dependency graph.**
`scanner.js:384`. After `buildPhaseTree()` runs, walk the dependency edges: any sprint whose `depends_on` targets are not `done`/`complete` and whose own status is `active` or `planned` is a structural blocker. Surface these as `{ type: 'structural', sprint: id, blocking: [...] }` in the blockers array alongside manual entries. This costs one extra pass over the already-built phase tree and requires no new data sources.

**S5 — Add a `lastExecutionAt` field to `buildDashboard()` output.**
The nearest proxy for "is something running" that exists without orchestrator integration: scan `.rcode/state.json`'s `updated_at` field and the most-recent SPRINT.md mtime from `scanSignature()`'s already-collected data. If any SPRINT.md mtime is within the last 60 seconds, flag `recentActivity: true`. Cheap and requires no architectural change. Not a substitute for S1 but gives users a staleness signal immediately.

---

## Kill your darlings

**Kill: the `/health` endpoint's `mode: 'live'` claim.**
`dashboard.js:117`: `res.end(JSON.stringify({ status: 'ok', mode: 'live', rcode_dir: RCODE_DIR }))`. This is not live. It is a 2-second-cached scan of markdown files. Rename `mode` to `'file-scan'` or drop the field. The word "live" creates a false expectation that costs users trust when they realize the executor has been running for 10 minutes and the dashboard hasn't reflected a single line of output.

**Kill: the orchestrator auto-restart loop for non-fatal exits.**
`dashboard.js:334`: `setTimeout(spawnOrchestrator, 3000)` on any exit code that isn't SIGTERM/SIGINT. Exit code 2 is guarded (`dashboard.js:329–333`), but any other non-zero exit re-spawns in 3 seconds with no backoff, no cap, and no user notification. A configuration error in `orchestrator.js` (bad env var, missing binary) produces an infinite restart loop that burns CPU in the background while the dashboard silently shows "orchestration disabled." Add an attempt counter, cap at 3 retries, and surface a `{ orchError: 'max restarts exceeded' }` field on `/api/orch-token` so the client can show a visible error.

**Kill: the `velocity_history` sparkline as a P1 dashboard widget.**
`scanner.js:373`: `velocity_history: raw.velocity_history || []`. The sparkline is the visual centrepiece of the progress card, but `velocity_history` is never populated by any workflow or automation — it requires manual entries in `state.json`. On every project that hasn't hand-edited state.json (all of them), the sparkline renders empty. The widget takes prime real-estate and communicates nothing. Replace with the sprint completion rate (done sprints / total sprints per phase) which is derivable from the already-built phase tree with no additional data.
