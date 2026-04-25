---
phase: 01
name: Tier-based Documentation Reorg
status: complete
completed_at: 2026-04-15
milestone: M1
---

# Phase 01 — Tier-based Documentation Reorg

**Goal:** Make rihal-code approachable. Organize 22+ skills, 17 agents, and 17 CLI commands into Starter / Advanced / Ultra / Standards tiers so a new user has a clear entry point.

## Requirements

- REQ-01-TIERS: Skill/agent/command tier map in `docs/TIERS.md`
- REQ-01-STANDARDS: Contributor rules consolidated in `docs/STANDARDS.md`
- REQ-01-README: README shows "Start Here" nav block

## Approach

Audit all existing skills, agents, and CLI commands. Assign each to a tier based on user sophistication. Write `TIERS.md` as the single source of truth. Consolidate scattered contributor rules into `STANDARDS.md`.

## Delivered

- `docs/TIERS.md` — tier map (Starter / Advanced / Ultra / Standards)
- `docs/STANDARDS.md` — consolidated contributor rules
- `docs/V2-PREVIEW.md` — v2 status note for existing users
- `README.md` — "🚦 Start Here" navigation block added
- `npx rihal-code tiers` CLI command
- Help output regrouped (PROJECT / TEAM / META sections)
- `postinstall.js` shows 7-step Golden Path

## Acceptance

✅ New user can find the Golden Path in < 10 seconds from README.
✅ Contributors have one STANDARDS doc instead of scattered rules.
