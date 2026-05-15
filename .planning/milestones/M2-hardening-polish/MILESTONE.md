---
id: M2
title: Hardening & Polish
status: active
started: 2026-05
target: 2026-06
version: v4
---

# M2 — Hardening & Polish (v4)

**Goal:** Take the shipped v2 methodology and harden it into an adoptable product —
a realtime orchestration dashboard, slimmer reference-backed agents, resolved
agent/skill persona duplication, closed audit and security gaps, and marketable polish.

## Phases

| Phase | Name | Status | Completed |
|-------|------|--------|-----------|
| 20 | Dashboard UX Quick Wins | complete | 2026-05-02 |
| 21 | Dashboard Data Pipeline | not started | — |
| 22 | Agent Slim: Top-3 via References | complete | 2026-05-10 |
| 23 | Agent Slim: Remaining 24 via Reference Clusters | complete | 2026-05-10 |
| 24 | Resolve Agent vs Skill Persona Duplication | complete | 2026-05-10 |
| 25 | rcode Agent CLI Command | complete | 2026-05-10 |
| 26 | Reference Index and Contributing Rule | complete | 2026-05-10 |
| 27 | Realtime Kanban Orchestration Dashboard | complete | 2026-05-16 |
| 28 | Audit gap closure (#742–#750) | complete | 2026-05-15 |
| 29 | Security hardening (#752–#754) | complete | 2026-05-15 |
| 30 | Marketability (#755–#759) | complete | 2026-05-15 |
| 31 | Preact migration — Majlis dashboard client | planning | — |

## Exit Criteria

- [ ] Realtime orchestration dashboard runs phases/sprints/tasks end-to-end
- [ ] All agents slimmed via shared `references/` clusters
- [ ] No agent/skill persona duplication
- [ ] Audit + security gaps closed; `node --test` green
- [ ] LICENSE, README, and metadata consistent; demo visuals captured
- [ ] Dashboard client rebuilt as Preact components (no build step)

## Key Decisions

- Phases 20–30 reassigned here from M1 at the 2026-05-16 restructure (M1 had drifted —
  scoped as 01–05 but accumulated through 19).
- Dashboard stays build-free — Preact via htm + ESM CDN, no bundler.
- View-only dashboard data; orchestration runs through an authenticated `/api/run`.

## Notes

This milestone was largely executed before its formal record existed — phases 20–30
shipped during M1's run and were retroactively grouped into M2. The forward-looking
work is Phase 31 (Preact migration) plus closing Phase 21.
