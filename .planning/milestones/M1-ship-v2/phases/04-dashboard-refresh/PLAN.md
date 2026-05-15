---
phase: 04
name: Dashboard Refresh
status: active
started: 2026-04-17
milestone: M1
---

# Phase 04 — Dashboard Refresh

**Goal:** Majlis dashboard (`server/dashboard.js`) becomes a proper project intelligence view — design system, hierarchical navigation (Milestone → Phase → Sprint → Task), live file browser, auto-refresh, and collapseable roadmap tree.

## Requirements

- REQ-DASHBOARD-DESIGN: Inter font, CSS custom properties design system, dark theme
- REQ-DASHBOARD-NAV: Sidebar with Overview / Roadmap / Milestones / Phases / Sprints / Tasks / Files / Agents / Decisions
- REQ-DASHBOARD-HIERARCHY: Drill-down from Milestone → Phase → Sprint → Task with back nav
- REQ-DASHBOARD-ROADMAP: Collapseable tree showing full M→Phase→Sprint→Task structure
- REQ-DASHBOARD-FILES: Sidebar file browser for `.planning/` artifacts, grouped by type
- REQ-DASHBOARD-REFRESH: 30s soft poll, "last updated" timestamp, manual refresh button
- REQ-DASHBOARD-STDLIB: Pure Node stdlib — zero npm deps in server code

## Constraints

- Single file server — do not split into multiple server files
- View-only — NEVER add write endpoints, POST handlers, or database code
- `node server/dashboard.js` must start cleanly after every change

## Sprints

| Sprint | Goal | Status |
|--------|------|--------|
| 04.1 | Tier breakdown, sprint progress, velocity, council sessions | completed |
| 04.2 | Design system, sidebar, file browser, hierarchical nav | active |

## Acceptance

- [ ] Dashboard starts on `:7717` with Inter font and dark design system
- [ ] All 5 hierarchy levels navigable with drill-down and back button
- [ ] Roadmap tree collapseable at every level
- [ ] File browser shows grouped `.planning/` artifacts
- [ ] Auto-refresh detects state changes within 30s
