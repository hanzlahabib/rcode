---
phase: 20
sprint: 20-01
status: complete
commit: 125ebff
closed: "2026-05-02"
---

# Sprint 20-01 Summary

## What was shipped

| Bug | Fix | File |
|-----|-----|------|
| #589 sidebar expanded on every page | Removed entire sidebar file tree | shell.js, client.js |
| #592 duplicate /api/files fetch | Shared `_filesPromise` — one request per page load | client.js |
| #593 sprint card no task guidance | `sprintCard()` empty-state: "No tasks — run /rihal-plan" | client.js |
| #594 sidebar duplicates Files view | Sidebar IIFE deleted; Files view is canonical browser | client.js |
| #595 Tasks view no CTA | `renderTasksGrouped()` references `S.currentPhase` | client.js |

Bonus: removed dead `filterFileTree()` function (7 lines) that targeted the now-deleted `#file-tree-items` element.

## Verification results

All 7 acceptance criteria passed. Server boots HTTP 200. Net change: -61 lines / +10 lines.
