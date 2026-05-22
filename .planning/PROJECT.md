# rcode

**One-line:** AI engineering methodology — tiered agents, skills, and slash commands for Claude Code / Cursor / compatible IDEs.

## Vision

rcode gives teams a real AI team instead of one assistant pretending to be everything. Agents with cultural identity and hard scope boundaries, a tiered methodology (Starter → Advanced → Ultra Advanced → Standards), file-based state, and zero-lock-in install.

## Current Milestone: M3 — Archon Dashboard Port (v5)

**Goal:** Port high-value Archon UI patterns into the Diwan/Majlis Preact dashboard without adding server dependencies.

**Target features:**
- Status Summary Bar with aggregate count chips and multi-attribute filtering
- Session history panel (persisted past runs, grouped by status/date)
- Searchable, categorized command palette (Cmd+K style)
- Sidebar with live health badges (active sessions, blockers)
- Poll/realtime dedup-merge so live SSE/WS events and persisted history render once
- Lightweight hand-rolled SVG phase DAG view (depends_on waves)
- Structured rejection dialogs that collect a reason at checkpoint gates

**Constraint:** `server/dashboard.js` stays Node-stdlib only (no new server deps); client stays Preact (htm + ESM CDN, no build step); dashboard server keeps zero write endpoints.

M1 — Ship v2 + Tier Docs shipped 2026-05-16 (phases 01–19). See `MILESTONES.md`.
M2 — Hardening & Polish (phases 20–33) in progress — see `ROADMAP.md`.

## Modules

- `rcode/` — the unified methodology package (34 agents, 39 skills, 71 workflows, 70 commands, CLI)
- `cli/` — installer + CLI commands (install, tiers, dashboard, doctor, etc.)
- `server/dashboard.js` — view-only Majlis dashboard (port 7717) with orchestration + node-pty terminal
- `server/lib/html/client/` — dashboard client JS modules (render, kanban, main)
- `docs/` — TIERS.md, STANDARDS.md, METHODOLOGY.md
- `.github/` — workflows, PR/issue templates

## Stack

- Node.js 20+ (LTS)
- Pure Node stdlib for dashboard (no framework)
- No runtime deps; pnpm for dev

## Distribution

- `npm i -g @hanzlahabib/rihal-code` (or `npx @hanzlahabib/rihal-code install`)
- Install script copies package core into target project's `.rcode/lib/` so projects are self-contained

## Links

- Repo: https://github.com/hanzlahabib/rihal-code
- Template used by scaffold: https://github.com/rcode-om/template
- Open issues: https://github.com/hanzlahabib/rihal-code/issues

## Authoritative Rules

- `AGENTS.md` — never-push-to-main, no AI attribution, no --force, no --no-verify
- `CLAUDE.md` — AI agent project instructions
- `docs/STANDARDS.md` — 5-component skill spec, commit rules, PR checklist

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → move to Out of Scope with reason
2. Requirements validated? → move to Validated with phase reference
3. New requirements emerged? → add to Active
4. Decisions to log? → add to Key Decisions
5. "What This Is" still accurate? → update if drifted

**After each milestone (via `/rcode-complete-milestone`):**
1. Full review of all sections
2. Core Value check
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-16 — M3 Archon Dashboard Port started*
