# Phase 11: CLI Subcommand Sweep — Summary

**Status:** Complete
**Delivered:** 2026-04-29
**Tracks:** #465, #467

## What shipped (5 of 15 from #465)

| # | Subcommand | Workflow consumer | Behavior |
|---|---|---|---|
| 1 | `generate-claude-md` | new-project-roadmap.md | Scaffolds project CLAUDE.md with project-rules baseline (commit/push/file-mod/scope) |
| 2 | `check-implementation-readiness --phase N` | check-implementation-readiness.md | Returns `{ready, blockers}` — verifies `.planning/` + ROADMAP + phase exists + no blocking anti-patterns |
| 3 | `commit-to-subrepo --subrepo P "<msg>"` | execute-sprint.md | Same conventional-commits + AI-attribution + `--no-verify` rules as `cmdCommit`, scoped to a subrepo |
| 4 | `context refresh` | init.md | Touches `.rihal/context/.last-refresh`; graceful no-op when sources.yaml absent |
| 5 | `classify-tech --keywords "<text>"` | ui-phase.md | Classifies tech stack across 17 known patterns (next.js, react, vue, fastapi, django, etc.) |

## Decisions honored

- **D-1:** Each subcommand minimal + self-contained ✓
- **D-2:** `commit-to-subrepo` reuses cmdCommit's validation rules (AI rejection, `--no-verify` rejection, conventional-commits) without duplicating internals ✓
- **D-3:** Throw on invalid input, return JSON for machine-readable output ✓
- **D-4:** `generate-claude-md` refuses overwrite without `--force` ✓
- **D-5:** `check-implementation-readiness` returns structured blockers ✓
- **D-6:** `commit-to-subrepo` requires explicit `--subrepo` flag (no auto-discovery) ✓
- **D-7:** `context refresh` is a graceful no-op when no sources configured ✓
- **D-8:** `classify-tech` returns structured `{stack, category, confidence, matches}` ✓

## Issues closed

| # | Verification |
|---|---|
| #467 | All 5 subcommands invocable + tested through error and happy paths |
| #465 (5 of 15) | `commit` (Phase 10) + 5 above (Phase 11) = 6 of 15 done. **9 remain in backlog.** |

## #465 remaining (Phase 14+ if/when consumed)

`audit-uat`, `find-phase`, `learnings copy`, `phase-plan-index`, `phases`, `frontmatter`, `requirements mark-complete`, `todo match-phase`, `uat render-checkpoint`.

## Commit chain

```
bf071f0  feat(11): implement 5 high-impact CLI subcommands from #465
```

Single commit — Phase 11 was scoped tight, all 5 subcommands shipped atomically. Committed via `cmdCommit` (dogfood — Phase 10's tool committing Phase 11's tool additions).
