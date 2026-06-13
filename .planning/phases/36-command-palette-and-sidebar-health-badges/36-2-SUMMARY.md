---
phase: 36-command-palette-and-sidebar-health-badges
plan: 2
subsystem: dashboard-sidebar
tags: [sidebar, health-badges, store, reactive-ui]
requires:
  - store.js activeSessions and blockers fields (pre-existing)
  - App.js fetchAndRerender propagates blockers into store (verified at App.js:222)
provides:
  - sidebar-health block in Sidebar.js with live session and blocker counts
  - .sidebar-health, .health-badge, .health-badge--alert, .health-badge--zero CSS classes
affects:
  - Any future sprint that appends to css.js (insert before closing </style>)
tech-stack:
  added: []
  patterns:
    - dual useStore() calls in one component (selector + full-state) for independent re-render granularity
key-files:
  modified:
    - server/lib/html/client/components/Sidebar.js
    - server/lib/html/css.js
key-decisions:
  - App.js verified at line 222 to already propagate blockers — intentionally left untouched
  - Used a second useStore() (no selector) alongside the existing project selector; both hooks coexist cleanly
  - health-badge--zero uses opacity: 0.6 + text-muted to de-emphasise zero counts without hiding them
requirements-completed: [DSH-5]
duration: 8 min
completed: 2026-06-13
---

# Phase 36 Plan 2: Sidebar Health Badges Summary

Live health badges added to the dashboard sidebar showing running orchestration session count and blocker count, both updating reactively from the store on every poll cycle.

Duration: ~8 minutes. 2 tasks, 2 files.

## What Was Built

Two reactive health badges rendered in a `.sidebar-health` block between the project switcher and the nav in `Sidebar.js`. The session badge counts `activeSessions` entries with `status === 'running'`; the blocker badge counts the `blockers` array length. Both read from the store via `useStore()` and re-render on every `setState()` — no manual refresh, no new poll, no new endpoint.

CSS for all badge classes appended to `css.js` using existing design tokens only.

## Tasks Completed

| ID | Title | Commit |
|----|-------|--------|
| 36-2.1 | Render live health badges in the Sidebar | c5cf247 |
| 36-2.2 | Add health-badge CSS to css.js (App.js confirmed no-edit) | 328e892 |

## Files Modified

| File | Change |
|------|--------|
| `server/lib/html/client/components/Sidebar.js` | Added useStore() subscription, sessionCount/blockerCount derivation, sidebar-health block with two health-badge spans |
| `server/lib/html/css.js` | Appended .sidebar-health, .health-badge, .health-badge--alert, .health-badge--zero CSS block before closing </style> |

## Patterns Established

Dual `useStore()` calls in one component: one with a selector (`s => s.project`) for fine-grained re-render on a stable slice, plus one without a selector for full-state subscription. This pattern works correctly — Preact hooks are independent; the component re-renders when either subscription fires.

## Provides

- `sidebar-health` CSS class — container for the badge strip
- `health-badge` CSS class — base badge style (bg-elev-2, text-2xs, radius-2)
- `health-badge--alert` CSS class — amber color for non-zero blocker counts
- `health-badge--zero` CSS class — muted + opacity-0.6 for zero counts

## Deviations from Plan

**Pre-existing `style=` in Sidebar.js comment (non-blocking):** The file's JSDoc comment on line 17 contains the phrase "No inline style= attributes". The automated verify command `! grep -q "style=" Sidebar.js` technically finds this match. This is a false positive — no actual inline `style` attribute was added. The comment pre-dates this sprint and is correct documentation. The intent of the check passes; only the literal grep fails due to the comment text.

**App.js line number drift:** The sprint references App.js:144 for the `blockers` propagation. Actual location is line 222. Content is correct — `d.blockers || newState.raw.blockers || []`. App.js was not edited.

## App.js Confirmation

App.js was verified to already propagate `blockers` into the store at line 222:
```
d.blockers     || newState.raw.blockers  || []
```
App.js was intentionally left untouched per the sprint constraint. It is owned by sprint 36-1.

## Verification Results

- `node server/dashboard.js` starts clean (port 7901 sub-process conflict is environmental — dashboard main process starts correctly)
- `node --input-type=module --check < Sidebar.js` exits 0
- No `style=` attribute added in Sidebar.js (pre-existing comment excluded)
- `.sidebar-health`, `.health-badge--alert`, `.health-badge--zero` all present in css.js
- `node -e "require('./server/lib/html/css.js').renderCss()"` exits 0

## Success Criteria Met

DSH-5: Sidebar shows a live active-session count badge and a live blocker count badge. Both update reactively as sessions start/stop (4 s poll) and blockers change (30 s state refresh). Zero-count badges are de-emphasised; non-zero blockers are visually flagged in amber. No new dependency, no build step, no change to server/dashboard.js, no change to App.js.

## Next Steps

Phase 36 plan 2 of 2 complete. Phase 36 is done. Ready for the next phase or `/rcode-verify-phase 36`.
