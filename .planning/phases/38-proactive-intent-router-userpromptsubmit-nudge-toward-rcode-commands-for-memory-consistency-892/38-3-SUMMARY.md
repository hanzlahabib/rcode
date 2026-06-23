# Execution Summary

**Phase:** 38 — Proactive intent router (UserPromptSubmit nudge toward rcode commands for memory consistency, #892)
**Sprint:** 38.3 — keep INTENT_TABLE synced with do.md (drift guard)
**Completed:** 2026-06-18
**Executor:** claude-sonnet-4-6

## What Was Built

Two small, atomic changes that together turn silent drift between INTENT_TABLE
and do.md into a loud test failure:

1. `rcode/bin/rcode-hooks.cjs` gained a `require.main === module` guard around
   the top-level `main().catch()` call, and a `module.exports = { INTENT_TABLE }`
   export at the bottom. Requiring the file in a test no longer triggers the CLI
   dispatch loop.

2. `test/prompt-router-table-sync.test.cjs` — a new drift-guard test that reads
   the `/rcode-do` routing table from `rcode/workflows/do.md`, extracts every
   backtick-quoted `/rcode-*` base command, and asserts every entry in
   `INTENT_TABLE` is present. A vacuous-pass sanity assertion ensures the parser
   must find at least 5 rows and 5 commands before the sync check can pass.

## Stories Completed

| ID | Title | Points | Status |
|----|-------|--------|--------|
| 38.3.1 | Export INTENT_TABLE for test consumption | 1 | done |
| 38.3.2 | `test/prompt-router-table-sync.test.cjs` — assert no drift vs do.md | 2 | done |

## Files Modified

| File | Change |
|------|--------|
| `rcode/bin/rcode-hooks.cjs` | Wrapped `main().catch()` in `require.main === module` guard; added `module.exports = { INTENT_TABLE }` |
| `test/prompt-router-table-sync.test.cjs` | Created — 2-test drift guard |

## Deviations from Plan

None. The sprint spec called out `.rcode/bin/rcode-hooks.cjs` as a potential
mirror that needed a co-commit. That path is gitignored (`.rcode/bin` is in
`.gitignore`) so no mirror commit was needed.

## Blockers Encountered

None.

## Next Steps

Sprint 38.3 is the final sprint in phase 38. The orchestrator owns STATE.md and
ROADMAP.md updates.

## Verification

- `node --check rcode/bin/rcode-hooks.cjs` — syntax OK
- `node -e "require('./rcode/bin/rcode-hooks.cjs')"` — no CLI side-effect; INTENT_TABLE exported, length 16
- `echo '{"prompt":"what time is it"}' | node rcode/bin/rcode-hooks.cjs prompt-router` — exit 0, empty stdout (CLI unaffected)
- `node --test test/prompt-router-table-sync.test.cjs` — 2 pass, 0 fail
- `node --test test/prompt-router.test.cjs` — 9 pass, 0 fail (no regression)
