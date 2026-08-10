# Workflow: rcode-init

<purpose>
Begin the rihla. This is the entry point for configuring rcode in a project. Runs automatically on first use of any rcode command (via auto-init-guard in do.md), or explicitly via /rcode-init for a full setup with codebase scan.

No manual "rcode install" needed per project — just use any /rcode-* command and this triggers automatically when config is missing.
</purpose>

## Step 0 — Usage check

If `$ARGUMENTS` contains only `--help` or `-h`:

```
Usage: /rcode-init [--reset] [--skip-scan]

  --reset        overwrite existing .rcode/config.yaml and JOURNEY.md
  --skip-scan    skip the codebase scan step

Examples:
  /rcode-init                  # first-time setup for this project
  /rcode-init --reset          # reconfigure from scratch
  /rcode-init --skip-scan      # config only, no codebase read
```

STOP here if just help was requested.

## Step 1 — Greet and detect state

Print:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  السلام عليكم — rcode init
  Configuring your rihla (journey)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Run detection in parallel:

```bash
# rcode presence
test -f .rcode/config.yaml && echo "rcode-configured: yes" || echo "rcode-configured: no"
test -f .rcode/state.json && echo "state-present: yes" || echo "state-present: no"
test -f .rcode/JOURNEY.md && echo "rihla-present: yes" || echo "rihla-present: no"

# Project presence
# Use git rev-parse instead of test -d .git — in git worktrees .git is a FILE not a dir
git rev-parse --is-inside-work-tree >/dev/null 2>&1 && echo "git: yes" || echo "git: no"
ls package.json pyproject.toml Cargo.toml go.mod 2>/dev/null | head -3
find . -maxdepth 2 -type d \( -name src -o -name app -o -name lib \) 2>/dev/null | head -3

# Git history depth (if present)
git log --oneline 2>/dev/null | wc -l
```

Classify project into one of four states:

| State | Signal | Suggested next step |
|-------|--------|---------------------|
| `fresh` | No code, no git, no rcode | `/rcode-new-project` — let's design it |
| `existing-new-rcode` | Has code + git, no rcode | `/rcode-scan` or `/rcode-council` — understand before changing |
| `returning` | rcode already configured | `/rcode-resume-work` or `/rcode-next` |
| `reset` | User passed `--reset` flag | Proceed with full reconfigure |

Print one-line state summary:

```
📁 State: {state}  |  Code: {detected or none}  |  Git: {commits or none}  |  Journey: {present or new}
```

If `state === "returning"` and `--reset` not passed:

- If `rihla-present: yes` — print the standard returning message and STOP:

  ```
  ✓ rcode is already configured here.

  What next?
    /rcode-resume-work    — pick up where you left off
    /rcode-status         — see the dashboard
    /rcode-next           — suggested next action

  Or run with --reset to reconfigure.
  ```

- If `rihla-present: no` — JOURNEY.md is missing from a partial prior init. Do NOT stop. Print a recovery notice and continue to Steps 4 and 4b to write the missing baseline:

  ```
  ✓ rcode is already configured here.

  JOURNEY.md baseline is missing — completing the scan step now...
  ```

  Skip Steps 2 and 3 (config already exists). Jump directly to Step 4.

## Step 2 — Ask the questions

Use AskUserQuestion (one batched question with multiple fields if the tool supports; otherwise sequential).

**Pre-fill from existing `.rcode/config.yaml` if present, otherwise from defaults.**

Questions:

1. **Your name** (what rcode calls you in state artifacts)
   - Default: `$USER` environment variable
2. **Communication language** (how agents talk to you)
   - Options: English, Urdu, Arabic, Roman Urdu, Mixed
   - Default: English
3. **Mode** (how rcode proceeds at decision gates)
   - Options: `guided` (confirm at each gate), `yolo` (proceed autonomously)
   - Default: guided
4. **Model profile** (agent cost vs quality tradeoff)
   - Options: `quality` (opus for reasoning), `balanced` (sonnet), `budget` (haiku), `inherit` (use parent model)
   - Default: balanced
5. **Branching strategy** (how code commits land)
   - Options: `none` (current branch), `feature-branch` (one per phase), `worktree-isolation` (parallel-safe)
   - Default: none

## Step 3 — Write config + state seed

Write `.rcode/config.yaml` via `rcode-tools.cjs config-set` (not direct file write):

```bash
node .rcode/bin/rcode-tools.cjs config-set user_name "{name}"
node .rcode/bin/rcode-tools.cjs config-set project_name "$(basename $(pwd))"
node .rcode/bin/rcode-tools.cjs config-set communication_language "{lang}"
node .rcode/bin/rcode-tools.cjs config-set mode "{mode}"
node .rcode/bin/rcode-tools.cjs config-set model_profile "{profile}"
node .rcode/bin/rcode-tools.cjs config-set git.branching_strategy "{strategy}"
```

Initialize state.json if missing:

```bash
test -f .rcode/state.json || node .rcode/bin/rcode-tools.cjs state init --project "$(basename $(pwd))"
```

## Step 4 — Scan existing context (skip if `--skip-scan`)

If the project has code (from Step 1 detection), produce `.rcode/JOURNEY.md`. This is the journey baseline — a lightweight snapshot, not a full audit. Use `/rcode-map-codebase` or `/rcode-scan` later for deep analysis.

**Memory-bank refresh on `--reset`.** When `--reset` is passed AND `.planning/codebase/` already contains docs from a previous scan, also chain to `/rcode-scan --refresh --focus tech+arch` immediately after writing JOURNEY.md. The refresh path:

- Captures pre-state (commits since last doc mtime, manifest hashes, top-level dirs).
- Briefs the user on what changed since the last scan.
- Overwrites the docs and appends an entry to `.planning/codebase/CHANGELOG.md`.

Skip the chain if `--skip-scan` is set, no existing docs are present (nothing stale to refresh), or the user passes `--no-refresh`.

This makes init+reset a true memory-bank refresh — JOURNEY baseline updated, codebase docs reconciled with current code, CHANGELOG entry written.

Gather (parallel reads, all bounded):

```bash
test -f README.md && head -80 README.md
test -f package.json && head -60 package.json
test -f pyproject.toml && head -40 pyproject.toml
test -f Cargo.toml && head -30 Cargo.toml
test -f go.mod && head -20 go.mod
test -f .env.example && head -30 .env.example
git log --oneline -15 2>/dev/null
git remote -v 2>/dev/null | head -2
find . -maxdepth 3 -type d ! -path "./node_modules*" ! -path "./.git*" ! -path "./.rcode*" ! -path "./.claude*" ! -path "./.planning*" 2>/dev/null | head -20
```

Write `.rcode/JOURNEY.md` following this template (don't over-interpret — just record what's seen).

**Naming note (do NOT remove from the template):** the file is `JOURNEY.md`, not `RIHAL.md`. This is intentional — same Arabic root, different word. **rcode (رحّال)** = the traveler/tool. **Rihla (رحلة)** = the journey/voyage. The product is *rcode* (the tool you use); the per-project artifact is *Rihla* (your project's journey). The HTML comment in the template below preserves this reminder for anyone who later wonders if it's a typo.

```markdown
<!-- JOURNEY — your project's path. Renamed from RIHLA (رحلة, "the journey") in v4.1 for plain-English clarity. -->
# JOURNEY — Project journey baseline

**Written by:** /rcode-init
**Date:** {ISO date}
**Project:** {project_name}
**Detected state:** {fresh | existing-new-rcode | returning}

## At a glance

- **Primary language:** {detected from files: JS/TS/Python/Go/Rust/etc or "none yet"}
- **Framework signals:** {Next.js / Django / Express / etc, if obvious from package.json}
- **Git history:** {N commits, first: YYYY-MM-DD, last: YYYY-MM-DD} or "not a git repo"
- **Top-level dirs:** {list of ~8 most relevant}

## What's here

{80-line README excerpt, or "no README" if absent}

## Dependencies (from package manifest)

{top 15 dependencies with one-line context — NOT all of them}

## Recent work (last 10 commits)

{git log oneline, or "no commits yet"}

## Not scanned

This file is a journey baseline — intentionally shallow. For deep analysis run:
- `/rcode-map-codebase` — structured codebase documents per focus area
- `/rcode-scan` — rapid codebase assessment
- `/rcode-explore` — socratic ideation against the codebase
```

If no code detected, write a minimal JOURNEY.md with just the header and a "fresh project — no code yet" note.

## Step 4b — Populate context files

After writing JOURNEY.md, populate the two context files that every rcode skill reads at runtime. These files are the project's "memory bank" — without them, agents work blind.

**`.rcode/context/active.md`** — Current task context and working state. Write it using the JOURNEY.md scan data from Step 4:

```markdown
# Active Context

**Last updated:** {ISO date}
**Updated by:** /rcode-init

## Current State

- **Project:** {project_name}
- **Primary stack:** {detected language + framework}
- **Branch:** {git branch or "n/a"}
- **Recent focus:** {summary from last 5 commit messages, or "fresh project"}

## Active Work

{If returning with --reset: summarize what was in progress from git log}
{If existing-new-rcode: "rcode just configured — no active work tracked yet."}
{If fresh: "New project — no code yet."}

## Key Decisions

- rcode configured with mode: {mode from Step 2}
- Branching strategy: {strategy from Step 2}
- Model profile: {profile from Step 2}

## Open Questions

_None yet. Use `/rcode-explore` or `/rcode-council` to surface questions._
```

**`.rcode/context/project-brief.md`** — High-level project description. Write it using the JOURNEY.md scan data:

```markdown
# Project Brief

**Project:** {project_name}
**Created:** {ISO date}

## Overview

{If code exists: 3-5 sentence summary derived from README + package manifest — what the project does, who it's for, and the primary tech stack}
{If fresh: "Project not yet started. Run `/rcode-new-project` to design it."}

## Technical Stack

- **Language:** {detected primary language}
- **Framework:** {detected framework or "none detected"}
- **Package manager:** {npm/pnpm/pip/cargo/etc or "none detected"}

## Project Goals

_To be refined. Run `/rcode-create-prd` for full requirements discovery._
```

Ensure the directory exists before writing:

```bash
mkdir -p .rcode/context
```

**Important:** If `--reset` is passed and the files already have user-written content beyond the template stub, preserve a backup before overwriting:

```bash
if [ -s .rcode/context/active.md ] && ! grep -q "Run \`/rcode" .rcode/context/active.md; then
  cp .rcode/context/active.md .rcode/context/active.md.bak
fi
```

After writing both files, refresh the memory bank fingerprint so staleness checks see the project as fresh. `context refresh` reads `.rcode/sources.yaml`, but nothing in rcode ever creates that file (the installer only scaffolds the unrelated `.rcode/brain/sources.yaml`, used by `brain pull`) — so on every fresh project this call is a guaranteed no-op. Skip it when the file is known not to exist rather than spending a call to learn that (#1018):

```bash
test -f .rcode/sources.yaml && node .rcode/bin/rcode-tools.cjs context refresh >/dev/null 2>&1 || true
```

## Step 4c — Scaffold CLAUDE.md / AGENTS.md if missing

`generate-claude-md` (the command routing rule + project rules block every agent needs at session start) previously only ran via the `/rcode-new-project` roadmap flow — a project set up with `/rcode-init` alone (the common "add rcode to an existing codebase" path) never got it, so agents had no ambient instruction to check `do.md` before acting ad-hoc. Close that gap here, unconditionally (not just on `fresh`):

```bash
if [ ! -f CLAUDE.md ] || [ ! -f AGENTS.md ]; then
  node .rcode/bin/rcode-tools.cjs generate-claude-md
fi
```

Never pass `--force` here — an existing `CLAUDE.md` or `AGENTS.md` is the user's own file (or was already generated by a prior init/new-project run) and must not be overwritten. `cmdGenerateClaudeMd` gates each file's write on that file's own existence, so this backfills whichever one is missing (#1025). Silent no-op when both files already exist.

## Step 5 — Suggest the next step

Print a contextual recommendation, **one line of copy-paste per suggestion** (per `.rcode/references/command-redirect-format.md`):

**If `fresh`:**
```
✓ rcode configured. Your journey begins.

Ready to design a new project? Try:

/rcode-new-project {your-project-name}

Or think through an idea first:

/rcode-explore what should I build?
```

**If `existing-new-rcode`:**
```
✓ rcode configured. JOURNEY.md written as your baseline.

Recommended first move — understand before changing:

/rcode-scan

Or strategic question about the codebase:

/rcode-council {your question}
```

**In all three cases, append this tip:**
```
Tip: run /rcode-enable-hooks to turn on a one-line project status primer at
the start of every session, plus 9 other opt-in guardrails (read-before-edit
checks, dangerous-command blocking, auto-formatting). Off by default so a
fresh install never surprises you.
```

**If `returning` with `--reset`:**
```
✓ rcode reconfigured. Prior state preserved in state.json.

Pick up where you left off:

/rcode-resume-work
```

## Step 6 — Update state

```bash
node .rcode/bin/rcode-tools.cjs state record-session 2>/dev/null || true
```

Silent if state tools fail.

## Success Criteria

- [ ] `.rcode/config.yaml` written with user's answers
- [ ] `.rcode/state.json` exists (created or preserved)
- [ ] `.rcode/JOURNEY.md` written (unless `--skip-scan` or no code)
- [ ] `.rcode/context/active.md` populated with project state (not the placeholder stub)
- [ ] `.rcode/context/project-brief.md` populated with project overview (not the placeholder stub)
- [ ] `CLAUDE.md` exists (generated if it didn't already)
- [ ] State detected correctly (fresh / existing-new-rcode / returning)
- [ ] Contextual next-step suggestion printed as single-line copy-paste

## On Error

- **AskUserQuestion unavailable:** fall back to reading defaults from env / existing config and skip the interactive step.
- **config.yaml write fails:** print permission error and stop.
- **git not installed:** skip git detection, still proceed.
- **rcode-tools.cjs not found:** this command requires the installer to have run — point user to `npx @hanzlaa/rcode install`.
- **Existing JOURNEY.md without `--reset`:** do NOT overwrite; note it in Step 4 output.

## Next Up

- `/rcode-new-project` — start a brand-new project after initialization
- `/rcode-status` — check state of an existing project after re-init
