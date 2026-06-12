# Dashboard Redesign Campaign — Backlog

Integration branch: `campaign-integration`. Each item = one agent = one worktree.
Spec: `.planning/campaign/MOCKUP-SPEC.md`. Data shape: `.planning/campaign/DATA-CONTRACT.md`.

## Wave 1 — Foundation (blocking; must merge before Wave 2)
- [ ] A1 — Gap audit: current `server/` dashboard vs mockup → `.planning/audits/AUDIT-dashboard.md` (NO code)
- [ ] A2 — Foundation: Preact scaffold + design tokens CSS + shell grid + `DATA-CONTRACT.md` + scanner `/api/state` shape

## Wave 2 — Components (parallel; fork from integration after Wave 1)
- [ ] A3 — ProgressDonut card (76% ring + legend + task bar)
- [ ] A4 — CurrentPhase card (phase + 5-step milestone stepper)
- [ ] A5 — Timeline card (projected launch + line chart + on-track)
- [ ] A6 — Tasks cards (Completed list + In Progress list with % badges)
- [ ] A7 — Blockers card (High/Medium/Low severity rows)
- [ ] A8 — Sidebar nav + Project Health mini-card + user profile footer
- [ ] A9 — Recent Decisions + Progress Timeline (bottom row)
- [ ] A10 — Data layer: extend scanner `/api/state` + wire `POST /api/ask` + Share
