# Rihal Code — State

**Last updated:** 2026-05-16
**Milestone:** M2 — Hardening & Polish (v4)
**Version:** 3.5.0
**Current phase:** 33 — Dashboard command runner (complete 2026-05-16; awaiting human in-browser UAT)
**Branch:** 31-preact-migration

---

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-16)

**Core value:** A real AI team — tiered agents, skills, and slash commands — with hard
scope boundaries and zero-lock-in install.
**Current focus:** M2 — Hardening & Polish. Active work: Preact migration of the
Majlis dashboard client (phase 31).

---

## M1 — Closed

M1 — Ship v2 + Tier Docs shipped 2026-05-16 (phases 01–19). Full record and known
gaps in `.planning/MILESTONES.md`. Roadmap archived to
`.planning/milestones/M1-ship-v2/`.

---

## M2 — Hardening & Polish

| # | Name | Status |
|---|------|--------|
| 20 | Dashboard UX Quick Wins | complete |
| 21 | Dashboard Data Pipeline | not started |
| 22 | Agent Slim: Top-3 via References | complete |
| 23 | Agent Slim: Remaining 24 | complete |
| 24 | Resolve Agent vs Skill Persona Duplication | complete |
| 25 | rcode Agent CLI Command | complete |
| 26 | Reference Index and Contributing Rule | complete |
| 27 | Realtime Kanban Orchestration Dashboard | complete |
| 28 | Audit gap closure (#742–#750) | complete |
| 29 | Security hardening (#752–#754) | complete |
| 30 | Marketability (#755–#759) | complete |
| 31 | Preact migration — Majlis dashboard client | complete (human verify pending) |
| 32 | Dashboard theming — design tokens + emoji-to-SVG sweep | in progress (32.3 human verify checkpoint — phase acceptance gate) |

---

## Decisions

- **M1 closed via restructure.** Phases 01–19 → M1; phases 20–30 → M2. No tool exists
  to move a phase between milestones — done manually.
- **`.planning/` stays separate from `.rihal/`.** User artifacts vs system infra.
- **View-only dashboard** — no write endpoints. Orchestration runs via a separate
  authenticated `/api/run` surface with a persisted token.
- **Preact via htm + ESM CDN, no build step** — keeps the dashboard zero-build.

---

## Roadmap Evolution

- Phase 31 added (2026-05-16): Preact migration — rebuild Majlis dashboard client as
  Preact components via htm + ESM CDN, no build step.

## Blockers

None.

---

## Open Follow-ups

| # | Title | Note |
|---|-------|------|
| #760 | 5 skills fail schema validation | from Phase 28 |
| — | Demo GIF + dashboard screenshot | zero-byte placeholders at `docs/assets/` |
| #469 | Phase 13 parser+walker consolidation | M1 known gap, deferred |
| #110 | Phase → Sprint → Story/Task hierarchy refactor | p3 |

---

State authoritative source: `.rihal/state.json` (machine-readable). This file is the
human-readable narrative companion.
