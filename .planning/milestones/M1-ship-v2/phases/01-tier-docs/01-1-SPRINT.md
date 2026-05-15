---
phase: "01"
sprint: "01.1"
name: Tier-based Documentation Reorg
status: complete
completed_at: 2026-04-15
---

# Sprint 01.1 — Tier-based Documentation Reorg

**Goal:** Organize skills/agents/commands into discoverable tiers; give new users a clear entry point.

## Stories

| ID | Story | Status |
|----|-------|--------|
| S01-01 | Audit all skills and assign to Starter/Advanced/Ultra/Standards tiers | ✅ |
| S01-02 | Write `docs/TIERS.md` as single source of truth for tier assignments | ✅ |
| S01-03 | Consolidate contributor rules into `docs/STANDARDS.md` | ✅ |
| S01-04 | Add "🚦 Start Here" nav block to README.md | ✅ |
| S01-05 | Add `npx rihal-code tiers` CLI command | ✅ |
| S01-06 | Regroup help output into PROJECT/TEAM/META sections | ✅ |
| S01-07 | Add 7-step Golden Path to postinstall.js | ✅ |

## Acceptance Criteria

- [x] New user can find the Golden Path in < 10 seconds from README
- [x] Contributors have one STANDARDS doc instead of scattered rules
- [x] `npx rihal-code tiers` prints tier map without errors

## Notes

Retroactive sprint document — phase was completed 2026-04-15 before sprint tracking was standardized.
