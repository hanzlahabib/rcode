---
phase: 28
plan_number: 1
wave: 1
depends_on: []
files_modified:
  - rcode/bin/rcode-hooks.cjs
  - rcode/templates/settings-hooks.json
  - rcode/workflows/enable-hooks.md
  - rcode/workflows/session-report.md
  - test/precompact-hook.test.cjs
  - test/stop-verify-hook.test.cjs
  - test/cost-track-hook.test.cjs
  - test/compact-nudge-hook.test.cjs
autonomous: true
requirements: [REQ-743, REQ-744, REQ-745, REQ-749]
must_haves:
  truths:
    - "A simulated PreCompact event refreshes HANDOFF.json with the current phase/plan pointer."
    - "A Stop event on a response that edited a syntactically broken .cjs surfaces the failure."
    - "Each completed response appends one usage record to .rcode/telemetry/cost.jsonl."
    - "session-report reports measured token totals when cost.jsonl exists."
    - "After N Edit/Write calls the compact-nudge hook prints an advisory and exits 0."
  artifacts:
    - rcode/bin/rcode-hooks.cjs (4 new handlers: pre-compact, stop-verify, cost-track, compact-nudge)
    - rcode/templates/settings-hooks.json (PreCompact + Stop matchers)
    - .rcode/telemetry/cost.jsonl (created at runtime by cost-track)
  key_links:
    - "settings-hooks.json matchers must reference the exact subcommand names added to rcode-hooks.cjs."
    - "stop-verify and cost-track share the single Stop matcher — both run on response completion."
    - "enable-hooks.md purpose text must enumerate every registered handler."
---

<objective>
Expand `rcode-hooks.cjs` from 4 handlers (pre-edit, pre-workflow, post-commit, bash-guard) to 8 by adding lifecycle handlers: `pre-compact` (#743), `stop-verify` (#744), `cost-track` (#745), `compact-nudge` (#749). Register the new matchers in `settings-hooks.json`, update `enable-hooks.md` and `session-report.md`, and add a test file per handler.
Purpose: Close the lifecycle-hooks parity gap found auditing against `everything-claude-code` — handoff freshness on compaction, post-response verification, measured cost tracking, and a context-budget nudge.
Output: 4 new handlers, 2 new matchers, 4 new test files, 2 updated workflows.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.rcode/state.json
</context>

<notes>
#742 (bash-guard) is ALREADY shipped — `rcode/bin/rcode-hooks.cjs:190-274`, `settings-hooks.json:23-31`, tested by `test/bash-guard-hook.test.cjs`. Do NOT re-implement it. It is the pattern to copy: `readInputJson()`, `process.exit(0|2)`, pure stdlib, no deps.
Tasks 1.2–1.5 all edit `rcode/bin/rcode-hooks.cjs` — they MUST run sequentially in this order to avoid merge conflicts on the same file.
</notes>

<tasks>

### Task 1.1 — Create the 4 hook test files (stubs first)
<read_first>
- test/bash-guard-hook.test.cjs
- rcode/bin/rcode-hooks.cjs
</read_first>
<files>
test/precompact-hook.test.cjs
test/stop-verify-hook.test.cjs
test/cost-track-hook.test.cjs
test/compact-nudge-hook.test.cjs
</files>
<action>
Create 4 `node --test` files following the structure of `test/bash-guard-hook.test.cjs` exactly (require `node:test`, `node:assert`, `node:child_process` spawnSync, resolve `HOOK` to `../rcode/bin/rcode-hooks.cjs`).

`test/precompact-hook.test.cjs`: a `runHook(subcommand, payload)` helper that spawns `rcode-hooks.cjs pre-compact` with JSON stdin. Tests: (a) with no active phase in a temp `.rcode/state.json` exits 0 and writes nothing; (b) with an active phase, after running, a `HANDOFF.json` exists containing the current phase number and current_plan. Use a temp dir (`fs.mkdtempSync`) with a fixture state.json so the repo's real state is untouched; pass the temp dir as `cwd` to spawnSync.

`test/stop-verify-hook.test.cjs`: tests that (a) a payload listing a changed `.cjs` file with valid syntax exits 0; (b) a payload listing a changed `.cjs` with a syntax error exits non-zero AND prints the file path to stderr; (c) an empty changed-files list exits 0.

`test/cost-track-hook.test.cjs`: tests that (a) a Stop payload with a `usage` block (input_tokens/output_tokens) appends exactly one JSON line to `<cwd>/.rcode/telemetry/cost.jsonl`; (b) two invocations append two lines; (c) each line parses as JSON and has keys `ts`, `input_tokens`, `output_tokens`. Use a temp cwd.

`test/compact-nudge-hook.test.cjs`: tests that (a) below the threshold the hook exits 0 and prints nothing; (b) once the call count crosses the threshold the hook exits 0 AND prints an advisory mentioning `/rcode-trim` or `/clear`; (c) the threshold honors a `RCODE_NUDGE_THRESHOLD` env var. Use a temp counter file location via env or temp cwd.

These tests WILL FAIL until Tasks 1.2–1.5 land — that is expected and correct (test-first).
</action>
<acceptance_criteria>
- All 4 files exist and are syntactically valid: `for f in test/precompact-hook.test.cjs test/stop-verify-hook.test.cjs test/cost-track-hook.test.cjs test/compact-nudge-hook.test.cjs; do node --check "$f"; done` exits 0.
- Each file requires `node:test` and references `rcode/bin/rcode-hooks.cjs`.
</acceptance_criteria>
<verify>
<automated>
for f in test/precompact-hook.test.cjs test/stop-verify-hook.test.cjs test/cost-track-hook.test.cjs test/compact-nudge-hook.test.cjs; do node --check "$f" || exit 1; done
</automated>
</verify>
<done>Four hook test files exist, pass `node --check`, and define the behavioral contract for the handlers built in Tasks 1.2–1.5.</done>

### Task 1.2 — Add the `pre-compact` handler (#743)
<read_first>
- rcode/bin/rcode-hooks.cjs
- rcode/workflows/resume-work.md
- .rcode/state.json
</read_first>
<files>
rcode/bin/rcode-hooks.cjs
</files>
<interfaces>Extends `rcode-hooks.cjs`: add `async function preCompact()` and a `case 'pre-compact':` in the `main()` switch (alongside the existing `bash-guard` case at line ~292).</interfaces>
<action>
Add `async function preCompact()` modeled on `bashGuard()`. It reads stdin JSON (the PreCompact event payload), then reads `.rcode/state.json` from `process.cwd()`. If the file is missing OR has no active phase (no `current_phase` / `phases` array empty / no phase with `status: "executing"` or matching `current_phase`), print nothing and `process.exit(0)` — no-op. Otherwise build a `HANDOFF.json` object at `<cwd>/HANDOFF.json` containing at minimum: `{ generated_at: ISO timestamp, reason: "pre-compact", phase: <current phase number/name>, current_plan: <state.current_plan>, current_sprint: <state.current_sprint> }`. Write it atomically (write to a temp path then `fs.renameSync`). Exit 0. Wrap everything in try/catch; on error print `Hook error:` to stderr and exit 1 (same as siblings — never block compaction).
Register `case 'pre-compact': await preCompact(); break;` in `main()` and add `pre-compact` to the usage string in the `default:` case.
</action>
<acceptance_criteria>
- `grep -c "function preCompact" rcode/bin/rcode-hooks.cjs` returns 1.
- `grep -c "case 'pre-compact'" rcode/bin/rcode-hooks.cjs` returns 1.
- `node --check rcode/bin/rcode-hooks.cjs` exits 0.
- `node --test test/precompact-hook.test.cjs` passes.
</acceptance_criteria>
<verify>
<automated>
node --check rcode/bin/rcode-hooks.cjs && node --test test/precompact-hook.test.cjs
</automated>
</verify>
<done>A simulated PreCompact event refreshes HANDOFF.json with the active phase/plan pointer, and is a no-op when no phase is active.</done>

### Task 1.3 — Add the `stop-verify` handler (#744)
<read_first>
- rcode/bin/rcode-hooks.cjs
- scripts/dogfood-check.sh
</read_first>
<files>
rcode/bin/rcode-hooks.cjs
</files>
<interfaces>Extends `rcode-hooks.cjs`: add `async function stopVerify()` and a `case 'stop-verify':` in `main()`.</interfaces>
<action>
Add `async function stopVerify()`. It reads the Stop event stdin JSON and extracts the list of files changed during the response. Determine changed files from the payload if present; otherwise fall back to `git diff --name-only` (spawnSync, cwd = process.cwd()). Run a batch check ONCE over the changed set:
- for each `.js`/`.cjs`: `spawnSync(process.execPath, ['--check', file])` — collect failures.
- for each `.json`: `JSON.parse(fs.readFileSync(file))` in a try/catch — collect failures.
If the changed set is empty, exit 0 silently. If any check failed, print each failing file + the parser/syntax error to stderr and exit 1 (advisory failure surface — never auto-fix, never exit 2/block). If all pass, exit 0. Wrap in try/catch → `Hook error:` + exit 1.
Register `case 'stop-verify':` in `main()` and add to the usage string.
</action>
<acceptance_criteria>
- `grep -c "function stopVerify" rcode/bin/rcode-hooks.cjs` returns 1.
- `grep -c "case 'stop-verify'" rcode/bin/rcode-hooks.cjs` returns 1.
- `node --check rcode/bin/rcode-hooks.cjs` exits 0.
- `node --test test/stop-verify-hook.test.cjs` passes.
</acceptance_criteria>
<verify>
<automated>
node --check rcode/bin/rcode-hooks.cjs && node --test test/stop-verify-hook.test.cjs
</automated>
</verify>
<done>A Stop event on a response that edited a broken .cjs surfaces the file and error to stderr; clean exit when nothing changed.</done>

### Task 1.4 — Add the `cost-track` handler (#745) and update session-report.md
<read_first>
- rcode/bin/rcode-hooks.cjs
- rcode/workflows/session-report.md
</read_first>
<files>
rcode/bin/rcode-hooks.cjs
rcode/workflows/session-report.md
</files>
<interfaces>Extends `rcode-hooks.cjs`: add `async function costTrack()` and a `case 'cost-track':` in `main()`.</interfaces>
<action>
Add `async function costTrack()`. It reads the Stop event stdin JSON and extracts the per-response token usage (`usage.input_tokens`, `usage.output_tokens`, and any `cache_*` fields if present). If no usage block exists, exit 0 silently. Otherwise append ONE line of JSON to `<cwd>/.rcode/telemetry/cost.jsonl` — create the `.rcode/telemetry/` directory with `fs.mkdirSync({recursive:true})` if missing, then `fs.appendFileSync` a single-line record `{ ts: ISO, input_tokens, output_tokens, ... }` followed by `\n`. Exit 0. Wrap in try/catch → exit 1 (never block).
Register `case 'cost-track':` in `main()` and add to the usage string.

Then update `rcode/workflows/session-report.md`: in the token-usage step, add a branch — `if .rcode/telemetry/cost.jsonl exists`, sum the `input_tokens`/`output_tokens` across all lines and report MEASURED totals (label them "measured"); otherwise fall back to the existing heuristic multiplier estimate (label "estimated"). Keep the existing heuristic prose as the fallback path — do not delete it.
</action>
<acceptance_criteria>
- `grep -c "function costTrack" rcode/bin/rcode-hooks.cjs` returns 1.
- `grep -c "case 'cost-track'" rcode/bin/rcode-hooks.cjs` returns 1.
- `grep -q "cost.jsonl" rcode/workflows/session-report.md` succeeds.
- `node --check rcode/bin/rcode-hooks.cjs` exits 0.
- `node --test test/cost-track-hook.test.cjs` passes.
</acceptance_criteria>
<verify>
<automated>
node --check rcode/bin/rcode-hooks.cjs && grep -q "cost.jsonl" rcode/workflows/session-report.md && node --test test/cost-track-hook.test.cjs
</automated>
</verify>
<done>Each completed response appends a usage record to cost.jsonl, and session-report uses measured totals when the log exists.</done>

### Task 1.5 — Add the `compact-nudge` handler (#749), register matchers, update enable-hooks.md
<read_first>
- rcode/bin/rcode-hooks.cjs
- rcode/templates/settings-hooks.json
- rcode/workflows/enable-hooks.md
</read_first>
<files>
rcode/bin/rcode-hooks.cjs
rcode/templates/settings-hooks.json
rcode/workflows/enable-hooks.md
</files>
<interfaces>Extends `rcode-hooks.cjs`: add `async function compactNudge()` and a `case 'compact-nudge':` in `main()`. Extends `settings-hooks.json`: a `PreCompact` matcher, a `Stop` matcher array, and an extra hook entry under the existing `Edit|Write` PreToolUse matcher.</interfaces>
<action>
Add `async function compactNudge()`. It reads stdin JSON. Maintain a per-session call counter in a temp file at `path.join(os.tmpdir(), 'rcode-nudge-' + (session id from payload || 'default') + '.count')`. Increment the count each call. Read threshold from `process.env.RCODE_NUDGE_THRESHOLD` (parsed int) defaulting to `50`. If the post-increment count crosses (== or first exceeds) the threshold, print an advisory to stderr suggesting `/rcode-trim` or `/clear` to reclaim context budget. NEVER block — always `process.exit(0)`. Wrap in try/catch → exit 0 (advisory hook must never break the session).
Register `case 'compact-nudge':` in `main()` + usage string.

In `rcode/templates/settings-hooks.json`:
- Add a 2nd hook entry to the EXISTING `PreToolUse` `Edit|Write` matcher object: `{ "type": "command", "command": "node .rcode/bin/rcode-hooks.cjs compact-nudge" }`.
- Add a new top-level `PreCompact` array with one matcher (matcher `""` or omitted per Claude Code schema) running `node .rcode/bin/rcode-hooks.cjs pre-compact`.
- Add a `Stop` array with one matcher running TWO hook commands: `node .rcode/bin/rcode-hooks.cjs stop-verify` and `node .rcode/bin/rcode-hooks.cjs cost-track`.
Keep the file as valid JSON.

In `rcode/workflows/enable-hooks.md`: update the `<purpose>` paragraph to enumerate all 8 handlers (add pre-compact, stop-verify, cost-track, compact-nudge with a one-line description each).
</action>
<acceptance_criteria>
- `grep -c "function compactNudge" rcode/bin/rcode-hooks.cjs` returns 1.
- `node -e "JSON.parse(require('fs').readFileSync('rcode/templates/settings-hooks.json','utf8'))"` exits 0.
- `grep -c "rcode-hooks.cjs compact-nudge\|rcode-hooks.cjs pre-compact\|rcode-hooks.cjs stop-verify\|rcode-hooks.cjs cost-track" rcode/templates/settings-hooks.json` returns 4.
- `grep -q "compact-nudge" rcode/workflows/enable-hooks.md` succeeds.
- `node --test test/compact-nudge-hook.test.cjs` passes.
</acceptance_criteria>
<verify>
<automated>
node --check rcode/bin/rcode-hooks.cjs && node -e "JSON.parse(require('fs').readFileSync('rcode/templates/settings-hooks.json','utf8'))" && node --test test/compact-nudge-hook.test.cjs
</automated>
</verify>
<done>The compact-nudge hook prints an advisory after the threshold and exits 0; all 4 new handlers are registered in settings-hooks.json and documented in enable-hooks.md.</done>

</tasks>

<verification>
- All 8 handlers present: `grep -c "case '" rcode/bin/rcode-hooks.cjs` returns 8.
- `node --check rcode/bin/rcode-hooks.cjs` exits 0.
- `settings-hooks.json` is valid JSON with PreCompact, Stop, and dual-hook Edit|Write matchers.
- `node --test test/precompact-hook.test.cjs test/stop-verify-hook.test.cjs test/cost-track-hook.test.cjs test/compact-nudge-hook.test.cjs` — all pass.
- `node --test test/bash-guard-hook.test.cjs` — still passes (no regression on #742).
</verification>

<success_criteria>
- 4 new lifecycle handlers registered, tested, and documented.
- session-report.md reports measured token usage when cost.jsonl exists.
- No existing handler behavior changed; bash-guard tests still green.
</success_criteria>

<output>
Create `.planning/phases/28-audit-gap-closure-ecc-parity-hooks-eval-harness-schema-validation-iterative-retrieval/28-1-SUMMARY.md`
</output>
