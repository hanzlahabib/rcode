# Current Milestone — `rcode`

Active milestone. Goal, phases, current sprint, blockers. The agent reads this before starting any task.

---

## Milestone

**Name:** M3 — Archon Dashboard Port (v5)
**Started:** (pre-2026-08, see `.rcode/state.json` for phase-level dates)
**Target close:** rolling
**Goal:** Port the Archon-style dashboard experience and harden `/rcode-execute` core (branch-protection preflight, worktree fallback, init-JSON parsing, `acceptance_criteria` cleanup). v4.0.0 rebrand + OSS release prep (below) shipped and is archived history — package is at v4.16.1.

## Active phase

**Phase:** Fix execute.md core bugs: branch-protection preflight, worktree fallback, init-JSON parsing, acceptance_criteria cleanup
**Source of truth:** `.rcode/state.json` (`current_phase`, `current_plan`) — update this file's phase/sprint detail alongside state.json rather than letting it drift.

## Active sprint / cycle

**Focus:** See `.rcode/state.json` phases 34-37 (Status Summary Bar, Session History Panel, Command Palette/Sidebar Health Badges, Phase Dependency Graph) — several `executing`, phase 21 (Dashboard Data Pipeline) `planned`.

## Blockers

| Blocker | Owner | Status |
|---|---|---|
| (none active) | | |

## Recent decisions

- **2026-05-20:** Hard-break v4.0.0 rebrand — no rename shim, full conventional-commits `!` breaking marker.
- **2026-04-26:** Build Memory Bank as the rcode product moat (persistent project memory as primary differentiator).
- **2026-04-26:** Path B — skill folder names stay `rcode-*` for installer compatibility, user-facing slash brand stays `rcode-*`.

Full log: [`../project/decisions.md`](../project/decisions.md).
