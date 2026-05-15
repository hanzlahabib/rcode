# Execution Summary

**Phase:** 31 — Preact migration — Majlis dashboard client
**Sprint:** 31.3 — Four complex views migrated to Preact
**Completed:** 2026-05-16
**Executor:** Claude Sonnet 4.6 (sequential executor)

## What Was Built

Migrated the four remaining complex views — Kanban, Files, Agents, Memory — to
Preact components. 11 of 12 views are now Preact; only Orchestration remains
legacy (Sprint 31.4). The agent roster was extracted from server-rendered
shell.js into a client ESM module (agents-data.js).

- `KanbanView.js`: 4-column board with Preact onDragStart/onDragOver/onDrop
  handlers. Drag-and-drop is visual-only — cards move in component state, the
  existing 'Moved (visual only — not persisted)' toast fires. Run/Stop/View
  buttons bridge to window.runStory / window.stopStory / window.openOrchPanel
  with BRIDGE(31.4) markers. Column bucketing port of kanbanCol() with
  activeSessions live-session override.
- `FilesView.js`: useEffect fetches /api/files on mount. Search filter is
  useState. File content fetched on click via /api/file. Markdown rendered via
  global marked CDN. Copy-path button shows toast. Agent-jump bridge watches
  store.requestedFile and pre-fills the search filter when set.
- `agents-data.js`: 18-agent roster exported verbatim from shell.js.
- `AgentsView.js`: Team + AI Agents groups, filter via useState. Agent card
  click sets store.requestedFile to the skill slug and navigates to Files view
  — replaces the legacy viewAgentSkill() setTimeout/DOM-poll hack.
- `MemoryView.js`: useEffect fetches /api/memory. Three render paths: !exists,
  !initialised, and populated (sections map + distillates/changeRecords/archive/
  post-mortems groups + command hints accordion).
- `store.js`: requestedFile field added for agent-to-files navigation bridge.
- `App.js`: kanban, files, agents, memory added to PREACT_VIEWS; LEGACY_VIEWS
  trimmed to ['orchestration'] only.
- `client-main.js`: PREACT_OWNED extended; renderKanban/renderMemory dispatch
  lines removed; renderMemory() and renderDecisions() function bodies deleted;
  renderOrchestration() kept for Sprint 31.4.
- `shell.js`: agent roster array, agentCard(), and viewAgentSkill inline script
  deleted (roster moved to agents-data.js; navigation moved to AgentsView.js).

## Stories Completed

| ID | Title | Status |
|----|-------|--------|
| 31.3.1 | Migrate Kanban view (4-column board, card actions, drag-and-drop) | done |
| 31.3.2 | Migrate Files view (tree fetch, file load, markdown render) | done |
| 31.3.3 | Migrate Agents view; move roster out of shell.js | done |
| 31.3.4 | Migrate Memory view | done |
| 31.3.5 | Register the 4 views in App router; trim legacy route dispatch | done |
| 31.3.6 | Manual regression sweep — complex views | checkpoint (awaiting human verify) |

## Files Modified

| File | Change |
|------|--------|
| `server/lib/html/client/views/KanbanView.js` | Created — 4-column Preact Kanban with visual-only DnD |
| `server/lib/html/client/views/FilesView.js` | Created — file tree + content pane via hooks |
| `server/lib/html/client/views/AgentsView.js` | Created — agent cards + requestedFile navigation |
| `server/lib/html/client/views/MemoryView.js` | Created — memory API fetch + three render paths |
| `server/lib/html/client/agents-data.js` | Created — 18-agent roster moved from shell.js |
| `server/lib/html/client/store.js` | Added requestedFile field for agent-jump bridge |
| `server/lib/html/client/components/App.js` | 4 new view imports; LEGACY_VIEWS → ['orchestration'] |
| `server/lib/html/client/client-main.js` | Deleted renderMemory/renderDecisions; PREACT_OWNED extended |
| `server/lib/html/shell.js` | Deleted agent roster, agentCard(), viewAgentSkill inline script |

## Deviations from Plan

**FilesView dangerouslySetInnerHTML for markdown**: The plan called for porting
renderMd / stripFrontmatter into FilesView. Done — but rendering the marked HTML
output requires Preact's dangerouslySetInnerHTML (no alternative for raw HTML
string injection). This is safe here because the source is always a local project
file fetched from /api/file, not user-provided content.

**No static #view-memory host to delete from shell.js**: The sprint plan
referenced shell.js:234-241 as the static memory host. In the actual codebase,
this markup was not present — it had been removed in a prior cleanup. The
MemoryView.js creation + App.js routing is the complete migration; no shell.js
deletion was needed for this view.

**initFileList() in client-main.js**: The Files view route dispatch previously
called initFileList(). Since FilesView.js now owns the file tree, the
initFileList() dispatch line was removed along with the legacy renderMemory and
renderDecisions dispatch lines in task 31.3.5. The initFileList function body
itself was not deleted (it remains as dead code for Sprint 31.4 to clean up
along with other legacy file helpers).

## Blockers Encountered

None.

## Next Steps

- Sprint 31.3.6: Human in-browser regression sweep (checkpoint below).
- Sprint 31.4: Migrate Orchestration view; delete remaining legacy modules
  (client-render.js dead code, initFileList, legacy files helpers in
  client-main.js, renderKanban in client-kanban.js); promote BRIDGE(31.4)
  window globals to ESM imports.

## Verification

- [x] `node server/dashboard.js` starts cleanly; `/` returns 200
- [x] All client JS files pass `node --check`
- [x] `renderHtml()` still emits app-root and /js/app.js
- [x] 4 new views imported + registered in App.js PREACT_VIEWS
- [x] LEGACY_VIEWS = ['orchestration'] only
- [x] renderMemory() and renderDecisions() deleted from client-main.js
- [x] renderOrchestration() kept in client-main.js
- [x] BRIDGE(31.4) markers on all window.* legacy global calls in KanbanView
- [x] visual-only DnD toast preserved exactly
- [x] requestedFile bridge in store.js + FilesView + AgentsView
- [x] 18-agent roster confirmed in agents-data.js
- [x] shell.js: agentCard, realAgents, aiAgents, viewAgentSkill removed
- [ ] Human in-browser regression sweep (task 31.3.6 — checkpoint pending)
