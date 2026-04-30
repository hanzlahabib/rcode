# Phase 15 — Fix 8 Phantom CLI Subcommands per #481

**Status:** Complete
**Started:** 2026-04-30
**Completed:** 2026-04-30
**Commits:** `4a217c2`, `90d1f30`, `6e6f7e1`

## Goal

Eliminate the 8 phantom CLI subcommands enumerated in #481 by implementing each handler in `rihal/bin/rihal-tools.cjs` with a contract derived from how the workflow callsite consumes the output.

## Outcome

Implemented **9 subcommands** (8 from #481 plus 1 found during smoke testing):

| Subcommand | Callsite | Status |
|---|---|---|
| `phases list [--type X] [--pick path]` | plan-milestone-gaps.md:68, execute-sprint.md:134 | ✅ |
| `find-phase <N>` | execute.md:1007 (decimal-phase parent resolve) | ✅ |
| `audit-uat` | audit-uat.md:11 | ✅ |
| `uat render-checkpoint --file <p>` | verify-work.md:253 | ✅ |
| `requirements mark-complete <ID>...` | execute-sprint.md:464 | ✅ |
| `todo match-phase <N>` | discuss-phase.md:325 | ✅ |
| `learnings copy` | execute.md:1400 (soft-fail) | ✅ |
| `docs-audit` | document-project.md:165 | ✅ |
| `frontmatter get <file> --field <name>` | verify-phase.md:61 (bonus find) | ✅ |

## Acceptance Verification

- [x] All 9 subcommands callable from CLI without "Unknown subcommand"
- [x] Each returns structured JSON (or markdown for `uat render-checkpoint`) per documented schema
- [x] `comm -23 /tmp/called.txt /tmp/impl.txt` returns only 3 prose false positives (`exists`, `is`, `not` — all in narration in `health.md` and `init.md`)
- [x] No regression — `phase-plan-index 9` still returns valid JSON
- [x] Atomic commits per logical unit

## Bonus Work (in scope of dogfood session, separate commits)

- `90d1f30` — registered Phase 15 in ROADMAP.md (output of `phase add` on 2026-04-30)
- `6e6f7e1` — annotated 6 unimplemented commands in help.md as "Not yet implemented" (#482-B)
- Runtime: state.json sanitized 20→15 entries (dedupe + null/garbage removal). State.json is gitignored, so this fix is local-only; the underlying `state sync` schema-drift bug (writes `number`, older code reads `id`) is documented in #482 and remains for a future phase.

## Issues Encountered

1. **Schema drift in `state sync`** — Writes phases with `.number` field while older code reads `.id`. Caused dedupe to drop newly synced entries during cleanup. Worked around by normalizing both fields per entry. Root cause not yet fixed.

2. **Class C of #482 (phantom `.rihal/` paths) is mostly false positive** — Most paths are intentional fallbacks (`if exists` guards), lazy-created (`mkdir -p`), or templates expected from package install. No source-level fix warranted. Documented in #482 closure note.

## Next Phase Readiness

- All known phantom CLI subcommands resolved
- `/rihal-execute <N>` pre-flight should now run cleanly (subject to per-callsite contract validation)
- #482 still has open work: Class A (state-sync schema drift root cause) and #480 (install drift v3.3.2 vs v3.4.4)
