---
phase: 29
plan_number: 1
sprint: 29.1
type: execute
wave: 1
depends_on: []
files_modified:
  - server/orchestrator.js
autonomous: true
requirements: [REQ-752]
must_haves:
  truths:
    - "Orchestrator accepts connections only from 127.0.0.1 — a remote host gets connection refused."
    - "An /api/run or /api/clean-sessions request without the valid session token is rejected with 401."
    - "A storyId containing path separators or '..' is rejected before any filesystem call."
    - "Cross-origin browsers can no longer call the API — CORS '*' is gone."
  artifacts:
    - "server/orchestrator.js — bound to 127.0.0.1, token gate, storyId validator"
    - "test/orchestrator-security.test.cjs — regression suite proving the exploits are closed"
  key_links:
    - "Dashboard (server/dashboard.js, :7717) must pass the token; orchestrator prints it on boot for the dashboard to read."
    - "ORCH_TOKEN env / printed token is the single source of truth for auth."
---

<objective>
Close the unauthenticated network-reachable RCE in `server/orchestrator.js` (#752).
Purpose: the orchestrator currently binds `0.0.0.0:7718` with `Access-Control-Allow-Origin: *` and feeds a network-supplied `cmd` into `spawn(claude, ['-p', cmd, '--dangerously-skip-permissions'])` — any host on the LAN (or any webpage in the user's browser) can run arbitrary commands and write arbitrary files via path traversal in `storyId`.
Output: orchestrator bound to loopback only, CORS removed, per-session bearer token required on all mutating + streaming endpoints, `storyId` validated against `^[A-Za-z0-9._-]+$`.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
</context>

<tasks>

<task id="29.1.1" type="auto">
<title>Bind orchestrator to 127.0.0.1 and remove CORS wildcard</title>
<read_first>
- server/orchestrator.js lines 37-41 (cors helper), 348-352 (createServer + cors call), 367-376 (server.listen)
- server/dashboard.js lines 36-44 — note dashboard's listen pattern to mirror the loopback bind decision
</read_first>
<files>server/orchestrator.js</files>
<action>
1. Change `server.listen(PORT, ...)` (line 367) to `server.listen(PORT, '127.0.0.1', ...)` so the socket is loopback-only, mirroring how a local-only dev server must bind. Add the boot log line `   Bind:  127.0.0.1 (loopback only)`.
2. Delete the `cors()` function (lines 37-41) and its call at line 349. Cross-origin browser access is not a feature this server needs — it is only ever called by the same-machine dashboard.
3. Remove the `if (method === 'OPTIONS')` preflight branch at line 353 (no CORS → no preflight needed); keep returning 204 only if a stray OPTIONS arrives, or drop to the 404 fallthrough — drop it, simplest.
</action>
<acceptance_criteria>
- `grep -n "0.0.0.0" server/orchestrator.js` returns nothing.
- `grep -c "Access-Control-Allow-Origin" server/orchestrator.js` returns 0.
- `grep -n "listen(PORT, '127.0.0.1'" server/orchestrator.js` returns 1 match.
</acceptance_criteria>
<verify>
<automated>
grep -q "listen(PORT, '127.0.0.1'" server/orchestrator.js && ! grep -q "Access-Control-Allow-Origin" server/orchestrator.js && node -c server/orchestrator.js && echo PASS
</automated>
</verify>
<done>Orchestrator binds loopback only and serves no CORS headers; `node -c` parses clean.</done>
<evidence>lines: server/orchestrator.js:37-41 (cors helper), :349 (cors call), :353 (OPTIONS branch), :367 (listen call with no host arg — the exact bug)</evidence>
</task>

<task id="29.1.2" type="auto">
<title>Add a per-session auth token gate on all mutating + streaming endpoints</title>
<read_first>
- server/orchestrator.js lines 43-54 (json/parseBody helpers), 254-344 (handleRun/handleCleanSessions/handleStop), 348-365 (router), 367-376 (listen + boot log)
</read_first>
<files>server/orchestrator.js</files>
<action>
1. Near the config block (after line 26), add: `const crypto = require('crypto');` and `const AUTH_TOKEN = process.env.ORCH_TOKEN || crypto.randomBytes(24).toString('hex');`.
2. Add a `function authed(req)` helper that returns `true` only when the request carries the token — accept it via the `Authorization: Bearer <token>` header OR (for the EventSource SSE endpoint, which cannot set headers) a `?token=` query param. Use a constant-time compare: `crypto.timingSafeEqual` on equal-length Buffers, guarding the length-mismatch case first.
3. In the router (lines 354-362), reject before dispatch: for `/api/run`, `/api/stop`, `/api/clean-sessions`, and `/api/stream/`, if `!authed(req)` then `json(res, 401, { error: 'unauthorized' })` and return. Leave `/api/status` gated too — it leaks session detail. (Net: every route requires the token.)
4. In the boot log (lines 368-375) print the token so the dashboard process / user can read it: `   Token: ` + AUTH_TOKEN. Document with a comment that the dashboard must pass this token on every call.
</action>
<acceptance_criteria>
- `grep -n "timingSafeEqual" server/orchestrator.js` returns 1+ match.
- `grep -c "401" server/orchestrator.js` returns >= 1.
- Token check covers all of: /api/run, /api/stop, /api/clean-sessions, /api/stream, /api/status.
</acceptance_criteria>
<verify>
<automated>
grep -q "timingSafeEqual" server/orchestrator.js && grep -q "ORCH_TOKEN" server/orchestrator.js && node -c server/orchestrator.js && node --test test/orchestrator-security.test.cjs 2>/dev/null; node -c server/orchestrator.js && echo PASS
</automated>
</verify>
<done>Every endpoint rejects requests lacking a valid token with HTTP 401; token compared in constant time.</done>
<evidence>lines: server/orchestrator.js:254-325 (handleRun spawns claude with --dangerously-skip-permissions — the RCE sink), :327-332 (handleCleanSessions deletes files unauthenticated), :354-362 (router with no auth check)</evidence>
</task>

<task id="29.1.3" type="auto">
<title>Validate storyId against path traversal before any filesystem use</title>
<read_first>
- server/orchestrator.js lines 160-185 (persistSession / loadLastSession build paths from storyId), 254-257 (handleRun reads storyId), 334-337 (handleStop), 355-357 (handleStream decodes storyId from URL)
</read_first>
<files>server/orchestrator.js</files>
<action>
1. Add `const STORY_ID_RE = /^[A-Za-z0-9._-]+$/;` and a helper `function validStoryId(id) { return typeof id === 'string' && id.length > 0 && id.length <= 128 && STORY_ID_RE.test(id); }`. The `.` is allowed by the charset but `..` traversal is blocked because the regex still permits no `/` — and `path.join(SESSIONS_DIR, '..')` would resolve up; so additionally reject any id where `id.includes('..')`.
2. In `handleRun` (after line 256) and `handleStop` (after line 336): if `!validStoryId(storyId)` → `json(res, 400, { error: 'invalid storyId' })` and return.
3. In `handleStream` (entry, after the decode at line 356): if `!validStoryId(storyId)` → `res.writeHead(400); res.end('invalid storyId'); return;` before any `loadLastSession` call.
4. As defense-in-depth in `persistSession` (line 166) and `loadLastSession` (line 178): after building the path, assert `path.resolve(file).startsWith(SESSIONS_DIR + path.sep)` and bail otherwise — mirrors the path-traversal guard in `server/lib/api.js:132-141`.
</action>
<acceptance_criteria>
- `grep -n "STORY_ID_RE" server/orchestrator.js` returns the regex definition + uses in handleRun, handleStop, handleStream.
- `grep -c "includes('..')" server/orchestrator.js` returns >= 1.
- Resolved-path startsWith guard present in persistSession and loadLastSession.
</acceptance_criteria>
<verify>
<automated>
grep -q "STORY_ID_RE" server/orchestrator.js && grep -q "validStoryId" server/orchestrator.js && node -c server/orchestrator.js && echo PASS
</automated>
</verify>
<done>A storyId with `/`, `..`, or over 128 chars is rejected with HTTP 400 before reaching `path.join`; resolved paths asserted inside SESSIONS_DIR.</done>
<evidence>lines: server/orchestrator.js:166 (path.join(SESSIONS_DIR, storyId + ...) — arbitrary write sink), :178-183 (loadLastSession reads from storyId-derived path), :356 (decodeURIComponent(storyId) with no validation)</evidence>
</task>

<task id="29.1.4" type="auto">
<title>Add the orchestrator security regression test suite</title>
<read_first>
- test/bash-guard-hook.test.cjs lines 1-25 — node:test + spawnSync harness style to mirror
- server/orchestrator.js after tasks 29.1.1-29.1.3 are applied
</read_first>
<files>test/orchestrator-security.test.cjs</files>
<action>
Create `test/orchestrator-security.test.cjs` using `node:test`. Start the orchestrator as a child process with `ORCH_TOKEN=testtoken123` and `CLAUDE_BIN=true` (so no real claude spawn) on PORT 7799, wait for the boot log, then assert with `http` requests against `127.0.0.1:7799`:
1. `GET /api/status` with NO Authorization header → status 401.
2. `GET /api/status` with `Authorization: Bearer testtoken123` → status 200.
3. `POST /api/run` body `{storyId:'../../etc/x',cmd:'x'}` WITH valid token → status 400 (invalid storyId).
4. `POST /api/run` body `{storyId:'good-1',cmd:'x'}` with NO token → status 401.
5. `POST /api/clean-sessions` with NO token → status 401.
6. `GET /api/stream/good-1?token=wrongtoken` → status 401.
Tear down the child process in an `after()` hook (SIGTERM). Use a small `request(opts, body)` promise helper. Keep the suite under ~120 lines.
</action>
<acceptance_criteria>
- `node --test test/orchestrator-security.test.cjs` exits 0 with all assertions passing.
- The suite proves: loopback bind reachable, missing-token rejected, traversal storyId rejected.
</acceptance_criteria>
<verify>
<automated>
node --test test/orchestrator-security.test.cjs && echo PASS
</automated>
</verify>
<done>`node --test test/orchestrator-security.test.cjs` passes; the unauthenticated-call and traversal exploits are proven closed.</done>
<evidence>creates: test/orchestrator-security.test.cjs — no orchestrator test exists today (only test/bash-guard-hook.test.cjs covers hooks); the RCE fix needs its own regression coverage.</evidence>
</task>

</tasks>

<verification>
- `node -c server/orchestrator.js` parses clean.
- `node --test test/orchestrator-security.test.cjs` passes.
- `node --test` across the repo shows no new failures.
- `grep "0.0.0.0\|Access-Control-Allow-Origin" server/orchestrator.js` returns nothing.
</verification>

<success_criteria>
- Orchestrator listens on 127.0.0.1 only — a remote/LAN host gets connection refused.
- `/api/run`, `/api/stop`, `/api/clean-sessions`, `/api/stream`, `/api/status` all reject token-less requests with 401.
- Traversal `storyId` (`../`, `..`, `/`) rejected with 400 before any filesystem call.
- Regression suite locks all three properties.
</success_criteria>

<output>
Create `.planning/phases/29-security-hardening-orchestrator-rce-bash-guard-bypasses-file-read-scoping/29-1-SUMMARY.md`
</output>
