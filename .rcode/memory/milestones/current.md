# Current Milestone — `rcode`

Active milestone. Goal, phases, current sprint, blockers. The agent reads this before starting any task.

---

## Milestone

**Name:** rcode improvement programme
**Started:** 2026-04-26
**Target close:** 2026-05-10 (rolling)
**Goal:** Reshape rcode into a rcode-built, universally-usable agentic dev product with a Memory Bank as the differentiator. Track in [`TASKS.md`](../../../TASKS.md).

## Active phase

**Phase:** 10 — Dashboard 100% verification (after Phase 8 docs refresh complete)
**Started:** 2026-04-26
**Acceptance criteria:**
- [x] Boot dashboard against this repo — all routes 200
- [x] Memory Bank populated with real content (this commit dogfoods it)
- [ ] /memory view renders populated state correctly in browser
- [ ] End-to-end test asserting non-empty content per route

## Active sprint / cycle

**Window:** 2026-04-26 (single-session sprint)
**Focus:** Complete remaining phases (8 docs ✅, 10 dashboard, 11 engineering skills, 12 real-pain skills, 9 release, 13 final consolidation).
**Stories:**
- [x] Phase 8 docs refresh — Epic #386
- [ ] Phase 10 dashboard verification — Epic #401
- [ ] Phase 11 engineering skills — Epic #413
- [ ] Phase 12 real-pain skills — Epic #425
- [ ] Phase 9 migration & release — Epic #393
- [ ] Phase 13 final consolidation — Epic #434

## Blockers

| Blocker | Owner | Status |
|---|---|---|
| (none active) | | |

## Recent decisions

- **2026-04-26:** Plain English flag names (`--attack` over `--adversarial`)
- **2026-04-26:** Path B — folder names stay `rcode-*`, brand surface stays `rcode-*`
- **2026-04-26:** Skip Phase 5 (workflow file splits) — runtime risk > line-count win

Full log: [`../project/decisions.md`](../project/decisions.md).

