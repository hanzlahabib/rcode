# Workflow: rihal:execute

<purpose>
Orchestrate one or more PLAN.md files by spawning rihal-executor subagents. Supports single-plan mode, phase mode (multiple plans in dependency waves), and interactive mode (sequential, no subagents).
</purpose>

## Note on reference loading

References (execution-protocol.md, commit-conventions.md) are loaded ONLY when Step 0 determines valid arguments are present. Usage check happens first to print help quickly without reading files.

<available_agent_types>
- `rihal-executor` — plan executor subagent (one instance per plan file)
</available_agent_types>

## Step 0 — Initialize

```bash
INIT=$(node .rihal/bin/rihal-tools.cjs init execute "$ARGUMENTS")
```

Parse:
- `target` — the argument (plan path or phase name)
- `flags.wave` — run only this wave number
- `flags.interactive` — sequential mode, no subagents
- `flags.continue` — resuming after a checkpoint
- `flags.option` — user's choice for a decision checkpoint (A or B)
- `plans[]` — array of `{ path, depends_on, wave }` entries
- `plan_path` — set if single-plan mode
- `phase_dir` — set if phase mode

**If no target:** print usage and stop:
```
Usage: /rihal:execute <plan-file.md | phase-dir> [--wave N] [--interactive] [--continue]
```

## Step 1 — Read the plan(s)

For each plan in `plans`, read the file. Print a summary:

```
📋 Execution plan
   Phase: {phase name or "single"}
   Plans: {count}
   Waves: {wave count}
   Total tasks: {sum of auto tasks}
   Checkpoints: {count}
```

If `flags.wave` is set, filter `plans` to only that wave.

## Step 2 — Execute waves

Group `plans` by wave number. Execute wave by wave — all plans in a wave run in parallel, next wave waits for current wave to complete.

### If `flags.interactive` — sequential mode

Run one plan at a time in the current context (no subagents). Read the plan, execute each task inline following the execution-protocol.md rules.

### Otherwise — parallel subagent mode

For each plan in the current wave, spawn one `rihal-executor` subagent:

```
Task tool call:
  subagent_type: "rihal-executor"
  description: "Execute {plan file name}"
  prompt: |
    Execute this plan file to completion. Follow execution-protocol.md rules exactly.

    ## Plan file path
    {plan.path}

    ## Plan contents
    {full contents of the PLAN.md file}

    ## Project context
    - Project: {config.project_name}
    - Root: {paths.project_root}
    - Config: {paths.rihal}/config.yaml
    - State: {paths.state}

    ## Execution protocol reference
    {contents of execution-protocol.md}
```

Spawn all plans in the wave in the same response (parallel). Wait for all to finish before starting the next wave.

## Step 3 — Handle checkpoints

If any executor returns a `---CHECKPOINT REACHED---` block:

1. Print it verbatim to the user
2. **STOP the entire execution** — do not continue other waves or other plans
3. Print:
```
⏸ Execution paused at checkpoint.
Resume: /rihal:execute {original arguments} --continue
```

If `flags.continue` is set, skip already-completed tasks (check SUMMARY file for completed task list) and resume from the checkpoint task.

## Step 4 — Collect results

After all waves complete, print each executor's `---PLAN COMPLETE---` block verbatim, then a single orchestrator summary:

```
✅ Execution complete
   Plans: {completed}/{total}
   Tasks: {sum completed}
   Commits: {total commits}
   Duration: {start} → {end}
```

### Step 4b — Update state (silent)

After each plan completes (each `---PLAN COMPLETE---` block), update `.rihal/state.json`. These commands run silently — do not print output to the user for this step.

```bash
node .rihal/bin/rihal-tools.cjs state advance-plan
node .rihal/bin/rihal-tools.cjs state record-execution \
  --plan "{plan name}" --tasks "{number of tasks completed}" --duration "{duration in ms}" --hash "{commit hash}"
node .rihal/bin/rihal-tools.cjs state record-session
```

> **Note:** If `rihal-tools.cjs` state commands fail (e.g. state.json missing or not yet initialized), continue without error — state tracking is optional, execution output is mandatory.

## Errors

- **Plan file not found:** print the path, stop.
- **Circular dependency in phase:** print the cycle, ask user to fix `depends_on` frontmatter.
- **Executor returns neither COMPLETE nor CHECKPOINT:** treat as a deviation, print the raw output, stop.
- **`rihal-tools.cjs` missing:** tell user to run `rihal-code install-v2`.
