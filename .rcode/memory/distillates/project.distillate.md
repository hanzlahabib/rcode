---
generated: true
do-not-edit: true
regenerate-with: /rcode-memory-distill
source-digest: 0fd4c0ca2d1ef674b50b6a047f610c29b2f0913a
generated-at: 2026-09-02T09:34:42Z
source-files:
  - project/stack.md
  - project/decisions.md
  - project/glossary.md
  - people/stakeholders.md
  - people/team.md
  - milestones/current.md
  - incidents/known-issues.md
token-estimate: ~1850
---

# Project Distillate — `rcode`

> Lossless compression of `project/` + `people/` + `milestones/current.md` + `incidents/known-issues.md`. Optimised for LLM context loading. `source-digest` is a content hash (sha1 of each source file's bytes) via `node .rcode/bin/rcode-tools.cjs memory-digest project` — stable across git clone/checkout/worktree, unlike the old mtime-based digest (#1065).

## Identity

`rcode` (npm: `@hanzlaa/rcode`, v4.16.1) — a methodology for building software with AI, shipped as **files** (folders, markdown, slash commands) installed into IDE config dirs. No multi-agent harness, no vector DB, no daemon. Targets: Claude Code, Cursor, Gemini. Single agent navigates structure; multi-agent only via explicit `/rcode-council` / `/rcode-execute`. Memory Bank (`.rcode/memory/`) is the product moat — persistent, git-tracked, dashboard-rendered project memory.

## Stack (one line)

Node ≥18 CommonJS · zero RUNTIME deps · built-in `node --test` runner · esbuild ^0.25 bundles devDeps (`picocolors`, `nanospinner`, `@clack/prompts`, `fast-glob`, `zod`, `semver`, `diff`) into `dist/rcode.js` · CI matrix Node 18/20/22/24 via `.github/workflows/test.yml`, `release.yml`, `semantic.yaml`, `commit-author.yaml`. Diwan dashboard (`server/dashboard.js`, port 7717) is hand-written HTML/CSS/JS on `node:http`, view-only, ~1880 lines across 5 files in `server/lib/html/`, hash-based routing.

## Storage layout

`.rcode/state.json` (project state), `.rcode/memory/` (Memory Bank), `.rcode/context/active.md` (current task), `.rcode/brain/` (institutional knowledge from upstream rcode repos), `.planning/` (runtime artefacts — phases, councils, summaries).

## Distribution

npm registry, package `@hanzlaa/rcode`; install via `npx @hanzlaa/rcode install` into `.claude/` (Claude Code, primary), `.cursor/`, `.gemini/`. GitHub issue/PR sync via `cli/github-sync.js`.

## Key decisions (most recent first)

1. **2026-08-06 Named-engineer persona dispatch wired into `/rcode-execute`** — `rcode-hanzla`/`yousef`/`haitham`/`omar` added to `execute.md`'s subagent allowlist; `execute-waves.md` classifies each plan by `files_modified` globs (fallback: objective keywords) into frontend/backend/full-stack/other and routes to the matching persona, falling back to generic `rcode-executor` only when ambiguous or docs/config-only. Reason: named engineers existed only as advisory personas or dead-end roleplay (#1003/#1004) — real execution always used one generic executor. User explicitly chose real dispatch over advisory-only. Decided via herdr-orchestration audit+fix run (10 agents, 2 waves) surfacing #1003-#1013. Easy to revert — routing isolated to `execute-waves.md` step 3.
2. **2026-05-20 v4.0.0 hard-break rebrand** — `rihal` → `rcode` across CLI/skills/workflows/docs; no rename shim, no aliases, conventional-commits `!` on release (`304eebc`). One-way door — v3.x stays on npm unsupported.
3. **2026-05-20 File-shipping over agent-framework** — IDE already provides the runtime; anything extra is weight to debug. Rejected: daemon orchestrator, library+framework. Identity-defining, one-way door.
4. **2026-05-20 Single-agent default, multi-agent on demand** — multi-agent demos look good but cost tokens linearly and fail unpredictably; council/execute paths exist when truly needed.
5. **2026-05-20 Markdown over JSON** — humans + LLMs both parse it natively; JSON only for machine state (`state.json`); `team.yaml` is YAML. Hard to reverse — would require rewriting every skill/workflow.
6. **2026-05-15 Hyphen slash commands `/rcode-*`** — cross-IDE compatibility; colon namespace inconsistent on Cursor/Gemini during v3.6.x testing. Hard to reverse — user muscle memory.
7. **2026-04-26 Memory Bank as product moat** — structured + visible + versioned + dashboard-rendered context is the primary differentiator vs other agent-orchestration tools; rejected chat-memory layer (invisible, unreviewable) and slim/rename-only (no new value). Easy to reverse — Memory Bank is additive.
8. **2026-04-26 Path B** — skill folder names stay `rcode-*` for installer compatibility (`cli/install.js:741-743` hardcodes the prefix); user-facing slash brand uses `/rcode:*` for new branded skills. Easy to reverse if installer is later extended.
9. **2026-04-26 Drop `rcode-architect` + `rcode-tech-writer`** — folded into `rcode-waleed` (CTO) and `rcode-noor` (Tech Writer); pure scope overlap, no unique capability lost. 47 → 45 agents. Easy to revert via git history.
10. **2026-04-26 Skip Phase 5 workflow splits** — 5 files >500 lines (`autonomous.md` 1059, `complete-milestone.md` 836, `council.md`, `code-review.md`, `code-review-fix.md`); dense executable logic, not redundant prose — splitting carries runtime risk without a workflow test scaffold. Reward lower than effort; can revisit with proper testing.
11. **2026-04-26 Plain English flags** — `--attack` over `--adversarial`, `--edge-cases` over `--edge-case-hunter`; audience includes non-native English speakers. Easy to add aliases later.
12. **2026-04-26 Memory Bank initialised** — dogfood on rcode itself; rejected CLAUDE.md-only (no structure, goes stale), wiki (not version-controlled with code), README sections (doesn't scale). Easy to reverse — delete `.rcode/memory/`.

## Glossary (compressed)

**ADR** Architecture Decision Record — lightweight in `decisions.md`, heavier ones get a dedicated file in `docs/adr/`. **Brain** `.rcode/brain/` institutional knowledge pulled from upstream rcode repos on install. **Brief** Dalil's closing one-line summary, piped into `.planning/codebase/CHANGELOG.md` in refresh mode. **Council** synonym for Majlis when invoked via `/rcode-council`. **Dalil** (دليل) codebase scout persona; reads the repo honestly with a mandatory Scan Scope block. **Diwan** (ديوان) read-only dashboard server (`server/dashboard.js`), port 7717, renders state from `.rcode/`, `.planning/`, `.rcode/memory/`. **Distillate** token-optimised lossless compression of a document set for fast LLM context loading (this file); see `rcode-distillator` skill. **Foreman pattern** clone-website skill's extract-section → write-spec → dispatch-builder → next-section loop; inspection and construction run in parallel. **Majlis** (مجلس) consulting council that convenes specialists for a multi-domain question and synthesises a recommendation with explicit dissent. **Memory Bank** `.rcode/memory/` structured checked-in persistent project memory; read first by every agent session. **Path B** the 2026-04-26 decision (see above) to keep skill folder names `rcode-*`. **Phase** unit of work in `1-analysis / 2-plan / 3-solutioning / 4-implementation`, reflected in `rcode/skills/actions/`. **Scan Scope** mandatory header Dalil writes on every document declaring which source roots were searched and which weren't. **SKILL.md** markdown contract (YAML frontmatter + body) at `rcode/skills/{actions,agents,core}/<name>/SKILL.md`. **team.yaml** agent registry mapping id → file_path + skill_path; sections `agents:`, `utility_agents:`, `routing:`, `tactical_agents:`; read by Diwan and `council-panel.cjs`. **workflow** step-by-step orchestration logic at `rcode/workflows/<name>.md`, `@`-included by command files.

## People

- **Hanzla Habib** (`@hanzlahabib`) — solo builder, sole decision authority over every architectural call, brand surface, release cadence, dogfeed verdict. Comm: GitHub for issues/PRs, direct otherwise. Same-day response on active work. GMT+5 (PK)/GMT+4 (Oman). Builds rcode *with* Claude — the shipped methodology is the one he uses; every skill/agent/workflow was designed in dialogue with the same LLM users run.
- **npm users** (`@hanzlaa/rcode` consumers) — own real-world feedback on whether rcode reduces context loss. Comm: GitHub Issues/PRs at `hanzlahabib/rihal-code`. Best-effort, bug reports prioritised within 1 week. Primary audience: solo devs and startup teams; persona names (Sadiq, Waleed, Dalil, etc.) are brand vocabulary, not rcode-only.
- **rcode team (internal)** — own rcode-specific brain content pulled into every install via `.rcode/brain/` (manifest at `.rcode/brain/sources.yaml`). Comm: Slack (rcode workspace). Day-of response for active projects. GMT+4 (Oman).
- **Claude Code / Cursor / Gemini** (IDE platform partners) — own the slash-command + skill protocols rcode targets. No direct comms; track upstream releases for breaking changes. If skill discovery format changes, installer prefix logic at `cli/install.js:741-743` may need to follow.
- **Team coverage (internal, `people/team.md`):** Hanzla is primary and sole owner of CLI/installer, skills+agents, dashboard (Diwan), tests+CI, docs+brand — no backup by design (solo-maintainer project); external contributions welcomed via issues/PRs. Reviews all PRs himself, using `/rcode-review` for cross-AI second opinions.

## Current milestone

**M3 — Archon Dashboard Port (v5)**, started pre-2026-08 (see `.rcode/state.json` for phase-level dates), target close: rolling. Goal: port the Archon-style dashboard experience and harden `/rcode-execute` core (branch-protection preflight, worktree fallback, init-JSON parsing, `acceptance_criteria` cleanup). v4.0.0 rebrand + OSS release prep is shipped, archived history — package is at v4.16.1.

Active phase: "Fix execute.md core bugs: branch-protection preflight, worktree fallback, init-JSON parsing, acceptance_criteria cleanup" — source of truth is `.rcode/state.json` (`current_phase`/`current_plan`); this file's phase/sprint detail should be updated alongside state.json.

Active sprint/cycle focus: `.rcode/state.json` phases 34-37 (Status Summary Bar, Session History Panel, Command Palette/Sidebar Health Badges, Phase Dependency Graph) — several `executing`; phase 21 (Dashboard Data Pipeline) `planned`.

Blockers: none active.

Recent decisions (milestone-scoped subset): 2026-05-20 hard-break v4.0.0 rebrand; 2026-04-26 Memory Bank as product moat; 2026-04-26 Path B skill-folder naming.

## Known issues (top, all open)

| # | Title | Surface | Workaround | Real fix planned for | First seen |
|---|---|---|---|---|---|
| — | Workflow files exceed 500-line target (`autonomous.md`, `complete-milestone.md`, `council.md`, `code-review.md`, `code-review-fix.md`) | `rcode/workflows/*.md` | Files run correctly; only line-count budget breached | Out of scope until a workflow runtime test scaffold exists (tracked: TASKS.md "Phase 5 — Workflow file splits ⏭ skipped") | 2026-04-26 |
