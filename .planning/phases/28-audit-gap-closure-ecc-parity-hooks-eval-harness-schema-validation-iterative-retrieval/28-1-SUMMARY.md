# Execution Summary

**Phase:** 28 — Audit Gap Closure (ECC parity: hooks, eval harness, schema validation, iterative retrieval)
**Sprint:** 28-1 — Lifecycle hooks expansion
**Completed:** 2026-05-15
**Executor:** rcode sprint executor

## What Was Built

Expanded `rcode/bin/rcode-hooks.cjs` from 4 handlers to 8 by adding four
lifecycle handlers, closing the hooks-parity gap found auditing against
`everything-claude-code`:

- **pre-compact** (#743) — PreCompact hook. Reads `.rcode/state.json` and, when a
  phase is active, writes a `HANDOFF.json` pointer (`generated_at`, `reason`,
  `phase`, `current_plan`, `current_sprint`) atomically (temp + rename). No-op
  when no phase is active. Never blocks compaction.
- **stop-verify** (#744) — Stop hook. Collects files changed during the response
  (from payload, falling back to `git diff --name-only`), syntax-checks each
  `.js/.cjs/.mjs` (`node --check`) and `.json` (`JSON.parse`), and surfaces
  failures to stderr with a non-zero exit. Advisory — never auto-fixes, never
  exits 2.
- **cost-track** (#745) — Stop hook. Appends one JSON line per response to
  `.rcode/telemetry/cost.jsonl` (`ts`, `input_tokens`, `output_tokens`, optional
  `cache_*`). No-op when no usage block is present.
- **compact-nudge** (#749) — PreToolUse:Edit|Write hook. Per-session call counter
  in `os.tmpdir()`; once the count crosses `RCODE_NUDGE_THRESHOLD` (default 50)
  prints an advisory suggesting `/rcode-trim` or `/clear`. Always exits 0.

Registered new matchers in `settings-hooks.json` (PreCompact, Stop with two hook
commands, second Edit|Write hook) and documented all 8 handlers in
`enable-hooks.md`. Updated `session-report.md` to prefer measured token totals
from `cost.jsonl` when present, with the existing heuristic estimate retained as
a labeled fallback.

## Stories Completed

| ID  | Title | Status |
|-----|-------|--------|
| 1.1 | Create the 4 hook test files (stubs first) | done |
| 1.2 | Add the `pre-compact` handler (#743) | done |
| 1.3 | Add the `stop-verify` handler (#744) | done |
| 1.4 | Add the `cost-track` handler (#745) + update session-report.md | done |
| 1.5 | Add `compact-nudge` (#749), register matchers, update enable-hooks.md | done |

## Files Modified

| File | Change |
|------|--------|
| rcode/bin/rcode-hooks.cjs | +4 handlers, +4 switch cases, updated header + usage string |
| rcode/templates/settings-hooks.json | PreCompact + Stop matchers, 2nd Edit|Write hook |
| rcode/workflows/enable-hooks.md | purpose + confirmation enumerate all 8 handlers |
| rcode/workflows/session-report.md | measured-vs-estimated token reporting branch |
| test/precompact-hook.test.cjs | new — 3 tests |
| test/stop-verify-hook.test.cjs | new — 3 tests |
| test/cost-track-hook.test.cjs | new — 4 tests |
| test/compact-nudge-hook.test.cjs | new — 3 tests |

## Deviations from Plan

- The SPRINT.md notes Tasks 1.2–1.5 edit `rcode-hooks.cjs` sequentially to avoid
  merge conflicts. Since this was a single execution, all four handlers and their
  `main()` switch cases were added in one coordinated edit (functions inserted
  before `main()`, cases added together). Behavior and acceptance criteria per
  task are unchanged; each task's automated verify was run after the edit.
- SPRINT.md line-number references for the `bash-guard` case (~292) were stale;
  handlers were located by content as instructed. The file's current state
  (hardened `bash-guard` + `pre-edit`/`pre-workflow`/`post-commit`) was read
  before editing.

## Blockers Encountered

None.

## Verification

- Task 1.1: `node --check` on all 4 test files — exit 0.
- Task 1.2: `node --check rcode-hooks.cjs` + `node --test precompact-hook.test.cjs` — pass.
- Task 1.3: `node --check` + `node --test stop-verify-hook.test.cjs` — pass.
- Task 1.4: `node --check` + `grep cost.jsonl session-report.md` + `node --test cost-track-hook.test.cjs` — pass.
- Task 1.5: `node --check` + `JSON.parse(settings-hooks.json)` + matcher count = 4 + `grep compact-nudge enable-hooks.md` + `node --test compact-nudge-hook.test.cjs` — pass.
- Sprint verification: `grep -c "case '"` returns 8; settings-hooks.json valid JSON with PreCompact/Stop/dual Edit|Write matchers; all 4 new hook test files pass; bash-guard tests still green.
- Full suite (`node --test`): only the 3 known-baseline failures remain — `scope-history-parity` (kanban/orchestrator scopes from Phase 27), `broken @-references`, `command-workflow @-includes`. No new failures introduced.

## Next Steps

Continue Phase 28 — remaining sprints cover the eval harness, schema validation,
and iterative retrieval gaps.
