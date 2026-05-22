# Retrospective — rcode

## Milestone: M1 — Ship v2 + Tier Docs

**Shipped:** 2026-05-16
**Phases:** 18 (01–19, no 16) | **Plans:** ~22 sprints

### What Was Built

A unified, installable AI engineering methodology. v1/v2 merged into one `rcode/`
root with a single installer, tier-organized docs, a view-only Majlis dashboard,
a three-dimensional auto-heal system, and a long tail of CLI/parser/workflow
hardening — most of it surfaced by dogfooding rcode on its own repo.

### What Worked

- Dogfooding as a bug source — running rcode commands on rcode itself surfaced
  real gaps (phantom subcommands, parser caps, workflow dead-ends) that no abstract
  audit would have found.
- Splitting Phase 05 — separating the eng-shipping motion (npm + README) from GTM
  (video + social) unblocked closure on the shipped half instead of stalling both.
- Incremental release tagging (v2.0.0 → v3.5.0) — milestone shipped value continuously
  rather than in one big-bang release.

### What Was Inefficient

- **Phase-status drift went systemic.** `state.json` marked nearly every phase 04–30
  as `planned` while summaries and ROADMAP `✅` markers said otherwise. The drift
  detector built in Phase 08 was never run on a cadence against rcode itself.
- **Milestone tracking was never maintained.** `M1/MILESTONE.md` defined M1 as phases
  01–05; phases 06–19 accumulated with no milestone assignment. Closing M1 required
  a manual restructure because no "assign phase to milestone" tool exists.
- **Summary discipline slipped.** Phases 13, 18, 19 shipped or were planned with no
  `SUMMARY.md` — making "is this done?" unanswerable without reading git history.

### Patterns Established

- Tier docs (`docs/TIERS.md`) as the single canonical organization source.
- View-only dashboard — no write endpoints, ever; pure Node stdlib server.
- Auto-heal as three distinct drift dimensions (project-doc, feature-content, phase-status).
- Reference-cluster agent slimming — shared `references/` over per-agent duplication.

### Key Lessons

- A drift detector that isn't scheduled is a drift detector that doesn't run. Phase-status
  drift should be a cadence hook on rcode itself, not a manual invoke.
- Milestone membership needs to be a first-class, tool-managed field on each phase —
  the absence of a "move phase between milestones" command made this closure manual.
- "Complete" must mean "has a SUMMARY.md." Treat a missing summary as an incomplete phase.

### Tooling Weaknesses Found (dogfooding /rcode-complete-milestone)

- No command moves a phase between milestones — restructure was fully manual.
- `complete-milestone` assumes one git tag per milestone; it has no path for a
  milestone that shipped incrementally across many tags (v2.0.0–v3.5.0 here).
- The readiness check has no fast way to reconcile `state.json` status against
  on-disk `SUMMARY.md` evidence — the operator must spot the drift by hand.

---

## Cross-Milestone Trends

| Milestone | Phases | Shipped | Notable |
|-----------|--------|---------|---------|
| M1 — Ship v2 + Tier Docs | 18 | 2026-05-16 | First milestone; closed via restructure |
