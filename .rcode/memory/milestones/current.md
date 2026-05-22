# Current Milestone — `rcode`

Active milestone. Goal, phases, current sprint, blockers. The agent reads this before starting any task.

---

## Milestone

**Name:** v4.0.0 rebrand + open-source release prep
**Started:** 2026-05-20
**Target close:** 2026-06-15 (rolling)
**Goal:** Complete the `rihal` → `rcode` rename across the entire codebase (CLI, skills, workflows, docs, brand surfaces), shake out post-rename regressions, and harden for first public open-source announce on npm. Memory Bank remains the product moat.

## Active phase

**Phase:** Post-rename hardening
**Started:** 2026-05-23
**Acceptance criteria:**
- [x] Bump to v4.0.0 (commit `304eebc`)
- [x] Rename `rihal*` → `rcode*` across CLI, skills, workflows (commits `4da7c1e`, `be560f8`, `22ea25b`, `fd1849d`, `2b0bbee`)
- [x] Fix brain clone (sparse-checkout split — `adf6f7e`)
- [ ] Close issue #861 — leftover `rihal` references in installed surface
- [ ] Close issue #860 — 25+ skill workflows reference non-existent paths
- [ ] Memory Bank distillates regenerated and verified <5K tokens (this commit)
- [ ] Announce-ready README + CHANGELOG audited end-to-end

## Active sprint / cycle

**Window:** 2026-05-23 → 2026-05-30
**Focus:** Fix post-rename leftovers + dogfood Memory Bank on rcode itself.
**Stories:**
- [ ] #861 — clean leftover `rihal` refs in installed surface
- [ ] #860 — repair skill workflows referencing non-existent paths
- [ ] #859 — investigate `rihal-codebase-mapper` 600s stall
- [ ] #856 — `roadmap list-phases` reports wrong in-progress phase
- [ ] #855 / #854 — `state set-phase` write/completion bugs
- [ ] #852 — ts-node symlink fails during pnpm install
- [ ] Memory Bank dogfood (this work)

## Blockers

| Blocker | Owner | Status |
|---|---|---|
| (none active) | | |

## Recent decisions

- **2026-05-20:** Hard-break v4.0.0 rebrand — no rename shim, full conventional-commits `!` breaking marker.
- **2026-04-26:** Build Memory Bank as the rcode product moat (persistent project memory as primary differentiator).
- **2026-04-26:** Path B — skill folder names stay `rcode-*` for installer compatibility, user-facing slash brand stays `rcode-*`.

Full log: [`../project/decisions.md`](../project/decisions.md).
