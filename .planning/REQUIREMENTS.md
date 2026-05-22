# Requirements — M3 Archon Dashboard Port (v5)

**Source:** Audit of coleam00/Archon dashboard + conversation with Hanzla on 2026-05-16
**Scope:** Port high-value Archon UI patterns into the Diwan/Majlis Preact dashboard, reimplemented in Preact — no React, no new server dependencies.

**Quality constraint (applies to all requirements):** `server/dashboard.js` stays Node-stdlib only; the client stays Preact via htm + ESM CDN with no build step; the dashboard server keeps zero write endpoints. Every change must add value without degrading existing dashboard UX.

---

## Dashboard Surfaces (DSH)

- [ ] **DSH-1**: User can see aggregate count chips (phases / sprints / sessions grouped by status) in a status summary bar
- [ ] **DSH-2**: User can filter a dashboard view by status, milestone, and date using filter chips
- [ ] **DSH-3**: User's active filters persist in the URL so a filtered view can be bookmarked and shared
- [ ] **DSH-4**: User can open a searchable, categorized command palette to find and run any rcode command
- [ ] **DSH-5**: User can see live health badges (active session count, blocker count) in the sidebar
- [ ] **DSH-6**: User can view the milestone's phases as a dependency graph showing depends_on waves

## History & State (HIST)

- [ ] **HIST-1**: User can view a panel of past orchestration runs grouped by status and date
- [ ] **HIST-2**: User can see each past run's duration and final status
- [ ] **HIST-3**: Live session events and persisted run history render as a single deduplicated list with no double rows

## Gate UX (GATE)

- [ ] **GATE-1**: User can reject a checkpoint through a structured dialog that captures a reason
- [ ] **GATE-2**: User-entered rejection reasons are recorded against the run/phase for later review

---

## Future (Deferred)

- Virtualized log rendering for very high-volume structured output (XtermPanel already handles terminal output)

## Out of Scope

- Visual drag-and-drop workflow builder — rcode workflows are authored as YAML skills, not built in a canvas
- Migration to React 19 + Vite SPA — violates the dep-free server and zero-build-step constraints
- Chat / conversations surface — different product area
- `@xyflow/react` / `@dagrejs/dagre` graph libraries — DSH-6 is hand-rolled SVG to avoid new deps

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DSH-1 | 34 | Pending |
| DSH-2 | 34 | Pending |
| DSH-3 | 34 | Pending |
| DSH-4 | 36 | Pending |
| DSH-5 | 36 | Pending |
| DSH-6 | 37 | Pending |
| HIST-1 | 35 | Pending |
| HIST-2 | 35 | Pending |
| HIST-3 | 35 | Pending |
| GATE-1 | 37 | Pending |
| GATE-2 | 37 | Pending |

**Total:** 11 requirements across 3 categories — 11/11 mapped ✓
