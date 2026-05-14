---
phase: 20
sprint: 20-01
type: execute
wave: 1
depends_on: []
files_modified:
  - server/lib/html/client.js
  - server/lib/html/shell.js
autonomous: true
requirements: []

must_haves:
  truths:
    - Sidebar fits in viewport height without scrolling past nav links on a 100-phase project
    - Browser DevTools Network tab shows exactly one /api/files request per page load
    - Sprint cards show a command hint when stories array is empty
    - Tasks view empty state names the current phase and gives the exact /rihal-plan command to run
    - Clicking a file in the Files view still loads and renders the file correctly after sidebar tree removal
  artifacts:
    - server/lib/html/client.js (modified — sidebar IIFE deleted, shared _filesPromise, empty-state messages updated)
    - server/lib/html/shell.js (modified — #sidebar-file-tree div removed)
  key_links:
    - sidebar IIFE (client.js lines 817–865) rendered into #sidebar-file-tree (shell.js line 86); both must be removed together or file-click events will throw
    - inline Files IIFE (client.js lines 868–903) is the canonical file browser and must remain fully intact
    - loadInlineFile() syncs .file-tree-item selection (line 919–921); after sidebar removal those selectors will find nothing — harmless, but confirm no JS error thrown
---

<objective>
Fix 5 UX bugs in the Majlis dashboard that affect every user session. Bugs: sidebar file tree fully expanded (#589), duplicate /api/files fetch (#592), sprint empty-state (#593), sidebar tree duplicates Files view (#594), Tasks view empty-state (#595).
Purpose: Every dashboard session currently begins with an unusable sidebar (hundreds of expanded file entries) and two redundant network requests. Empty states in Sprint and Tasks views give no actionable guidance.
Output: Modified client.js and shell.js. No new files.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/phases/20-dashboard-ux-quick-wins/CONTEXT.md
</context>

<tasks>

### Story 20.01.01 — Remove sidebar file tree and deduplicate /api/files fetch

**Type:** auto
**Wave:** 1
**Estimated time:** 30–45 min

<read_first>
- /home/hanzla/development/rihal-code/server/lib/html/shell.js (full file — 241 lines)
- /home/hanzla/development/rihal-code/server/lib/html/client.js (lines 816–930 — both IIFEs)
</read_first>

<action>
Fix bugs #594 (sidebar tree duplicates Files view) and #592 (duplicate /api/files fetch) together — they share a root cause: the sidebar IIFE fetches /api/files and the inline IIFE fetches it again.

**Step 1 — shell.js: remove the sidebar-file-tree div**

In shell.js, delete line 86 entirely:
```
    <div id="sidebar-file-tree" style="margin-top:var(--space-4);padding:0 var(--space-2);"></div>
```
Nothing else in shell.js changes.

**Step 2 — client.js: delete the entire sidebar IIFE (lines 817–865)**

Delete from the comment `// ---- File tree (sidebar) ----` on line 816 through the closing `})();` on line 865 inclusive. This is the complete block:

```javascript
// ---- File tree (sidebar) ----
(async function() {
  let groups = [];
  try { const r = await fetch('/api/files'); groups = await r.json(); } catch { return; }
  const tree = document.getElementById('sidebar-file-tree');
  if (!tree) return;
  // ... (all lines through line 865)
})();
```

Do NOT touch lines 867 onward (the `// Inline file list inside Files view` IIFE) — that is the canonical file browser.

**Step 3 — client.js: add shared _filesPromise before the inline IIFE**

After deleting the sidebar IIFE, the inline Files IIFE starts at what was line 868. Immediately before that IIFE (before `// Inline file list inside Files view`), insert:

```javascript
// ---- Shared file-list fetch (single request for all consumers) ----
const _filesPromise = fetch('/api/files').then(function(r) { return r.json(); }).catch(function() { return []; });
```

**Step 4 — client.js: replace fetch call inside inline IIFE**

Inside the inline Files IIFE (the one that renders into `#file-list-inline`), find:
```javascript
  try { const r = await fetch('/api/files'); groups = await r.json(); } catch { return; }
```
Replace with:
```javascript
  try { groups = await _filesPromise; } catch { return; }
```

After these changes:
- `#sidebar-file-tree` no longer exists in the DOM (shell.js) and no JS populates it (sidebar IIFE deleted)
- Exactly one /api/files network request fires per page load via `_filesPromise`
- `loadInlineFile()` still has `.file-tree-item` sync code (lines ~919–921 in original); after sidebar removal `document.querySelectorAll('.file-tree-item')` returns an empty NodeList — no JS error, no functional impact
</action>

<verify>
<automated>
# Confirm sidebar div is gone from shell.js
grep -c 'sidebar-file-tree' /home/hanzla/development/rihal-code/server/lib/html/shell.js
# Expected output: 0

# Confirm sidebar IIFE is gone from client.js (the comment anchor is the safest check)
grep -c 'File tree (sidebar)' /home/hanzla/development/rihal-code/server/lib/html/client.js
# Expected output: 0

# Confirm exactly one fetch('/api/files') call remains in client.js
grep -c "fetch('/api/files')" /home/hanzla/development/rihal-code/server/lib/html/client.js
# Expected output: 1

# Confirm shared promise is present
grep -c '_filesPromise' /home/hanzla/development/rihal-code/server/lib/html/client.js
# Expected output: 2  (declaration + usage inside inline IIFE)

# Confirm server still starts cleanly
node /home/hanzla/development/rihal-code/server/dashboard.js &
SERVER_PID=$!
sleep 2
curl -s -o /dev/null -w "%{http_code}" http://localhost:7717/ && kill $SERVER_PID
# Expected output: 200
</automated>
</verify>

<acceptance_criteria>
- `grep -c 'sidebar-file-tree' server/lib/html/shell.js` returns 0
- `grep -c "fetch('/api/files')" server/lib/html/client.js` returns 1
- `grep -c '_filesPromise' server/lib/html/client.js` returns 2
- `grep -c 'File tree (sidebar)' server/lib/html/client.js` returns 0
- `node server/dashboard.js` starts without error and `curl -s -o /dev/null -w "%{http_code}" http://localhost:7717/` returns 200
</acceptance_criteria>

<done>
The sidebar no longer renders a file tree. DevTools Network tab shows one /api/files request per page load. The Files view inline browser is fully functional. Server boots cleanly.
</done>

---

### Story 20.01.02 — Sprint card and Tasks view empty-state messages

**Type:** auto
**Wave:** 1
**Estimated time:** 20–30 min

<read_first>
- /home/hanzla/development/rihal-code/server/lib/html/client.js (lines 179–196 for sprintCard, lines 548–595 for renderTasks/renderTasksGrouped)
</read_first>

<action>
Fix bugs #593 (sprint card no guidance when tasks empty) and #595 (Tasks view no call-to-action).

**Fix 1 — sprintCard(): add empty-state row when stories.length === 0 (bug #593)**

Current sprintCard() (lines 179–196) ends with:
```javascript
  (s.started_at ? '<div style="color:var(--text-muted);font-size:var(--text-xs);margin-top:4px;">' +
    humanDate(s.started_at) + (s.completed_at ? ' → ' + humanDate(s.completed_at) : ' → ongoing') + '</div>' : '') +
  '</div>';
```

Insert a conditional empty-state div between the progress bar line and the dates line. The full updated return statement for sprintCard() becomes:

```javascript
function sprintCard(s) {
  const stories = s.stories || [];
  const done = stories.filter(t => t.status === 'done' || t.status === 'completed').length;
  const isCur = s.id === S.currentSprint;
  const phaseId = s.phaseId || s.id || '';
  return '<div class="item item-clickable' + (isCur ? ' sprint-current' : '') + '" onclick="navTo(\'sprints/' + s.id + '\')"' +
    (isCur ? ' style="border-left-color:var(--accent-amber);background:rgba(245,158,11,0.04)"' : '') + '>' +
    '<div class="item-title">Sprint ' + esc(s.id) + ' — ' + esc(s.goal || 'No goal') +
    (isCur ? tag('current') : '') + chip(s.status) + '</div>' +
    '<div class="item-meta">' +
    (s.phaseId ? tag('Phase ' + s.phaseId) : '') +
    tag(done + '/' + stories.length + ' tasks') +
    (s.velocity_target != null ? tag('Target: ' + s.velocity_target + 'pts') : '') +
    (s.velocity_actual != null ? tag('Actual: ' + s.velocity_actual + 'pts') : '') + '</div>' +
    '<div style="margin-top:6px;">' + progressBar(done, stories.length) + '</div>' +
    (stories.length === 0 ? '<div class="empty-action" style="margin-top:var(--space-2);font-size:var(--text-xs);">No tasks — run <code>/rihal-plan ' + esc(phaseId) + '</code> to populate</div>' : '') +
    (s.started_at ? '<div style="color:var(--text-muted);font-size:var(--text-xs);margin-top:4px;">' +
      humanDate(s.started_at) + (s.completed_at ? ' → ' + humanDate(s.completed_at) : ' → ongoing') + '</div>' : '') +
    '</div>';
}
```

Key change: the new line inserted after the progress bar div:
```javascript
    (stories.length === 0 ? '<div class="empty-action" style="margin-top:var(--space-2);font-size:var(--text-xs);">No tasks — run <code>/rihal-plan ' + esc(phaseId) + '</code> to populate</div>' : '') +
```

**Fix 2 — renderTasksGrouped(): improve empty-state message (bug #595)**

Current renderTasksGrouped() (line 581):
```javascript
  if (!tasks.length) return '<div class="empty">No tasks yet.<div class="empty-action">Run /rihal-create-story to add tasks</div></div>';
```

Replace with a message that references the current phase from `S.currentPhase`:
```javascript
  if (!tasks.length) {
    var phaseHint = S.currentPhase ? ' ' + S.currentPhase : '';
    return '<div class="empty">No tasks yet.' +
      '<div class="empty-action">Run <code>/rihal-plan' + phaseHint + '</code> to generate tasks for this project.</div></div>';
  }
```

Do NOT touch any other lines in renderTasks() or renderTasksGrouped().
</action>

<verify>
<automated>
# Confirm sprint empty-state message is present in client.js
grep -c 'No tasks — run' /home/hanzla/development/rihal-code/server/lib/html/client.js
# Expected output: 1

# Confirm tasks empty-state references /rihal-plan
grep -c 'rihal-plan' /home/hanzla/development/rihal-code/server/lib/html/client.js
# Expected output: >= 2 (sprintCard + renderTasksGrouped + phaseHints already has one)

# Confirm renderTasksGrouped now uses currentPhase variable
grep -c 'S.currentPhase' /home/hanzla/development/rihal-code/server/lib/html/client.js
# Expected output: >= 1

# Confirm server still starts cleanly
node /home/hanzla/development/rihal-code/server/dashboard.js &
SERVER_PID=$!
sleep 2
curl -s -o /dev/null -w "%{http_code}" http://localhost:7717/ && kill $SERVER_PID
# Expected output: 200
</automated>
</verify>

<acceptance_criteria>
- `grep -c 'No tasks — run' server/lib/html/client.js` returns 1
- `grep -n 'S.currentPhase' server/lib/html/client.js` shows at least one match inside renderTasksGrouped
- `grep -c 'rihal-plan' server/lib/html/client.js` returns >= 2
- `node server/dashboard.js` starts without error
- sprintCard() function still has the `stories` const on line 2 (structural sanity — function not accidentally deleted)
</acceptance_criteria>

<done>
Sprint cards show "No tasks — run /rihal-plan <phaseId> to populate" when stories array is empty. Tasks view empty state shows "Run /rihal-plan <currentPhase> to generate tasks for this project." Server boots cleanly with no JS syntax errors.
</done>

</tasks>

<verification>
Run all checks after both stories are applied:

```bash
# 1. sidebar-file-tree removed from shell.js
grep -c 'sidebar-file-tree' /home/hanzla/development/rihal-code/server/lib/html/shell.js
# → 0

# 2. sidebar IIFE gone from client.js
grep -c 'File tree (sidebar)' /home/hanzla/development/rihal-code/server/lib/html/client.js
# → 0

# 3. exactly one /api/files fetch call
grep -c "fetch('/api/files')" /home/hanzla/development/rihal-code/server/lib/html/client.js
# → 1

# 4. shared promise declared and used
grep -c '_filesPromise' /home/hanzla/development/rihal-code/server/lib/html/client.js
# → 2

# 5. sprint empty-state present
grep -c 'No tasks — run' /home/hanzla/development/rihal-code/server/lib/html/client.js
# → 1

# 6. tasks empty-state improved
grep -c 'S.currentPhase' /home/hanzla/development/rihal-code/server/lib/html/client.js
# → >= 1

# 7. server boots
node /home/hanzla/development/rihal-code/server/dashboard.js &
PID=$!; sleep 2; CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:7717/); kill $PID; echo $CODE
# → 200
```
</verification>

<success_criteria>
- [ ] `grep -c 'sidebar-file-tree' server/lib/html/shell.js` == 0
- [ ] `grep -c "fetch('/api/files')" server/lib/html/client.js` == 1
- [ ] `grep -c '_filesPromise' server/lib/html/client.js` == 2
- [ ] `grep -c 'No tasks — run' server/lib/html/client.js` == 1
- [ ] `curl http://localhost:7717/` returns HTTP 200 with no JS syntax errors in server boot output
- [ ] Files view: clicking any file in inline browser loads and renders file content (no regression)
</success_criteria>

<output>
Create `.planning/phases/20-dashboard-ux-quick-wins/20-01-SUMMARY.md` after execution completes.
</output>
