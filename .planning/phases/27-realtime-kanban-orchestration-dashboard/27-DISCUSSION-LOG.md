# Phase 27: Realtime Kanban Orchestration Dashboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 27-realtime-kanban-orchestration-dashboard
**Areas discussed:** Design System, Terminal Layout, Shared Memory, Orchestrator Lifecycle, Session Persistence

---

## Design System

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind via CDN | No build step, replace css.js class-by-class | |
| Refine existing CSS | Reorganize css.js into modules | |
| Full UI library (shadcn-style) | Prebuilt CSS bundle, opinionated look | ✓ |

**User's choice:** Full UI library (shadcn-style prebuilt CSS)
**Notes:** User additionally provided Anthropic Claude design system URL to fetch and apply. Said "go wild" — full redesign authorized.

---

## Terminal Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Side-panel drawer | Right panel (30-40% width), tabs per session, kanban stays visible | ✓ |
| Per-card inline (current) | Terminal expands inside card, 220px max-height | |
| Fullscreen modal | Full screen overlay per session, hides kanban | |

**User's choice:** Side-panel drawer
**Notes:** Immediately accepted the recommended option. Panel should have tabs for multiple simultaneous sessions.

---

## Shared Memory / Session Independence

| Option | Description | Selected |
|--------|-------------|----------|
| Filesystem is the shared memory | No extra coordination, sessions read same project files | ✓ |
| Session context injection | Orchestrator injects memory summary into spawned sessions | |
| Lock file coordination | .rihal/orchestrator-state.json shared state | |

**User's choice:** Filesystem is the shared memory
**Notes:** User initially asked for "each card to be independent + shared memory and part of orchestrator with memory shared so that it works efficiently maximum" — clarified that the filesystem naturally handles this. Accepted immediately.

---

## Orchestrator Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard auto-spawns it | dashboard.js spawns orchestrator.js as child process | ✓ |
| Auto-detect with startup banner | Check port 7718, show banner if not running | |
| npm script / Makefile | pnpm start:all runs both | |

**User's choice:** Dashboard auto-spawns it
**Notes:** Single start command is the goal. Auto-restart on crash also requested.

---

## Session Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Persist completed sessions to disk | Write JSON on exit, replay on reconnect | ✓ (combined) |
| Ephemeral only | In-memory, lost on restart | ✓ (for running sessions) |
| Persist all sessions live to disk | Stream every line to disk | |

**User's choice:** Hybrid (1 + 2) + auto clean commands
**Notes:** Running sessions stay in-memory for speed. Completed sessions persist to ~/.rihal/sessions/. "Give auto clean commands too for user selection" — add /api/clean-sessions endpoint + Clean Sessions UI button with 7/30/All options.

---

## Claude's Discretion

- Exact CSS library choice (Pico CSS vs alternative that integrates with Claude design system)
- Panel animation timing
- Tab ordering (most recent first vs FIFO)
- Session file schema details
- CSS variables vs utility classes

## Deferred Ideas

- Multi-user collaboration
- Claude Managed Agents API integration (cloud sessions)
- Story creation UI from dashboard
- Drag-to-run
- Session replay scrubbing
