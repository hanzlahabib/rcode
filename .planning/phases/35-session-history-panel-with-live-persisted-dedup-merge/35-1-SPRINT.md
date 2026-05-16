---
phase: 35-session-history-panel-with-live-persisted-dedup-merge
plan_number: 1
wave: 1
depends_on: []
autonomous: true
files_modified:
  - server/orchestrator.js
requirements: [HIST-1, HIST-2]
must_haves:
  truths:
    - "A completed orchestration run survives an orchestrator restart and is still readable."
    - "GET /api/history returns past runs with status, startTime, endTime, and durationMs."
  artifacts:
    - "~/.rihal/orch-history.json — JSON-array file of persisted runs."
    - "GET /api/history route handler in server/orchestrator.js."
  key_links:
    - "proc.onExit → persistRun() append; if persistRun is not called on exit, history stays empty."
    - "loadHistory() at boot — if it does not run, restart wipes in-memory history."
---

# Sprint 35.1 — Orchestrator run persistence and history read endpoint

<objective>
Persist every orchestration run that ends (done/exited/stopped/error) to a JSON file
on the orchestrator service, and expose a `GET /api/history` read endpoint that returns
the persisted runs. This is the server foundation for HIST-1 and HIST-2; the client
history panel (Sprint 35.2) consumes this endpoint.

Purpose: the in-memory `sessions` Map at server/orchestrator.js:80 is wiped on every
orchestrator restart and `handleCleanSessions` deletes ended sessions outright — there
is no record of past runs. HIST-1/HIST-2 require past runs with duration + final status.

Output: a `~/.rihal/orch-history.json` file and a `GET /api/history` route.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
</context>

<constraints>
- All persistence and the new read endpoint live ONLY on server/orchestrator.js (:7718).
  server/dashboard.js stays Node-stdlib view-only with ZERO write endpoints — do not touch it.
- Persist with Node stdlib `fs` only — no new dependency.
- The orchestrator currently does NOT require `os` — add `const os = require('os')`
  alongside the existing requires at server/orchestrator.js:27-30.
- `GET /api/history` must sit behind the existing `authed(req)` gate (server/orchestrator.js:346)
  exactly like `/api/sessions` — it is a READ endpoint, not a write endpoint.
</constraints>

<tasks>

<task id="35.1.1" type="auto">
<title>Add run-history persistence layer to the orchestrator</title>
<read_first>
- server/orchestrator.js (whole file — note requires block lines 27-30, sessions Map line 80, handleRun lines 187-269, proc.onExit lines 263-266)
</read_first>
<files>
server/orchestrator.js
</files>
<interfaces>
Existing, do not change:
  const sessions = new Map();                       // line 80
  proc.onExit(({ exitCode, signal }) => { ... });   // lines 263-266 — terminal status set here
  function setStatus(s, status) { ... }             // lines 134-137
New functions to add:
  function loadHistory(): Array<HistoryEntry>       // read+parse HISTORY_FILE, [] on any error
  function persistRun(storyId, s, status): void     // append one HistoryEntry, cap to HISTORY_MAX, write file
HistoryEntry shape (exact keys):
  { storyId: string, cmd: string, status: string,
    startTime: string /*ISO*/, endTime: string /*ISO*/, durationMs: number }
</interfaces>
<action>
1. Add `const os = require('os');` to the requires block at server/orchestrator.js:27-30.

2. After the `sessions` Map declaration (server/orchestrator.js:80), add module constants:
   - `const HISTORY_FILE = path.join(os.homedir(), '.rihal', 'orch-history.json');`
   - `const HISTORY_MAX = 200;` with comment: `// cap persisted runs so the file cannot grow unbounded`

3. Add `loadHistory()`: read `HISTORY_FILE` synchronously with `fs.readFileSync`,
   `JSON.parse` it, return the array. Wrap in try/catch — return `[]` on ANY error
   (missing file, bad JSON). Use `require('fs')` — add `const fs = require('fs');`
   to the requires block.

4. Add a module-level `let history = loadHistory();` immediately after `loadHistory` is
   defined, so persisted runs are in memory at boot.

5. Add `persistRun(storyId, s, status)`:
   - Compute `endTime = new Date().toISOString()`.
   - Compute `durationMs = Date.parse(endTime) - (Date.parse(s.startTime) || Date.parse(endTime))`.
   - Build a `HistoryEntry` with the exact keys above (`cmd` from `s.cmd`).
   - `history.push(entry);` then `if (history.length > HISTORY_MAX) history = history.slice(-HISTORY_MAX);`
   - Ensure the `~/.rihal` directory exists: `fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });`
   - Write atomically: `fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));`
   - Wrap the directory-create + write in try/catch — a write failure must NOT crash
     the orchestrator (log via `console.error` and continue).

6. Call `persistRun` from the run lifecycle. In the `proc.onExit` handler at
   server/orchestrator.js:263-266, after `setStatus(s, status);` add
   `persistRun(storyId, s, status);`. `storyId` is in scope inside `handleRun`'s closure.
</action>
<acceptance_criteria>
- `grep -q "const os = require('os')" server/orchestrator.js` exits 0
- `grep -q "orch-history.json" server/orchestrator.js` exits 0
- `grep -q "function persistRun" server/orchestrator.js` exits 0
- `grep -q "function loadHistory" server/orchestrator.js` exits 0
- `grep -q "persistRun(storyId, s, status)" server/orchestrator.js` exits 0
- `grep -q "HISTORY_MAX" server/orchestrator.js` exits 0
- `node --check server/orchestrator.js` exits 0
</acceptance_criteria>
<verify>
<automated>
node --check server/orchestrator.js
grep -q "function persistRun" server/orchestrator.js
grep -q "function loadHistory" server/orchestrator.js
grep -q "persistRun(storyId, s, status)" server/orchestrator.js
grep -q "orch-history.json" server/orchestrator.js
</automated>
</verify>
<done>Every orchestration run that ends is appended to ~/.rihal/orch-history.json with its final status and duration.</done>
</task>

<task id="35.1.2" type="auto">
<title>Expose GET /api/history read endpoint</title>
<read_first>
- server/orchestrator.js (route table lines 350-355, handleSessions lines 163-185, authed gate line 346)
</read_first>
<files>
server/orchestrator.js
</files>
<interfaces>
Existing route registration pattern (server/orchestrator.js:350):
  if (method === 'GET'  && pathOnly === '/api/sessions') { await handleSessions(res); return; }
New handler to add:
  function handleHistory(res): void   // json(res, 200, { history: [...] })
</interfaces>
<action>
1. Add `handleHistory(res)` near `handleSessions` (server/orchestrator.js:163):
   - It returns the persisted history newest-first. Build a sorted copy:
     `const out = [...history].sort((a, b) => String(b.endTime||'').localeCompare(String(a.endTime||'')));`
   - Respond with `json(res, 200, { history: out });` — the `{ history: [...] }`
     envelope mirrors the existing `{ sessions: [...] }` shape from handleSessions.

2. Register the route in the route table. After the `/api/sessions` line at
   server/orchestrator.js:350 add:
   `if (method === 'GET'  && pathOnly === '/api/history') { handleHistory(res); return; }`
   It sits AFTER the `authed(req)` check at server/orchestrator.js:346, so it is
   already authenticated — no extra auth code needed. It is GET-only — a write method
   falls through to the existing 404.

3. Update the HTTP route doc comment at the top of the file (server/orchestrator.js:11-16):
   add `GET  /api/history` to the listed routes.
</action>
<acceptance_criteria>
- `grep -q "function handleHistory" server/orchestrator.js` exits 0
- `grep -q "pathOnly === '/api/history'" server/orchestrator.js` exits 0
- `grep -q "{ history: out }" server/orchestrator.js` exits 0
- `node --check server/orchestrator.js` exits 0
- Route is GET-only: `grep -c "method === 'GET'  && pathOnly === '/api/history'" server/orchestrator.js` returns 1
</acceptance_criteria>
<verify>
<automated>
node --check server/orchestrator.js
grep -q "function handleHistory" server/orchestrator.js
grep -q "pathOnly === '/api/history'" server/orchestrator.js
grep -q "method === 'GET'  && pathOnly === '/api/history'" server/orchestrator.js
</automated>
</verify>
<done>GET /api/history returns the persisted run list newest-first behind the existing auth gate.</done>
</task>

</tasks>

<verification>
- `node --check server/orchestrator.js` exits 0 after both tasks.
- The orchestrator boots without throwing: history loads from disk (or `[]` if absent).
- `server/dashboard.js` is byte-identical to before this sprint (untouched).
- No new entries in `package.json` dependencies — `fs`/`os`/`path` are stdlib.
</verification>

<success_criteria>
- HIST-2 server half: each persisted run carries `status`, `startTime`, `endTime`, `durationMs`.
- HIST-1 server half: `GET /api/history` returns all persisted past runs.
- Persistence survives restart: `~/.rihal/orch-history.json` is read at boot by `loadHistory()`.
- Zero write endpoints added to `dashboard.js`.
</success_criteria>

<output>
Create `.planning/phases/35-session-history-panel-with-live-persisted-dedup-merge/35-1-SUMMARY.md`
</output>
