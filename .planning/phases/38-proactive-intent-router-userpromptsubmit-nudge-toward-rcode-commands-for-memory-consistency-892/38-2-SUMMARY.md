# Execution Summary

**Phase:** 38 — Proactive intent router (UserPromptSubmit nudge toward rcode commands for memory consistency, #892)
**Sprint:** 38.2 — opt-in install wiring (settings-hooks.json + enable-hooks + config key)
**Completed:** 2026-06-18
**Executor:** claude-sonnet-4-6

## What Was Built

Sprint 38.2 wired the Sprint 38.1 `prompt-router` subcommand into the opt-in hooks install flow. Four changes land:

1. `rcode/templates/settings-hooks.json` now carries a `UserPromptSubmit` matcher group running `node .rcode/bin/rcode-hooks.cjs prompt-router`. The feature is dormant until a user runs `/rcode-enable-hooks` — nothing is written on a plain `rcode install`.
2. `rcode/workflows/enable-hooks.md` is updated to enumerate 9 guardrails (was 8), add `UserPromptSubmit` to the Step 3 merge list, and add a Step 5.5 bullet documenting the `prompt_nudge` toggle.
3. `cli/install.js` `ConfigSchema` declares `prompt_nudge` as an optional enum (`every | once-per-intent | when-stale | off`) so a user who sets it in `.rcode/config.yaml` passes zod validation. Install does not write the key — the default lives in the hook.
4. `test/prompt-router-install.test.cjs` locks in the template shape and merge idempotency contract: two consecutive merges of the `UserPromptSubmit` group must yield exactly one `prompt-router` command.

## Stories Completed

| ID | Title | Points | Status |
|----|-------|--------|--------|
| 38.2.1 | Add UserPromptSubmit prompt-router matcher to settings-hooks.json | 3 | done |
| 38.2.2 | Update enable-hooks.md for the prompt-router guardrail | 2 | done |
| 38.2.3 | Declare `prompt_nudge` in the config schema | 1 | done |
| 38.2.4 | test/prompt-router-install.test.cjs — template + merge idempotency | 2 | done |

**Total:** 8 / 8 points.

## Files Modified

| File | Change |
|------|--------|
| `rcode/templates/settings-hooks.json` | Added `UserPromptSubmit` hook group (prompt-router) + updated `_comment` |
| `rcode/workflows/enable-hooks.md` | 8 → 9 guardrails; Step 3 lists all 5 event types; Step 5.5 gains prompt-router bullet with prompt_nudge toggle |
| `cli/install.js` | `ConfigSchema` gains `prompt_nudge` enum field with inline comment; no install-time write added |
| `test/prompt-router-install.test.cjs` | New file: 2 tests — template validity and merge idempotency |

## Deviations from Plan

None. All done-criteria in 38-2-SPRINT.md were met verbatim. The merge idempotency test uses an inline `mergeHookGroup` helper (substring-skip rule) that mirrors `mergeSlashRouterHook` in `install.js` exactly as the sprint specified.

## Blockers Encountered

None.

## Next Steps

Sprint 38.3 owns `rcode/bin/rcode-hooks.cjs` (the hook implementation side). Sprint 38.2's template + schema changes are now in place so 38.3 can test the full end-to-end flow including `prompt_nudge` toggle behaviour.

## Verification

- [x] `rcode/templates/settings-hooks.json` is valid JSON (node -e parse check passed)
- [x] `UserPromptSubmit` group present, existing groups untouched (automated verify from sprint spec)
- [x] `enable-hooks.md` contains `prompt-router`, `prompt_nudge`, `UserPromptSubmit` (automated verify passed)
- [x] `cli/install.js` syntax-clean (`node --check` passed); `prompt_nudge` + `once-per-intent` present
- [x] `node --test test/prompt-router-install.test.cjs` — 2 pass, 0 fail
- [x] No AI attribution in any commit message
- [x] No `git push` performed
