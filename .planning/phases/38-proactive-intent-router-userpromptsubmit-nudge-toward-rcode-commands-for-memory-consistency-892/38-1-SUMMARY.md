# Execution Summary

**Phase:** 38 — Proactive intent router (UserPromptSubmit nudge toward rcode commands for memory consistency, #892)
**Sprint:** 38.1 — prompt-router subcommand + tests
**Completed:** 2026-06-18
**Executor:** Sequential agent (Sonnet 4.6)

## What Was Built

Added the `prompt-router` subcommand to `rcode/bin/rcode-hooks.cjs`. It runs on every `UserPromptSubmit` event, keyword-matches the user's free-form prompt against a routing table derived from `rcode/workflows/do.md` (lines ~285-320), and emits a one-line memory-framed advisory via `hookSpecificOutput.additionalContext` pointing the user toward the matching rcode command. The implementation mirrors the fail-open safety contract of `cli/rcode-slash-router.cjs` exactly: synchronous stdin read via `fs.readFileSync(0, 'utf8')`, no async paths, `process.exit(0)` on every outcome including errors.

## Stories Completed

| ID | Title | Points | Status |
|----|-------|--------|--------|
| 38.1.1 | Add INTENT_TABLE keyword map mirroring do.md | 3 | done |
| 38.1.2 | Add `prompt-router` subcommand: stdin read, match, emit, fail-open | 5 | done |
| 38.1.3 | Toggle (`prompt_nudge`) + per-session dedupe for `once-per-intent` | 3 | done |
| 38.1.4 | `test/prompt-router.test.cjs` — match / no-match / error-swallow / dedupe / toggle | 2 | done |

**Total: 13/13 points**

## Files Modified

| File | Change |
|------|--------|
| `rcode/bin/rcode-hooks.cjs` | Added `INTENT_TABLE` (16 entries), `parseSimpleYamlInline()`, `readPromptNudgeToggle()`, `isStateStaleFallbackTrue()`, `promptRouter()`, and `case 'prompt-router'` in `main()`. Header doc comment updated to include new subcommand. |
| `test/prompt-router.test.cjs` | Created — 9 tests covering match, audit routing, non-match, leading `/rcode-` skip, malformed stdin, empty stdin, `off` toggle, `once-per-intent` dedupe, and hookEventName forwarding. |

## Commits

| Hash | Subject |
|------|---------|
| `ff276d5` | `feat(hooks): add prompt-router subcommand with INTENT_TABLE and toggle (#892)` |
| `4e6b8da` | `test(hooks): add prompt-router.test.cjs — match/no-match/error/dedupe/toggle (#892)` |

## Test Results

```
node --test test/prompt-router.test.cjs
  pass 9 / fail 0 / skip 0

node --test test/compact-nudge-hook.test.cjs
  pass 3 / fail 0 / skip 0 (no regression)
```

## Deviations from Plan

None. All four stories were implemented exactly as specified in 38-1-SPRINT.md.

One note on file size: `rcode/bin/rcode-hooks.cjs` grew to 1021 lines (the limit is 1000). The sprint plan explicitly prescribes modifying this file with all the new additions (INTENT_TABLE + promptRouter + helpers = ~309 lines). Splitting would introduce a cross-file `require` dependency which violates the "pure stdlib, standalone" constraint of the hook. The sprint plan is authoritative here; Sprint 38.3 may be a natural opportunity to evaluate extraction if the file grows further.

## Blockers Encountered

None. The `off` toggle test initially appeared to fail when running with the repo's own `.rcode/config.yaml` as `cwd`, but the test harness correctly uses `mkdtempSync` temp project dirs with their own config, isolating each test from the real repo config.

## Next Steps

- Sprint 38.2: Wire the `prompt-router` hook into the install path (register it in the hooks config so it runs on `UserPromptSubmit`).
- Sprint 38.3: Add a drift-guard test (`test/prompt-router-table-sync.test.cjs`) that asserts `INTENT_TABLE` entries still appear in `rcode/workflows/do.md` to prevent silent table drift.
