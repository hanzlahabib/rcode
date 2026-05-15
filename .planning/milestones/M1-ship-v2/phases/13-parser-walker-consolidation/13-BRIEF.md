# Phase 13 — Brief (starter context for fresh session)

**Track:** #469
**Status:** Planned (not yet started)
**Predecessors:** Phase 10 (#466), Phase 12 (#468)

## Why this phase exists

The dogfood audit (#463) and Phase 10/12 work surfaced parser/walker drift in `rihal/bin/`:

1. **Three ROADMAP parsers** — drift target:
   - `extractPhases` in `rihal/bin/lib/roadmap.cjs` (post-#464 fix, heading + colon supported)
   - `parseRoadmapPhases` nested in `cmdProgress`
   - Inline regex in `cmdState` sync branch
2. **Two phase-dir walkers** — drift target:
   - `walkPhaseDirs` nested in `cmdProgress` (~line 3420 in rihal-tools.cjs)
   - Inline implementation in `cmdInit` (Phase 10 added — duplicates the walker)

When two implementations of the same concept exist, they drift. #460 / #462 / #464 / #465 all stemmed from divergent implementations.

## Goal

Single canonical parser, single canonical walker. Every caller goes through the canonical helper.

## Plans (from #469)

1. Lift `parseRoadmapPhases` + `extractPhases` into one module-scope helper. Pick the most complete (probably `extractPhases` — it's already in `lib/roadmap.cjs`), delete the others.
2. Lift `walkPhaseDirs` to module scope. Delete the inline walker in `cmdInit` Phase 10 branch and replace with a call to the lifted helper.
3. Add a dogfood-gate check that asserts exactly one canonical parser + one canonical walker exist.

## Acceptance (from #469)

- `grep -c "function.*[Pp]arse.*[Rr]oadmap" rihal/bin/rihal-tools.cjs rihal/bin/lib/roadmap.cjs` → exactly 1
- `grep -c "function walkPhaseDirs" rihal/bin/rihal-tools.cjs` → exactly 1
- All existing callers (`cmdProgress`, `cmdInit`, sync, list-phases, get-phase) keep working
- Dogfood gate passes
- 132/132 existing tests still pass

## Where to start

Read in order:
1. `gh issue view 469` — full umbrella
2. `rihal/bin/lib/roadmap.cjs` — current canonical-ish parser
3. `rihal/bin/rihal-tools.cjs` — find `parseRoadmapPhases` (in `cmdProgress`), `walkPhaseDirs` (in `cmdProgress`), and the inline walker in `cmdInit` (Phase 10 branch around line ~365)
4. `scripts/dogfood-check.sh` — where the new gate-check should live

## Project rules that apply

- All rules in `CLAUDE.md` (no AI attribution, no push without explicit approval, no `git add -A`, conventional commits, file size ≤1000 lines, etc.)
- Auto-memory rules in `~/.claude/projects/-home-hanzla-development-rihal-code/memory/MEMORY.md` (no leading zeros, no GSD/BMAD references, dogfood the rihal flows, etc.)

## Suggested next command

`/rihal-plan 13` (or `/rihal-discuss-phase 13` if you want to flesh out gray-area decisions before planning)

## After Phase 13 ships

Commit + dogfood + offer `/clear` for the next phase. Phase 12 commit `4059384` is the immediate predecessor.

---

*Phase: 13-parser-walker-consolidation*
