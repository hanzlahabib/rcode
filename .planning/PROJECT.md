# Rihal Code

**One-line:** AI engineering methodology — tiered agents, skills, and slash commands for Claude Code / Cursor / compatible IDEs.

## Vision

Rihal Code gives teams a real AI team instead of one assistant pretending to be everything. Agents with cultural identity and hard scope boundaries, a tiered methodology (Starter → Advanced → Ultra Advanced → Standards), file-based state, and zero-lock-in install.

## Current Milestone

**M1 — Ship v2 + Tier Docs** (in progress)

See `ROADMAP.md` for phase breakdown.

## Modules

- `rihal/` — v1 production package (18 agents, 22 action skills, 17 agent skills, CLI)
- `rihal/v2/` — v2 methodology (36 agents, 67 workflows, 69 commands) — just shipped to main
- `cli/` — installer + CLI commands (install, tiers, dashboard, etc.)
- `server/dashboard.js` — view-only Diwan dashboard (port 7717)
- `docs/` — TIERS.md, STANDARDS.md, V2-PREVIEW.md, METHODOLOGY.md
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
