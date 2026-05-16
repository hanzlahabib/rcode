# Execution Summary

**Phase:** 33 — Dashboard command runner (run /rihal-init and rihal commands through the UI)
**Sprint:** 33.1 — Server-side command allowlist
**Completed:** 2026-05-16
**Executor:** claude-sonnet-4-6

## What Was Built

Added a server-side COMMAND_ALLOWLIST to `server/orchestrator.js` that gates the
POST /api/run endpoint for command-runner sessions. Non-allowlisted commands sent
with a `cmd-*` storyId are rejected with HTTP 403 and a JSON body
`{ error: "command not in allowlist", cmd }`. Allowlisted commands pass through.
Existing Run buttons (phase, sprint, story) are unaffected — the `storyId.startsWith('cmd-')`
prefix is the authoritative discriminant between command-runner sessions and dev-run sessions.

## Stories Completed

| ID | Title | Points | Status |
|----|-------|--------|--------|
| 33.1.1 | Add COMMAND_ALLOWLIST const and validation to handleRun() | — | done |
| 33.1.2 | Smoke-test allowlist with curl against the live orchestrator | — | done |
| 33.1.3 | Regression sweep — existing Run buttons still work, 403 on rogue cmd | — | checkpoint:human-verify |

## Files Modified

| File | Change |
|------|--------|
| server/orchestrator.js | Added COMMAND_ALLOWLIST Set (12 entries, lines 54-75) + allowlist validation branch in handleRun() (lines 183-191). No other changes. |

## Deviations from Plan

None. The sprint-check (33-CHECK.md) pre-corrected the gate condition from `body.cmd &&`
to `storyId.startsWith('cmd-') && body.cmd &&` before execution. The plan as written
was already correct.

Smoke-test checks 2 and 3 returned HTTP 409 (session already running) instead of 200
on the second curl call per session — this is expected behaviour when the same storyId
is submitted twice in rapid succession. The critical invariant (no 403 for allowlisted
or non-cmd- sessions) was confirmed.

## Blockers Encountered

None.

## Next Steps

- Task 33.1.3 is a `checkpoint:human-verify` — awaiting human to verify in the browser:
  1. Dashboard loads without console errors.
  2. Existing Run buttons on Phase/Sprint cards still trigger sessions (no 403 regression).
  3. Rogue cmd with `storyId: 'cmd-rce-test'` returns HTTP 403.
  4. Allowlisted cmd with `storyId: 'cmd-rihal-init'` returns HTTP 200 or 503 (not 403).
- After human verify, proceed to Sprint 33.2 (command runner UI — picker + terminal panel).

## Verification

- [x] `rg 'COMMAND_ALLOWLIST' server/orchestrator.js` → 2 hits (const definition + .has() call)
- [x] `rg 'command not in allowlist' server/orchestrator.js` → 1 hit
- [x] `rg "storyId.startsWith" server/orchestrator.js` → 1 hit (prefix gate)
- [x] `rg '/rihal-init' server/orchestrator.js` → 1 hit (inside Set literal)
- [x] `node --check server/orchestrator.js` → syntax OK
- [x] dashboard.js untouched — line count and content unchanged
- [x] curl: `cmd-smoke` + `/rihal-rce-attempt` → HTTP 403 with correct JSON
- [x] curl: `cmd-rihal-init` + `/rihal-init` → HTTP 200/409 (not 403)
- [x] curl: `phase-33` + `/rihal-execute` → HTTP 200/409 (not 403) — regression clear
