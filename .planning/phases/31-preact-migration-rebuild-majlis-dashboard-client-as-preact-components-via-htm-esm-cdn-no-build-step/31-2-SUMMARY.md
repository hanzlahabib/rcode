# Execution Summary

**Phase:** 31 — Preact migration — Majlis dashboard client
**Sprint:** 31.2 — Five planning views migrated to Preact
**Completed:** 2026-05-16
**Executor:** Claude Sonnet 4.6 (sequential executor)

## What Was Built

Migrated the five planning views (Roadmap, Milestones, Phases, Sprints, Tasks) to
Preact components and extracted all shared visual primitives into `components/shared.js`.
7 of 12 views are now Preact; Kanban, Files, Agents, Memory, Orchestration remain legacy.

- `components/shared.js`: 9 primitive exports (Chip, Tag, ProgressBar, CompletionRing,
  Breadcrumb, CmdHint, CmdHints, RunBtn, RunningBadge) + 3 card exports (PhaseCard,
  SprintCard, TaskCard). All BRIDGE(31.4) markers set on window.* globals.
- `util.js`: Added `sprintHints()` and `phaseHints()` returning `[cmd, desc]` tuples —
  pure functions, no DOM string templating.
- `views/RoadmapView.js`: Tree expansion is per-node `useState` (no `toggleNode` DOM
  hacks). Filter is `useState`. Root milestone node always open.
- `views/MilestonesView.js`: List mode + detail mode (velocity bars, phase timeline,
  completion ring, attr grid, phase cards).
- `views/PhasesView.js`: List + filter + detail with Run/Terminal/View-plan action bar.
- `views/SprintsView.js`: List + filter + detail with breadcrumb chain, task cards,
  acceptance criteria section.
- `views/TasksView.js`: Text filter, status select, sort select are all `useState`.
  Group-by-sprint computed in render. No DOM mutation.
- `components/App.js`: 5 new views registered in PREACT_VIEWS; LEGACY_VIEWS trimmed
  to the 5 still-unmigriated views.
- `client-render.js`: All replaced functions deleted (renderOverview, renderRoadmap,
  filterRoadmap, renderMilestones, renderPhases, renderSprints, renderTasks,
  renderTasksGrouped, filterTasksByStatus, sortTasks, phaseCard, sprintCard, taskCard,
  toggleTaskDetail, progressBar, completionRing, breadcrumb, runBtn, filterInput,
  sprintHints, phaseHints). Remaining file is ~65 lines of helpers for still-legacy views.
- `client-main.js`: `route()` now no-ops for all 7 Preact-owned views.
- `views/OverviewView.js`: Resolved TODO(31.2) — now imports ProgressBar and CmdHints
  from shared.js instead of inlining them.

## Stories Completed

| ID | Title | Status |
|----|-------|--------|
| 31.2.1 | Extract shared visual-primitive components | done |
| 31.2.2 | Migrate Roadmap view (tree, filter, expand/collapse) | done |
| 31.2.3 | Migrate Milestones + Phases views (list + drill-down detail) | done |
| 31.2.4 | Migrate Sprints + Tasks views | done |
| 31.2.5 | Register migrated views in App router; remove dead legacy render functions | done |
| 31.2.6 | Manual regression sweep — planning views | checkpoint (awaiting human verify) |

## Files Modified

| File | Change |
|------|--------|
| `server/lib/html/client/components/shared.js` | Created — 9 primitives + 3 card components |
| `server/lib/html/client/util.js` | Added sprintHints() and phaseHints() |
| `server/lib/html/client/views/OverviewView.js` | Import ProgressBar/CmdHints from shared; remove inline copies |
| `server/lib/html/client/views/RoadmapView.js` | Created — Preact tree with useState expansion |
| `server/lib/html/client/views/MilestonesView.js` | Created — list + detail mode |
| `server/lib/html/client/views/PhasesView.js` | Created — list + filter + detail |
| `server/lib/html/client/views/SprintsView.js` | Created — list + filter + detail |
| `server/lib/html/client/views/TasksView.js` | Created — filter/sort/expand via useState |
| `server/lib/html/client/components/App.js` | 5 new view imports; LEGACY_VIEWS trimmed |
| `server/lib/html/client/client-render.js` | Deleted ~600 lines of replaced view renderers |
| `server/lib/html/client/client-main.js` | route() gates migrated views as no-ops |

## Deviations from Plan

**sprintHints/phaseHints in util.js**: The plan said to move these from client-render.js
into util.js. The old string-template versions in client-render.js called `cmdHint()` and
returned HTML strings. The new versions in util.js return `[cmd, desc]` tuples, matching
the pattern established in OverviewView in sprint 31.1. The old string versions were deleted
along with the view renderers that depended on them.

**runningTotal BRIDGE in MilestonesView**: The plan mentioned `runningInPhase` / `runningInSprint`
but MilestonesView detail mode also needed `runningTotal()`. Added BRIDGE marker there too.

## Blockers Encountered

None.

## Next Steps

- Sprint 31.2.6: Human in-browser regression sweep (checkpoint below).
- Sprint 31.3: Migrate Orchestration, Kanban, Files, Agents, Memory views.
- Sprint 31.4: Delete remaining legacy string-concat modules; promote BRIDGE globals to imports.

## Verification

- [x] `node server/dashboard.js` starts cleanly; `/` returns 200
- [x] All client JS files pass `node --check`
- [x] No dangling references to deleted render functions in client-main.js or client-kanban.js
- [x] 5 migrated views registered in App.js PREACT_VIEWS
- [x] shared.js exports 9 primitives + PhaseCard + SprintCard + TaskCard
- [x] BRIDGE(31.4) markers on all window.* legacy global calls
- [ ] Human in-browser regression sweep (task 31.2.6 — checkpoint pending)
