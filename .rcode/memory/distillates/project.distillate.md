---
generated: true
do-not-edit: true
regenerate-with: /rcode-memory-distill
source-digest: 1eb6706dd167496e23589a5c6c3c5c9a14084362
generated-at: 2026-05-22T21:10:24Z
source-files:
  - project/stack.md
  - project/decisions.md
  - project/glossary.md
  - people/stakeholders.md
  - milestones/current.md
  - incidents/known-issues.md
---

# Project Distillate — `rcode`

> Lossless compression of `project/` + `people/` + `milestones/current.md` + `incidents/known-issues.md`. Optimised for LLM context loading.

## Identity

`rcode` (npm: `@hanzlaa/rcode`, v4.0.0) — a methodology for building software with AI, shipped as **files** (folders, markdown, slash commands) installed into IDE config dirs. No multi-agent harness, no vector DB, no daemon. Targets: Claude Code, Cursor, Gemini, VS Code, Antigravity. Single agent navigates structure; multi-agent only via explicit `/rcode-council` / `/rcode-execute`. Memory Bank (`.rcode/memory/`) is the product moat — persistent, git-tracked, dashboard-rendered project memory.

## Stack (one line)

Node ≥18 CommonJS · zero RUNTIME deps · built-in `node --test` runner · esbuild bundles devDeps (`picocolors`, `nanospinner`, `@clack/prompts`, `fast-glob`, `zod`, `semver`, `diff`) into `dist/rcode.js` · CI matrix Node 18/20/22/24. Diwan dashboard (`server/dashboard.js`, port 7717) is hand-written HTML/CSS/JS on `node:http`, view-only, ~1880 lines.

## Storage layout

`.rcode/state.json` (project state), `.rcode/memory/` (Memory Bank), `.rcode/context/active.md` (current task), `.rcode/brain/` (institutional knowledge from upstream rcode repos), `.planning/` (runtime artefacts — phases, councils, summaries).

## Install paths

`.claude/` (primary), `.cursor/`, `.gemini/`. Installer at `cli/install.js` — line 741–743 hardcodes the `rcode-` skill folder prefix (off-limits without ADR).

## Key decisions (most recent first)

1. **2026-05-20 v4.0.0 hard-break rebrand** — `rihal` → `rcode` across CLI/skills/workflows/docs; no rename shim, no aliases, conventional-commits `!` on release. One-way door.
2. **2026-05-20 File-shipping over agent-framework** — IDE already provides the runtime; anything extra is weight to debug. Identity-defining.
3. **2026-05-20 Single-agent default, multi-agent on demand** — multi-agent demos look good but cost tokens linearly and fail unpredictably.
4. **2026-05-20 Markdown over JSON** — humans + LLMs both parse it natively; JSON only for machine state (`state.json`); `team.yaml` is YAML.
5. **2026-05-15 Hyphen slash commands `/rcode-*`** — cross-IDE compatibility; colon namespace inconsistent on Cursor/Gemini.
6. **2026-04-26 Memory Bank as product moat** — structured + visible + versioned + dashboard-rendered context is the primary differentiator vs other agent-orchestration tools.
7. **2026-04-26 Path B** — skill folder names stay `rcode-*` for installer compatibility; user-facing slash brand stays `rcode-*`.
8. **2026-04-26 Drop `rcode-architect` + `rcode-tech-writer`** — folded into `rcode-waleed` (CTO) and `rcode-noor` (Tech Writer). 47 → 45 agents.
9. **2026-04-26 Skip Phase 5 workflow splits** — 5 files >500 lines; runtime risk > line-count win until a workflow runtime test scaffold exists.
10. **2026-04-26 Plain English flags** — `--attack` over `--adversarial`, `--edge-cases` over `--edge-case-hunter`; audience includes non-native English speakers.

## Glossary (compressed)

**Brain** `.rcode/brain/` upstream-pulled knowledge. **Council/Majlis** (مجلس) consulting council of specialist subagents via `/rcode-council`. **Dalil** (دليل) codebase scout persona with mandatory Scan Scope block; closes with one-line **Brief**. **Diwan** (ديوان) read-only dashboard server, port 7717. **Distillate** token-optimised lossless compression for fast LLM loading (this file). **Foreman pattern** clone-website skill's parallel extract-spec-dispatch loop. **Memory Bank** `.rcode/memory/` checked-in persistent project memory. **Path B** decision to keep `rcode-*` folder names. **Phase** unit in `1-analysis / 2-plan / 3-solutioning / 4-implementation`. **SKILL.md** markdown contract (YAML frontmatter + body) at `rcode/skills/{actions,agents,core}/<name>/`. **team.yaml** agent registry — sections `agents:`, `utility_agents:`, `routing:`, `tactical_agents:`. **workflow** orchestration logic at `rcode/workflows/<name>.md`, `@`-included by commands.

## People

- **Hanzla Habib** (`@hanzlahabib`) — solo builder, sole decision authority. Builds rcode *with* Claude (the shipped methodology = the one he uses). Same-day on active work. GMT+5/GMT+4.
- **npm users** — bug reports prioritised within 1 week via GH issues.
- **IDE platform partners** (Claude Code / Cursor / Gemini) — no direct comms; conform to public APIs.

## Current milestone (v4.0.0 rebrand + OSS release prep)

Started 2026-05-20, rolling close 2026-06-15. Phase = post-rename hardening. Done: v4.0.0 bump (`304eebc`), full rihal→rcode rename (`4da7c1e`, `be560f8`, `22ea25b`, `fd1849d`, `2b0bbee`), brain sparse-checkout fix (`adf6f7e`). Remaining: close #861 (leftover refs), #860 (broken skill workflow paths), regenerate Memory Bank distillates (this commit), README/CHANGELOG announce audit. No blockers.

## Known issues (top 8, all open)

| # | Title | Workaround |
|---|---|---|
| #861 | leftover `rihal` refs in installed surface | none — cosmetic |
| #860 | 25+ skill workflows reference non-existent paths | spot-fix on touch; planner blocks |
| #859 | `rcode-codebase-mapper` stalls at 600s | rerun; check node_modules globs |
| #856 | `roadmap list-phases` wrong in_progress | trust state.json |
| #854/#855 | `state set-phase` doesn't mark previous completed; wrong path under some configs | hand-edit `.rcode/state.json` |
| #852 | ts-node bin symlink fails on pnpm install | recommend `pnpm dlx` (also fixes npm 11.x npx incompat, `3ba90fd`) |
| #842/#839 | planner emits wrong TS pin + wrong Drizzle migration format | human-review planner output before execute |
| Phase 5 | 5 workflow files >500 lines | accepted — runtime risk > budget win |

Also: persona SKILL.md files >120 lines (cap is 200, all pass); `.rcode/agents/` + `.rcode/context/` always untracked (install artefacts, regenerated per install).
