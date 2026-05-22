# Sprint 29-2 Summary — Bash-Guard Bypass Hardening

**Phase:** 29 — Security Hardening
**Sprint:** 29.2
**Requirement:** REQ-753 (issue #753)
**Branch:** audit-gap-closure
**Status:** Complete

## Objective

Close two bypasses in the `bash-guard` PreToolUse hook (`rcode/bin/rcode-hooks.cjs`):

1. `RCODE_PUSH_OK` was matched as a bare substring anywhere in the command, so `echo RCODE_PUSH_OK; git push` un-gated an unapproved push.
2. A `+`-prefixed refspec force-push (`git push origin +main`) matched neither `--force` nor `-f` and slipped through the force-push block.

## Tasks Completed

| Task | Title | Result |
| ---- | ----- | ------ |
| 29.2.1 | Anchor `RCODE_PUSH_OK` as a real env-var prefix | Done — substring check replaced with `/^\s*RCODE_PUSH_OK=1(\s|$)/` |
| 29.2.2 | Detect `+`-refspec force-push; document guard as best-effort | Done — token scan after `push`, routed to force block; doc comment amended |
| 29.2.3 | Add bash-guard bypass regression tests | Done — 3 new test cases added, all 12 green |

## Changes

- **`rcode/bin/rcode-hooks.cjs`**
  - Token check anchored: only a leading `RCODE_PUSH_OK=1 ` env-var assignment un-gates a push. Bare `RCODE_PUSH_OK` with no value no longer un-gates.
  - New `isPlusRefspecForce` check: splits the command, drops tokens up to and including `push`, and treats any remaining token starting with `+` as a force-push refspec. Routed through the existing `block('git push --force is never permitted.', ...)` call.
  - bashGuard doc comment now states the guard is best-effort, not a security boundary.
- **`test/bash-guard-hook.test.cjs`** — 3 new `test(...)` cases (existing 9 untouched):
  - `substring RCODE_PUSH_OK does not un-gate a push`
  - `+-prefixed refspec force-push is blocked`
  - `genuine authorized push still works`

## Verification

- Task 29.2.1: `node -c` clean, anchored regex present, old substring check gone — PASS
- Task 29.2.2: `node -c` clean, `best-effort` present in comment block — PASS
- Task 29.2.3: `node --test test/bash-guard-hook.test.cjs` — 12/12 pass
- Full suite: `node --test` — 306 tests, 303 pass, 3 fail. All 3 failures are the known pre-existing baseline:
  - `scope-history-parity` (commit scopes `kanban`, `orchestrator` not in AGENTS.md)
  - `broken @-references do not regress past baseline`
  - `command-workflow @-includes`
  - **No new failures introduced.**

## Success Criteria

- `echo RCODE_PUSH_OK; git push` is BLOCKED — verified
- `git push origin +main` is BLOCKED — verified
- `RCODE_PUSH_OK=1 git push origin main` is still ALLOWED — verified
- bashGuard comment states it is best-effort, not a security boundary — verified

## Commits

- `925a3fe` — fix(cli): close bash-guard push bypasses — anchored token, +-refspec force detection

## Deviations / Blockers

None. All tasks executed as specified.
