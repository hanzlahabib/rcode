# Rihal Code

**One-line:** AI engineering methodology — tiered agents, skills, and slash commands for Claude Code / Cursor / compatible IDEs.

## Vision

Rihal Code gives teams a real AI team instead of one assistant pretending to be everything. Agents with cultural identity and hard scope boundaries, a tiered methodology (Starter → Advanced → Ultra Advanced → Standards), file-based state, and zero-lock-in install.

## Current Milestone

**M2 — Hardening & Polish** (in progress)

M1 — Ship v2 + Tier Docs shipped 2026-05-16 (phases 01–19). See `MILESTONES.md`.
See `ROADMAP.md` for the M2 phase breakdown.

## Modules

- `rihal/` — the unified methodology package (34 agents, 39 skills, 71 workflows, 70 commands, CLI)
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
- Install script copies package core into target project's `.rihal/lib/` so projects are self-contained

## Links

- Repo: https://github.com/hanzlahabib/rihal-code
- Template used by scaffold: https://github.com/rihal-om/template
- Open issues: https://github.com/hanzlahabib/rihal-code/issues

## Authoritative Rules

- `AGENTS.md` — never-push-to-main, no AI attribution, no --force, no --no-verify
- `CLAUDE.md` — AI agent project instructions
- `docs/STANDARDS.md` — 5-component skill spec, commit rules, PR checklist

---
*Last updated: 2026-05-16 after M1 milestone completion*
