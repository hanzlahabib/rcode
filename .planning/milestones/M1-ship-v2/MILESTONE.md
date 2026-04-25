---
id: M1
title: Ship v2 + Tier Docs
status: active
started: 2026-03
target: 2026-05
---

# M1 — Ship v2 + Tier Docs

**Goal:** Ship Rihal Code v2 as a polished, installable AI methodology that any Rihalian engineer can pick up in under 10 minutes. Tier-organized, fully documented, publicly available on npm.

## Phases

| Phase | Name | Status | Completed |
|-------|------|--------|-----------|
| 01 | Tier-based Documentation Reorg | complete | 2026-04-15 |
| 02 | Scaffold Project Skill | complete | 2026-04-15 |
| 03 | V2 Stabilization | complete | 2026-04-16 |
| 04 | Dashboard Refresh | active | — |
| 05 | Marketing + Launch | planned | — |

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
