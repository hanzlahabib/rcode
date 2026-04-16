---
phase: 05-dashboard-refresh
sprint: 05.1
type: execute
autonomous: false
requirements: [REQ-DASHBOARD]

must_haves:
  truths:
    - "Dashboard shows tier breakdown (Starter/Advanced/Ultra)"
    - "Dashboard shows sprint progress from state.json"
    - "Dashboard shows velocity chart from velocity_history"
    - "Dashboard shows council session list"
  artifacts:
    - path: "server/dashboard.js"
      provides: "All new views (tiers, sprints, velocity, council)"
  key_links:
    - from: "dashboard.js"
      to: ".rihal/state.json"
      via: "fs.readFileSync + JSON parse"
---

# Sprint 05.1 — Dashboard Refresh

**Goal:** Diwan dashboard shows tier breakdown, sprint progress, velocity, council sessions

## Stories

| ID | Title | Points | Status | Acceptance |
|----|-------|--------|--------|------------|
| 05.1.01 | Add tier view (Starter/Advanced/Ultra) to dashboard landing | 3 | todo | Three columns with skill lists |
| 05.1.02 | Add sprint progress visualization from state.json sprints[] | 5 | todo | Shows stories by status, points bar |
| 05.1.03 | Add velocity chart (bar chart of velocity_history) | 3 | todo | SVG/ASCII bar chart, auto-scales |
| 05.1.04 | Show council session list with links to artifacts | 2 | todo | Council sessions table, clickable paths |
| 05.1.05 | Fix GH #12 — render per-sprint state and session logs | 2 | todo | Issue #12 closed |

## Capacity

- **Velocity target:** 13 points
- **Total committed:** 15 points
- **Buffer:** -2 points (over-committed by 15%)
- **Note:** If velocity data exists from Sprint 04.1, reassess. Otherwise 05.1.03 can defer to 05.2.

## Dependencies

- Sprint 04.1 should complete first (establishes velocity baseline)
- dashboard.js must remain dep-free (pure Node stdlib)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-committed (15 vs 13 target) | Story slip | Defer velocity chart (05.1.03) if needed |
| SVG generation in pure Node | Complex without libs | Use ASCII/text-based chart instead |

## Checkpoint

**Story 05.1.02:** checkpoint:human-verify — open browser, check sprint view renders correctly.
