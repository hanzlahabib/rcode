---
plan: "01"
title: Wire rcode-executor into the install pipeline
priority: critical
depends_on: []
estimated_effort: medium
---

## Objective

Make `rcode-executor` a first-class installed agent — registered in `agent-manifest.csv`, symlinked into `.claude/agents/`, and accessible as a subagent_type in the execute workflow. Right now it exists as a draft in `rcode/v2/agents/` but is not wired into `install-v2.js` or the manifest.

## Context

- Draft file exists at: `rcode/v2/agents/rcode-executor.md`
- Draft execution protocol: `rcode/v2/references/execution-protocol.md`
- Draft workflows: `rcode/v2/workflows/execute.md`, `rcode/v2/commands/execute.md`
- Install pipeline: `cli/install-v2.js` — this copies files from `rcode/v2/` into the project
- Agent manifest template: look at how the 5 council agents are registered and copy that pattern exactly
- The `/rcode-execute` slash command needs to land at `.claude/commands/rcode/execute.md` in the installed project

## Tasks

### Task 1 — Audit install-v2.js to understand copy pipeline
type: auto
**Steps:**
1. Read `cli/install-v2.js` fully
2. Read `cli/lib/` directory — understand any helpers used
3. Identify exactly how council agents get copied from `rcode/v2/agents/` → `.claude/agents/`
4. Identify how `agent-manifest.csv` gets written/appended
5. Identify how slash commands get installed into `.claude/commands/rcode/`
6. Write findings as inline comments (do NOT modify the file yet — read only)
**Done when:** you can describe the copy pipeline in one paragraph from memory
**Commit:** none (read-only task)

### Task 2 — Add rcode-executor to agent-manifest template
type: auto
**Steps:**
1. Find where the agent-manifest.csv template/seed lives in the repo (check `cli/`, `rcode/v2/`, `.rcode-template/`)
2. Add executor row in the same CSV format as the existing 5 agents:
   `executor,.claude/agents/rcode-executor.md,rcode-executor,"Plan executor — spawned by /rcode-execute to run a single PLAN.md file. Executes tasks atomically, commits after each completed task, handles deviations via 4 rules, pauses at checkpoints, and writes a SUMMARY file. Never runs git push.",yellow`
3. Verify the row order — executor should come before the advisory agents alphabetically or at top, whichever pattern the file uses
**Done when:** agent-manifest template/seed contains the executor row
**Commit:** `chore(agents): register rcode-executor in agent-manifest template`

### Task 3 — Wire executor into install-v2.js copy step
type: auto
**Steps:**
1. In `cli/install-v2.js`, find the step that copies agent files from `rcode/v2/agents/` → `.claude/agents/`
2. Confirm `rcode-executor.md` is included in that copy (it may already be if the step copies the whole directory — verify)
3. If the step is a whitelist, add `rcode-executor.md` to it
4. Find the step that copies workflows — confirm `execute.md` is copied to both:
   - `.rcode/workflows/execute.md`
   - `.claude/commands/rcode/execute.md`
5. Find the step that copies references — confirm `execution-protocol.md` is copied to `.rcode/references/`
6. Add any missing copy steps — follow the exact pattern used for council workflow
**Done when:** a fresh `install-v2` run would install executor agent + execute workflow + execution-protocol reference
**Commit:** `feat(install): wire rcode-executor and execute workflow into install-v2`

### Task 4 — Extend rcode-tools.cjs with execute subcommands
type: auto
**Steps:**
1. Read `rcode/v2/bin/rcode-tools.cjs` (the v2 source, not the installed copy)
2. Add subcommand: `init execute "<args>"` — returns JSON:
   ```json
   {
     "workflow": "execute",
     "plan_path": "<resolved absolute path to PLAN.md>",
     "phase": "<phase name from plan frontmatter or 'unknown'>",
     "flags": { "interactive": false, "wave": null },
     "config": { "user_name", "project_name", "language", "mode" },
     "paths": { "project_root", "rcode", "planning_root" },
     "state_exists": false
   }
   ```
   Argument parsing: if arg ends in `.md` treat as direct plan path; if arg looks like a phase name/number, scan `.planning/` for PLAN.md files in that phase dir.
3. Add subcommand: `state advance-plan` — reads `.rcode/state.json`, increments `current_plan` counter, writes back. If `state.json` doesn't exist, creates it with defaults.
4. Add subcommand: `state record-execution --plan <name> --tasks <n> --duration <ms>` — appends to `executions[]` array in `state.json`.
5. All new subcommands follow same JSON-out pattern as existing ones. No external deps.
**Done when:** `node .rcode/bin/rcode-tools.cjs init execute path/to/PLAN.md` returns valid JSON
**Commit:** `feat(cli): add init execute and state commands to rcode-tools`

### Task 5 — Register /rcode-execute slash command in skills list
type: auto
**Steps:**
1. Check where the `/rcode-council` skill entry is defined (likely in a skills manifest or the package itself — search for "rcode-council" string in the repo)
2. Add `/rcode-execute` entry with the same format
3. Description: "Execute one or more PLAN.md files. Spawns rcode-executor subagents per plan, handles checkpoints, collects results."
4. argument-hint: `"<phase-name|path/to/PLAN.md> [--interactive] [--wave N]"`
**Done when:** skill entry exists for rcode-execute matching council's format
**Commit:** `feat(skills): register /rcode-execute slash command`

### Task 6 — Smoke test: install into temp dir and verify
type: checkpoint:human-verify
**What executor does:** Runs `node cli/install-v2.js` in a temp directory, then lists installed files.
**Verify:**
- `.claude/agents/rcode-executor.md` exists in the temp install
- `.claude/commands/rcode/execute.md` exists
- `.rcode/workflows/execute.md` exists
- `.rcode/references/execution-protocol.md` exists
- `.rcode/_config/agent-manifest.csv` contains the `executor` row
- `node .rcode/bin/rcode-tools.cjs list-agents` includes `executor` in output

## Success criteria
- [ ] `rcode-executor` appears in `agent-manifest.csv` on fresh install
- [ ] `/rcode-execute` slash command is installed into `.claude/commands/rcode/`
- [ ] `execution-protocol.md` is installed into `.rcode/references/`
- [ ] `rcode-tools.cjs init execute` returns valid JSON without error
- [ ] `rcode-tools.cjs state advance-plan` creates/updates `state.json`
- [ ] No existing council functionality broken (spot-check `/rcode-council` init still works)
