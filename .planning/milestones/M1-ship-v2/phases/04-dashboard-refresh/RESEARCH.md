# Research — Phase 04: Dashboard Refresh

**Researcher:** hanzla (retroactive — documented after execution)
**Date:** 2026-04-25
**Consumed by:** PLAN.md, 04-01-SPRINT.md, 04-02-SPRINT.md

## Problem Statement

The Majlis dashboard (`server/dashboard.js`) was a static HTML page with minimal styling showing raw state.json data. No design system, no navigation hierarchy, no way to drill into phases/sprints/tasks, and no file browser for `.planning/` artifacts. Engineers had to `cat` files manually to see any project detail.

## Prior Art

| Item | What it does | Relevant because |
|------|--------------|-----------------|
| `server/dashboard.js` | Node stdlib HTTP server, inline HTML/CSS/JS | Must stay single-file, zero npm deps |
| `.rcode/state.json` | Source of truth for phases/sprints/tasks | All data comes from here |
| `.planning/phases/` | Sprint files, plan docs | File browser should surface these |
| Reverse brainstorm artifact | 16 ideas for dashboard interactivity | Prioritized feature list |

## Options Considered

### Option A: Full SPA rewrite with a framework (React/Vue)
- **Approach:** Separate frontend build, dashboard serves static assets
- **Pros:** Rich interactivity, component model
- **Cons:** Violates zero-npm-dep constraint; adds build step; overkill
- **Effort:** L

### Option B: Single-file server with client-side JS and CSS (chosen)
- **Approach:** All HTML/CSS/JS inlined in `server/dashboard.js` via template literals; embed state as `window.__S__`; hash-based router
- **Pros:** Stays pure Node stdlib; no build step; single file to understand and deploy
- **Cons:** File grows large; CSS/JS not separately cacheable
- **Effort:** M

### Option C: SSE live push instead of polling
- **Approach:** Server-Sent Events stream state changes to client
- **Pros:** True real-time updates
- **Cons:** More complex server code; polling every 30s is sufficient for this use case
- **Effort:** M

## Recommended Approach

Option B. The constraint (pure Node stdlib, single file) is non-negotiable per CLAUDE.md. Option B satisfies all requirements with minimal risk.

## Constraints

- `server/dashboard.js` — pure Node stdlib only, zero npm deps
- Single-file server — do not split into multiple server files
- View-only — no write endpoints, POST handlers, or database code
- `node server/dashboard.js` must start cleanly after every change
- marked.js allowed via browser CDN (not a server-side dep)
- Inter font allowed via Google Fonts CDN

## Open Questions

| Question | Owner | Resolved? |
|----------|-------|-----------|
| SSE vs polling for refresh? | hanzla | ✅ 30s polling chosen — sufficient, simpler |
| How to serve `window.__S__` without page reload on refresh? | hanzla | ✅ `/api/state` polls and hot-swaps data (#262 filed for full fix) |
| Path traversal protection for `/api/file`? | hanzla | ✅ `path.resolve()` + `startsWith(PROJECT_ROOT)` check |

## Key References

- `.planning/brainstorms/2026-04-25-reverse-brainstorm-dashboard.md` — 16 ideas, priority tiers
- GitHub issues #260–#324 — 64 dashboard improvement tickets from retro
- CLAUDE.md — single-file + stdlib constraints
