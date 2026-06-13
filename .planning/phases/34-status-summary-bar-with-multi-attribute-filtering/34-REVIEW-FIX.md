---
status: all_fixed
phase: 34
findings_in_scope: 2
fixed: 2
skipped: 0
iteration: 1
generated: 2026-06-13T00:00:00Z
---

# Phase 34 Review Fix Report

## H1 — Session status values fall through to unstyled "other" in StatusSummaryBar

**Status:** Fixed  
**Commit:** `794e100`

**What was done:**

1. Added `sessionChip(status)` to `server/lib/html/client/util.js` — a separate normaliser for the orchestrator session vocabulary (`running`, `starting`, `stopped`, `error`) that maps each to a distinct CSS class (`sess-running`, `sess-starting`, `sess-stopped`, `sess-error`). Kept it separate from `chip()` to avoid coupling two different status domains into one function.

2. Added `countSessionsByStatus()` to `server/lib/html/client/components/StatusSummaryBar.js` that calls `sessionChip()` instead of `chip()`. Updated the component to use this function for the Sessions group.

3. Added four CSS colour rules to `server/lib/html/css.js` after the existing `.summary-count-chip` block:
   - `.sess-running` → `var(--accent-blue)` (live activity)
   - `.sess-starting` → `var(--amber)` (transient/pending)
   - `.sess-stopped` → `var(--text-secondary)` (idle/muted)
   - `.sess-error` → `var(--accent-red)` (needs attention)

**Files modified:**
- `/home/hanzla/development/rihal-code/server/lib/html/client/util.js`
- `/home/hanzla/development/rihal-code/server/lib/html/client/components/StatusSummaryBar.js`
- `/home/hanzla/development/rihal-code/server/lib/html/css.js`

---

## H2 — `phaseMilestone` duplicated verbatim in PhasesView.js and SprintsView.js

**Status:** Fixed  
**Commit:** `4df1f41`

**What was done:**

Added `phaseMilestone(id)` as an exported function in `server/lib/html/client/util.js` with a JSDoc comment explaining that it is the single source of truth for milestone boundary constants (19, 33). Removed the local duplicate function from both view files. Updated the import line in both views to include `phaseMilestone` from `../util.js`. No behaviour change — function body is identical to the removed duplicates.

**Files modified:**
- `/home/hanzla/development/rihal-code/server/lib/html/client/util.js`
- `/home/hanzla/development/rihal-code/server/lib/html/client/views/PhasesView.js`
- `/home/hanzla/development/rihal-code/server/lib/html/client/views/SprintsView.js`
