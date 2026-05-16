---
phase: 33-dashboard-command-runner-run-init-and-rihal-commands-through-the-ui
sprint: 33.1
plan_number: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - server/orchestrator.js
autonomous: true
requirements: [phase-33-goal]
must_haves:
  truths:
    - "POST /api/run on the orchestrator (:7718) rejects any cmd not in the server-side COMMAND_ALLOWLIST with HTTP 403 and a JSON body { error: 'command not in allowlist', cmd } — verified by curl."
    - "POST /api/run with an allowlisted cmd (e.g. /rihal-init) succeeds (200) and spawns a PTY session as before — no regression to existing story/phase/sprint runs."
    - "The allowlist is a named const at the top of orchestrator.js, documented with a comment explaining it is the security boundary — grep-verifiable."
    - "node server/orchestrator.js boots clean; no console errors related to the allowlist change."
  artifacts:
    - "server/orchestrator.js — COMMAND_ALLOWLIST const + validation branch in handleRun()"
  key_links:
    - "handleRun() is server/orchestrator.js:166-211. The cmd assignment is line 187. Allowlist check inserts between line 169 (storyId validation) and line 176 (existing-session lookup)."
    - "STORY_ID_RE = /^[A-Za-z0-9._-]+$/ (line 52) — storyId validation is a separate check that stays untouched."
    - "Three HTTP routes are handled at lines 295-299; only POST /api/run is touched here."
---

<objective>
Add a server-side command allowlist to server/orchestrator.js that gates what the
POST /api/run endpoint will spawn when a cmd is explicitly supplied by the client.

Purpose: The orchestrator already accepts an arbitrary cmd string (line 187:
`const cmd = String(body.cmd || ...)`). Without a server-side allowlist the
dashboard becomes a free-form RCE over an authed endpoint. This sprint adds the
allowlist as the declared security boundary before any UI ships.

Output: orchestrator.js with a COMMAND_ALLOWLIST const and a validation branch in
handleRun() that returns 403 for non-allowlisted commands.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<tasks>

<task id="33.1.1" type="auto">
<title>Add COMMAND_ALLOWLIST const and validation to handleRun()</title>
<read_first>server/orchestrator.js (full file, 324 lines)</read_first>
<files>server/orchestrator.js</files>
<action>
Read the full file first. Then make two targeted edits:

EDIT 1 — Add COMMAND_ALLOWLIST const after the STORY_ID_RE line (line 52), before
the SCROLLBACK_MAX line (line 54). Insert the block:

```js
// Command allowlist — the SECURITY BOUNDARY for the dashboard command runner.
// Only commands listed here may be launched via the UI command picker.
// Slash-commands that launch dev work (rihal-dev-story, rihal-execute, etc.)
// are NOT listed here; they are composed by the UI itself via storyId, not
// by the command runner. This list covers read-mostly and informational rihal
// slash-commands that are safe to run from the browser without further context.
const COMMAND_ALLOWLIST = new Set([
  '/rihal-init',
  '/rihal-status',
  '/rihal-progress',
  '/rihal-help',
  '/rihal-health',
  '/rihal-next',
  '/rihal-show',
  '/rihal-list-plans',
  '/rihal-sprint-status',
  '/rihal-config',
  '/rihal-diff',
  '/rihal-stats',
]);
```

EDIT 2 — In handleRun() (starts at line 166), find the storyId validation block
(lines 168-169):

```js
const storyId = String(body.storyId || '').trim();
if (!validStoryId(storyId)) { json(res, 400, { error: 'invalid storyId' }); return; }
```

Immediately after that block, before the `if (!pty)` check, add the allowlist
validation. A cmd is user-supplied ONLY when the body.cmd field is explicitly
present and non-empty. When the body sends no cmd (or empty string), the
orchestrator falls back to the default `/rihal-dev-story ${storyId}` composition
(line 187) — that path MUST NOT be gated by the allowlist because it is the
existing story-run flow:

```js
// Gate the allowlist on command-runner sessions only.
// Command-runner sessions always use a storyId with the "cmd-" prefix
// (e.g. "cmd-rihal-init"). Existing dev-run sessions use storyIds such as
// "phase-33", "sprint-33.1", or a raw task id — never "cmd-*" — and MUST NOT
// be gated here, even though they also supply body.cmd explicitly.
// This prefix check is the authoritative discriminant between the two call paths.
if (storyId.startsWith('cmd-') && body.cmd && !COMMAND_ALLOWLIST.has(String(body.cmd).trim())) {
  json(res, 403, { error: 'command not in allowlist', cmd: String(body.cmd).trim() });
  return;
}
```

WHY this guard: all RunBtn calls (Phase, Sprint, Story cards) also send body.cmd
explicitly — the field is never absent in the current client. Gating on body.cmd
alone breaks every existing Run button. Gating on storyId prefix is safe because:
  - Command-runner sessions always set storyId = "cmd-" + slug.
  - Existing dev-run sessions use "phase-*", "sprint-*", or raw task IDs — never
    starting with "cmd-".
Position: after storyId is validated, before the pty availability check — fast fail.

AVOID:
- Do NOT use `body.cmd &&` as the sole gate — existing Run buttons always supply cmd.
- Do NOT gate the `/rihal-dev-story` path (sprint/phase/story runs).
- Do NOT change the pty.spawn call, session storage, or WebSocket logic.
- Do NOT change any other HTTP handler.
- Do NOT add any endpoint. dashboard.js is untouched.
</action>
<verify>
<automated>
cd /home/hanzla/development/rihal-code && node -e "
const src = require('fs').readFileSync('server/orchestrator.js','utf8');
const hasAllowlist = src.includes('COMMAND_ALLOWLIST');
const hasValidation = src.includes('command not in allowlist');
const hasAllowlistCheck = src.includes('COMMAND_ALLOWLIST.has(');
const hasPrefixGate = src.includes("storyId.startsWith('cmd-')");
const hasInit = src.includes('/rihal-init');
const hasStatus = src.includes('/rihal-status');
if (!hasAllowlist) throw new Error('COMMAND_ALLOWLIST const missing');
if (!hasValidation) throw new Error('403 allowlist rejection missing');
if (!hasAllowlistCheck) throw new Error('.has() check missing');
if (!hasPrefixGate) throw new Error('storyId prefix gate missing — BLOCKER: existing Run buttons would be rejected');
if (!hasInit) throw new Error('/rihal-init not in allowlist');
if (!hasStatus) throw new Error('/rihal-status not in allowlist');
console.log('OK — all allowlist markers present');
" && node -e "require('./server/orchestrator.js')" &
sleep 2 && kill %1 2>/dev/null; echo "syntax-check done"
</automated>
</verify>
<done>
- COMMAND_ALLOWLIST Set with >= 10 safe read-mostly commands is defined as a named
  const in orchestrator.js with a comment identifying it as the security boundary.
- handleRun() returns 403 JSON when storyId starts with "cmd-" AND cmd is not in
  the allowlist.
- Requests with non-cmd-* storyIds (phase-*, sprint-*, task IDs) are NOT gated —
  the existing Run buttons are unaffected.
- `node -e "require('./server/orchestrator.js')"` exits without syntax errors.
</done>
<evidence>
lines: server/orchestrator.js:52 — STORY_ID_RE const; allowlist inserts after this line.
lines: server/orchestrator.js:166-187 — handleRun() body where validation inserts.
lines: server/orchestrator.js:187 — `const cmd = String(body.cmd || ...)` — the
  line that shows cmd is only user-supplied when body.cmd is present.
grep: `rg 'COMMAND_ALLOWLIST' server/orchestrator.js` → 0 hits before edit (confirmed
  by reading the file). This task creates it.
</evidence>
</task>

<task id="33.1.2" type="auto">
<title>Smoke-test allowlist with curl against the live orchestrator</title>
<read_first>server/orchestrator.js (lines 315-324, boot/listen block)</read_first>
<files>server/orchestrator.js</files>
<action>
Start the orchestrator in the background to get the printed token, then run two
curl checks against it to confirm the allowlist works at the HTTP level.

Steps:
1. `node server/orchestrator.js 2>&1 &` — capture the TOKEN line from stdout
   (Token: <hex>) and read it into a shell variable.
2. curl POST /api/run with body `{"storyId":"smoke-test","cmd":"/rihal-init"}` and
   Authorization: Bearer <token> → expect HTTP 200 (or 503 if pty is unavailable)
   — either is acceptable, 403 is a FAIL.
3. curl POST /api/run with body `{"storyId":"smoke-test","cmd":"/rihal-rce-attempt"}`
   and same token → expect HTTP 403 with `"command not in allowlist"` in the body.
4. Kill the background orchestrator.

Do NOT proceed if either check produces the wrong HTTP status. If check 2 returns
403, the allowlist is accidentally gating the valid command — re-read the guard
condition (the `body.cmd &&` prefix is required). If check 3 returns anything other
than 403, the allowlist check is not executing.

Report the exact curl output for both checks in your summary.

AVOID:
- Do NOT leave the orchestrator process running after the checks.
- Do NOT modify any file in this task — this is a verification task only.
</action>
<verify>
<automated>
cd /home/hanzla/development/rihal-code && node server/orchestrator.js 2>&1 &
ORCH_PID=$!
sleep 1
TOK=$(node -e "
const crypto = require('crypto');
// Read token from env if set, else the file's random — but we started without env so
// we need to parse stdout. Instead, start with a known token:
" 2>/dev/null || true)
# Simpler: restart with a fixed token
kill $ORCH_PID 2>/dev/null
ORCH_TOKEN=test-sprint-33 node server/orchestrator.js &
ORCH_PID=$!
sleep 1
RESP403=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:7718/api/run \
  -H "Authorization: Bearer test-sprint-33" \
  -H "Content-Type: application/json" \
  -d '{"storyId":"smoke-test","cmd":"/rihal-rce-attempt"}')
kill $ORCH_PID 2>/dev/null
[ "$RESP403" = "403" ] && echo "OK — /rihal-rce-attempt correctly rejected with 403" || echo "FAIL — expected 403 got $RESP403"
</automated>
</verify>
<done>
- `curl POST /api/run { storyId: "cmd-smoke", cmd: "/rihal-rce-attempt" }` returns HTTP 403.
- `curl POST /api/run { storyId: "phase-33", cmd: "/rihal-execute" }` returns HTTP 200 or 503 (NOT 403 — no regression).
- `curl POST /api/run { storyId: "cmd-smoke", cmd: "/rihal-init" }` returns HTTP 200 or 503 (not 403).
</done>
<evidence>
lines: server/orchestrator.js:295-299 — route dispatcher; POST /api/run dispatches to
  handleRun. No other code path involved.
lines: server/orchestrator.js:315-316 — server.listen binds to 127.0.0.1:7718.
lines: server/orchestrator.js:49 — `AUTH_TOKEN = process.env.ORCH_TOKEN || ...` — lets
  the test inject a known token via env var.
</evidence>
</task>

<task id="33.1.3" type="checkpoint:human-verify">
<title>Regression sweep — existing Run buttons still work, 403 on rogue cmd</title>
<read_first>none</read_first>
<files></files>
<action>
Open the dashboard at http://localhost:7717. Navigate to the Orchestration tab.

Verify:
1. The page loads without console errors (open DevTools → Console before loading).
2. The existing "Run" button on any Phase or Sprint card still triggers a session
   correctly (the session appears in the Orchestration view with status "running"
   or "done" — NOT a 403 error toast).
3. In the browser console, run:
   ```js
   fetch('http://localhost:7718/api/run', {
     method: 'POST',
     headers: { 'Authorization': 'Bearer ' + window.__ORCH_TOKEN__, 'Content-Type': 'application/json' },
     body: JSON.stringify({ storyId: 'cmd-rce-test', cmd: '/rm-rf-world' }),
   }).then(r => r.json()).then(console.log)
   ```
   Expected: `{ error: "command not in allowlist", cmd: "/rm-rf-world" }` with HTTP 403.
   NOTE: storyId must start with "cmd-" — that is the prefix that activates the gate.

4. Run the same fetch with `storyId: 'cmd-rihal-init', cmd: '/rihal-init'`:
   Expected: HTTP 200 or HTTP 503 if pty unavailable — either is acceptable. A 403 is
   a FAIL (init is in the allowlist).

Report: pass/fail for each of the four checks above.
</action>
<evidence>
creates: none — this is a human verification task against the live dashboard.
</evidence>
</task>

</tasks>

<verification>
- `rg 'COMMAND_ALLOWLIST' server/orchestrator.js` → >= 2 hits (const definition + .has() call)
- `rg 'command not in allowlist' server/orchestrator.js` → 1 hit
- `rg "storyId.startsWith" server/orchestrator.js` → 1 hit (prefix gate)
- `rg '/rihal-init' server/orchestrator.js` → 1 hit (inside the Set literal)
- `node -e "require('./server/orchestrator.js')" 2>&1` → no output (clean parse)
- dashboard.js line count unchanged; no new routes added to it
</verification>

<success_criteria>
POST /api/run with a cmd-* storyId rejects non-allowlisted commands with 403. Allowlisted
commands pass through. The existing story/phase/sprint run path (storyId not starting
with "cmd-") is NOT gated — existing Run buttons are unaffected. The allowlist is
documented as the security boundary.
</success_criteria>

<output>
Create `.planning/phases/33-dashboard-command-runner-run-init-and-rihal-commands-through-the-ui/33-1-SUMMARY.md`
</output>
