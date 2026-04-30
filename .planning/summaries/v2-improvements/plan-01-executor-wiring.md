---
plan: "01"
title: Wire rihal-executor into the install pipeline
priority: critical
depends_on: []
estimated_effort: medium
---

## Objective

Make `rihal-executor` a first-class installed agent — registered in `agent-manifest.csv`, symlinked into `.claude/agents/`, and accessible as a subagent_type in the execute workflow. Right now it exists as a draft in `rihal/v2/agents/` but is not wired into `install-v2.js` or the manifest.

## Context

- Draft file exists at: `rihal/v2/agents/rihal-executor.md`
- Draft execution protocol: `rihal/v2/references/execution-protocol.md`
- Draft workflows: `rihal/v2/workflows/execute.md`, `rihal/v2/commands/execute.md`
- Install pipeline: `cli/install-v2.js` — this copies files from `rihal/v2/` into the project
- Agent manifest template: look at how the 5 council agents are registered and copy that pattern exactly
- The `/rihal-execute` slash command needs to land at `.claude/commands/rihal/execute.md` in the installed project

## Tasks

### Task 1 — Audit install-v2.js to understand copy pipeline
type: auto
**Steps:**
1. Read `cli/install-v2.js` fully
2. Read `cli/lib/` directory — understand any helpers used
3. Identify exactly how council agents get copied from `rihal/v2/agents/` → `.claude/agents/`
4. Identify how `agent-manifest.csv` gets written/appended
5. Identify how slash commands get installed into `.claude/commands/rihal/`
6. Write findings as inline comments (do NOT modify the file yet — read only)
**Done when:** you can describe the copy pipeline in one paragraph from memory
**Commit:** none (read-only task)

### Task 2 — Add rihal-executor to agent-manifest template
type: auto
**Steps:**
1. Find where the agent-manifest.csv template/seed lives in the repo (check `cli/`, `rihal/v2/`, `.rihal-template/`)
2. Add executor row in the same CSV format as the existing 5 agents:
   `executor,.claude/agents/rihal-executor.md,rihal-executor,"Plan executor — spawned by /rihal-execute to run a single PLAN.md file. Executes tasks atomically, commits after each completed task, handles deviations via 4 rules, pauses at checkpoints, and writes a SUMMARY file. Never runs git push.",yellow`
3. Verify the row order — executor should come before the advisory agents alphabetically or at top, whichever pattern the file uses
**Done when:** agent-manifest template/seed contains the executor row
**Commit:** `chore(agents): register rihal-executor in agent-manifest template`

### Task 3 — Wire executor into install-v2.js copy step
type: auto
**Steps:**
1. In `cli/install-v2.js`, find the step that copies agent files from `rihal/v2/agents/` → `.claude/agents/`
2. Confirm `rihal-executor.md` is included in that copy (it may already be if the step copies the whole directory — verify)
3. If the step is a whitelist, add `rihal-executor.md` to it
4. Find the step that copies workflows — confirm `execute.md` is copied to both:
   - `.rihal/workflows/execute.md`
   - `.claude/commands/rihal/execute.md`
5. Find the step that copies references — confirm `execution-protocol.md` is copied to `.rihal/references/`
6. Add any missing copy steps — follow the exact pattern used for council workflow
**Done when:** a fresh `install-v2` run would install executor agent + execute workflow + execution-protocol reference
**Commit:** `feat(install): wire rihal-executor and execute workflow into install-v2`

### Task 4 — Extend rihal-tools.cjs with execute subcommands
type: auto
**Steps:**
1. Read `rihal/v2/bin/rihal-tools.cjs` (the v2 source, not the installed copy)
2. Add subcommand: `init execute "<args>"` — returns JSON:
   ```json
   {
     "workflow": "execute",
     "plan_path": "<resolved absolute path to PLAN.md>",
     "phase": "<phase name from plan frontmatter or 'unknown'>",
     "flags": { "interactive": false, "wave": null },
     "config": { "user_name", "project_name", "language", "mode" },
     "paths": { "project_root", "rihal", "planning_root" },
     "state_exists": false
   }
   ```
   Argument parsing: if arg ends in `.md` treat as direct plan path; if arg looks like a phase name/number, scan `.planning/` for PLAN.md files in that phase dir.
3. Add subcommand: `state advance-plan` — reads `.rihal/state.json`, increments `current_plan` counter, writes back. If `state.json` doesn't exist, creates it with defaults.
4. Add subcommand: `state record-execution --plan <name> --tasks <n> --duration <ms>` — appends to `executions[]` array in `state.json`.
5. All new subcommands follow same JSON-out pattern as existing ones. No external deps.
**Done when:** `node .rihal/bin/rihal-tools.cjs init execute path/to/PLAN.md` returns valid JSON
**Commit:** `feat(cli): add init execute and state commands to rihal-tools`

### Task 5 — Register /rihal-execute slash command in skills list
type: auto
**Steps:**
1. Check where the `/rihal-council` skill entry is defined (likely in a skills manifest or the package itself — search for "rihal-council" string in the repo)
2. Add `/rihal-execute` entry with the same format
3. Description: "Execute one or more PLAN.md files. Spawns rihal-executor subagents per plan, handles checkpoints, collects results."
4. argument-hint: `"<phase-name|path/to/PLAN.md> [--interactive] [--wave N]"`
**Done when:** skill entry exists for rihal-execute matching council's format
**Commit:** `feat(skills): register /rihal-execute slash command`

### Task 6 — Smoke test: install into temp dir and verify
type: checkpoint:human-verify
**What executor does:** Runs `node cli/install-v2.js` in a temp directory, then lists installed files.
**Verify:**
- `.claude/agents/rihal-executor.md` exists in the temp install
- `.claude/commands/rihal/execute.md` exists
- `.rihal/workflows/execute.md` exists
- `.rihal/references/execution-protocol.md` exists
- `.rihal/_config/agent-manifest.csv` contains the `executor` row
- `node .rihal/bin/rihal-tools.cjs list-agents` includes `executor` in output

## Success criteria
- [ ] `rihal-executor` appears in `agent-manifest.csv` on fresh install
- [ ] `/rihal-execute` slash command is installed into `.claude/commands/rihal/`
- [ ] `execution-protocol.md` is installed into `.rihal/references/`
- [ ] `rihal-tools.cjs init execute` returns valid JSON without error
- [ ] `rihal-tools.cjs state advance-plan` creates/updates `state.json`
- [ ] No existing council functionality broken (spot-check `/rihal-council` init still works)
