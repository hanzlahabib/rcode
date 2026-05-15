---
id: M1
title: Ship v2 + Tier Docs
status: completed
started: 2026-03
completed: 2026-05-16
---

# M1 — Ship v2 + Tier Docs

**Goal:** Ship Rihal Code v2 as a polished, installable AI methodology that any Rihalian engineer can pick up in under 10 minutes. Tier-organized, fully documented, publicly available on npm.

**Closed 2026-05-16** via milestone restructure. Originally scoped as phases 01–05;
phases 06–19 accumulated and were absorbed into M1 at closure. Phases 20–30 moved to M2.
See `.planning/MILESTONES.md` for the full record and known gaps.

## Phases

| Phase | Name | Status | Completed |
|-------|------|--------|-----------|
| 01 | Tier-based Documentation Reorg | complete | 2026-04-15 |
| 02 | Scaffold Project Skill | complete | 2026-04-15 |
| 03 | V2 Stabilization | complete | 2026-04-16 |
| 04 | Dashboard Refresh | complete | 2026-04-29 |
| 05 | Marketing + Launch | partial (gap) | — |
| 06 | Feature Doc Drift Auto-Heal | complete | 2026-04-29 |
| 07 | Marketing Push v2 | not started (gap) | — |
| 08 | Auto-Heal Cadence + Hooks | complete | 2026-04-29 |
| 09 | Dogfood Audit Pass | complete | 2026-04-29 |
| 10 | Close Auto-Heal Tooling Gaps | complete | 2026-04-29 |
| 11 | CLI Subcommand Sweep (#465) | complete | 2026-04-29 |
| 12 | Init Shape Completion | complete | 2026-04-29 |
| 13 | Parser + Walker Consolidation | not started (gap) | — |
| 14 | Memory Bank design-system + parser (#476) | complete | 2026-04-30 |
| 15 | Fix 8 phantom CLI subcommands (#481) | complete | 2026-04-30 |
| 17 | Workflow Dead-End & Broken-Ref Fix | complete | 2026-05-01 |
| 18 | SPRINT schema enrichment | not started (gap) | — |
| 19 | Deep-gap-fixes (#492–#497) | shipped, no summary | 2026-05-15 |

## Exit Criteria

- [ ] `npx @hanzlaa/rcode install` works on a clean machine
- [ ] Tier docs live at `docs/TIERS.md` — Starter / Advanced / Ultra clearly defined
- [ ] Majlis dashboard starts clean and shows real project state
- [ ] Package published on npm as `@hanzlaa/rcode`
- [ ] First 10 external installs tracked

## Key Decisions

- Single repo, single install command — no v1/v2 split
- View-only dashboard — no write endpoints ever
- Pure Node stdlib for server — zero npm deps in server code
- Conventional Commits enforced via GitHub Actions
