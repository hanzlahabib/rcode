---
phase: 21
name: dashboard-data-pipeline
refs: "#590 #591"
depends-on: "phase 20"
---

# Phase 21 — Dashboard Data Pipeline

## Goal
Fix the two root-cause bugs that prevent tasks from appearing in the dashboard and prevent decimal phase IDs from resolving correctly. Requires changes to `server/lib/scanner.js`, `server/lib/html/client.js`, and the `rihal-planner` workflow.

## Bugs to Fix

### 1. Sprint stories always empty — #590
**Root cause:** rihal-planner writes SPRINT.md markdown files but never populates `sprints[].stories[]` in `state.json`. The scanner reads `s.stories` from state.json and flatmaps it for the Tasks view. If stories array is empty, tasks are invisible.

**Fix — two-part:**

**Part A: rihal-planner writes task entries to state.json**
File: `rihal/workflows/plan.md`
After generating SPRINT.md content, the planner must also update `state.json` by calling `rihal-tools state` to add story entries:
```json
{"id": "sprint-1-task-1", "title": "...", "status": "todo", "sprint": "100.1", "phase": "100"}
```

**Part B: scanner.js SPRINT.md fallback parser**
File: `server/lib/scanner.js` around line 81
When `p.sprints[].stories` is empty AND a `sprintFile` path exists, parse the SPRINT.md file to extract AC/task items as story entries. SPRINT.md format has `## Sprint N.M` sections with task lists.

Pattern to extract:
```js
// Lines starting with "- [ ]" or "- [x]" or numbered "1." inside a sprint block
const taskLines = md.split('\n').filter(l => /^[-*]\s+\[[ xX]\]/.test(l.trim()) || /^\d+\.\s+/.test(l.trim()));
```

### 2. Decimal phase IDs not matched to filesystem directories — #591
**File:** `server/lib/scanner.js` line 85
**Problem:**
```js
const padded = String(p.id || p.number || '').padStart(2, '0');
// For p.id = "100.1": padded = "100.1", looks for dir "100.1-name" — doesn't exist
```

**Fix:**
```js
const intId = String(p.id || p.number || '').split('.')[0];
const padded = String(intId).padStart(2, '0');
```

**File:** `server/lib/html/client.js` — `renderPhases(subId)` and related
**Problem:** `ph.id === subId` fails if one is number and other is string.
**Fix:** `String(ph.id) === String(subId)` normalization in phase find operations.

## Files to Modify
- `server/lib/scanner.js` (lines 81-85 — stories flatmap + padded ID)
- `server/lib/html/client.js` — phase ID comparison normalization
- `rihal/workflows/plan.md` — add state.json task write step

## Success Criteria
- [ ] After `/rihal-plan 100`, tasks appear in dashboard Tasks view
- [ ] Sprint detail cards show task list
- [ ] Phase 100.1 click correctly resolves directory and shows sprint content
- [ ] Integer phase IDs (e.g. "13") still work correctly
- [ ] SPRINT.md fallback parser extracts tasks when state.json stories is empty
