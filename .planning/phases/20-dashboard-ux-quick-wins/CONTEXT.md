---
phase: 20
name: dashboard-ux-quick-wins
refs: "#589 #592 #593 #594 #595"
---

# Phase 20 — Dashboard UX Quick-Wins

## Goal
Fix 5 UX bugs in the Majlis dashboard (`server/lib/html/`) that affect every user session. All changes are confined to `client.js`, `shell.js`, and `css.js` — no backend changes required.

## Bugs to Fix

### 1. Sidebar file tree fully expanded by default — #589
**File:** `server/lib/html/client.js` lines 828–840
**Problem:** Every `<details>` element uses the `open` attribute. With 100+ phases, the sidebar becomes hundreds of lines long on every page.
**Fix:** Remove `open` from `<details class="file-tree-subgroup">`. Top-level groups (`file-tree-group`) can stay open. This collapses per-phase sub-groups by default.

### 2. Duplicate `/api/files` fetch — #592
**File:** `server/lib/html/client.js` lines 817–903
**Problem:** Two self-invoking async functions both call `fetch('/api/files')` independently on every page load.
**Fix:** Extract the fetch to a shared top-level promise `const _filesPromise = fetch('/api/files').then(r=>r.json()).catch(()=>[])` and replace both `fetch('/api/files')` calls with `await _filesPromise`.

### 3. Sprint card shows no guidance when tasks are empty — #593
**File:** `server/lib/html/client.js` — `sprintCard()` function (~line 179-196)
**Problem:** Sprint card shows goal/title but no tasks and no hint about why.
**Fix:** When `stories.length === 0`, render: `<div class="empty" style="...">No tasks — run <code>/rcode-plan ${phaseId}</code> to populate</div>`

### 4. Tasks view empty state has no call-to-action — #595
**File:** `server/lib/html/client.js` — `renderTasks()` function
**Problem:** Shows "No tasks yet" with no actionable guidance.
**Fix:** Update empty state to show current phase and command: "Run `/rcode-plan <phase>` to generate tasks for this project."

### 5. Sidebar file tree duplicates Files view — #594
**File:** `server/lib/html/shell.js` line 86 + `client.js` lines 817-865
**Problem:** The persistent sidebar has a full file browser (`#sidebar-file-tree`) AND the Files view has an identical one. The sidebar tree dominates every page's vertical space.
**Fix:** Remove the `#sidebar-file-tree` div from `shell.js` and delete the corresponding IIFE in `client.js` (lines 817-865). The Files view inline browser is the canonical file browser.

## Files to Modify
- `server/lib/html/client.js` (lines 179-196, 817-903)
- `server/lib/html/shell.js` (line 86)

## Success Criteria
- [ ] Sidebar fits in one screen height without scrolling past nav links
- [ ] Only one `/api/files` request fires per page load
- [ ] Sprint cards show empty-state message when no tasks
- [ ] Tasks view shows actionable command hint when empty
- [ ] No regression in file click → file view navigation
