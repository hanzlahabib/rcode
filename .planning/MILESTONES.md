# Milestones — rcode

## M1 — Ship v2 + Tier Docs

**Shipped:** 2026-05-16
**Phases:** 18 (01–19, no phase 16)
**Plans:** ~22 sprints
**Released as:** v2.0.0 → v3.5.0 (shipped incrementally; see git tags)

### Delivered

rcode v2 — a unified, installable AI engineering methodology. v1/v2 were
merged into a single `rcode/` root with one installer, one agent roster, and one
set of slash commands plus phrase-activated skills. The package shipped to npm,
got tier-organized documentation (Starter/Advanced/Ultra/Standards), a view-only
Majlis dashboard, a three-dimensional auto-heal system (project-doc, feature-content,
phase-status drift), and a long sweep of CLI/parser/workflow hardening driven by
dogfooding rcode on itself.

### Key Accomplishments

- Tier-based documentation reorg — `docs/TIERS.md` as single source of truth; new user finds the Golden Path in <10s
- V2 stabilization — v1/v2 merged to one root, single installer (70 commands + 34 agents + 39 skills + 71 workflows), BMAD/GSD references purged from 95 commits
- Auto-heal portfolio — `/rcode-feature-drift` + phase-status drift detector + `/rcode-memory-audit --fix`, with `/loop`+`/schedule` cadence docs and a PostToolUse hook
- Majlis dashboard — design system, Milestone→Phase→Sprint→Task drill-down, live `.planning/` file browser, auto-refresh
- CLI/parser hardening — phantom subcommand sweeps (#465, #481), phase-number parser cap fix (#476), workflow dead-end/broken-ref closure, deep producer/consumer contract fixes (#492–#497)

### Stats

- Released: v2.0.0, v2.1.0, v2.2.0, v3.4.20, v3.5.0 (incremental)
- Timeline: 2026-03 → 2026-05-16
- Closed via milestone restructure — phases 20–30 reassigned to M2

### Known Gaps

Closed with "proceed anyway" — the following phases were not verifiably complete
at milestone close (no `SUMMARY.md`):

- Phase 05 — Marketing + Launch: **partial**. Eng-side shipped (npm publish, README polish); GTM-side (demo video, social launch) split out to Phase 07.
- Phase 07 — Marketing Push v2: **not started**. Demo video, X/MENA channel launch, first-10-installs verification still open.
- Phase 13 — Parser + Walker Consolidation: **not started** (#469). SPRINT drafted in a separate session, never merged.
- Phase 18 — SPRINT schema enrichment: **not started**. Goal never elaborated past TBD.
- Phase 19 — deep-gap-fixes: **shipped (commit `3f632ee`) but no `SUMMARY.md`** — all 6 contract fixes (#492–#497) landed; only the summary artifact is missing.
