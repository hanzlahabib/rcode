# Workflow: rihal:execute

<purpose>
Orchestrate one or more PLAN.md files by spawning rihal-executor subagents. Supports single-plan mode, phase mode (multiple plans in dependency waves), and interactive mode (sequential, no subagents).
</purpose>


## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rihal:execute <argument-here>
```

**Examples:**
```
/rihal:execute example 1
/rihal:execute example 2
```

STOP — do not proceed.

## Note on reference loading

References (execution-protocol.md, commit-conventions.md) are loaded ONLY when Step 0 determines valid arguments are present. Usage check happens first to print help quickly without reading files.

<available_agent_types>
- `rihal-executor` — plan executor subagent (one instance per plan file)
</available_agent_types>

## Step 0 — Concurrency Lock

```bash
LOCK=.rihal/execute.lock
if [ -f "$LOCK" ]; then
  LOCK_PID=$(cat "$LOCK" 2>/dev/null)
  if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
    echo "⚠ Another /rihal:execute is running (PID $LOCK_PID). Wait for it to finish, or remove $LOCK if stale."
    exit 1
  fi
  echo "Removing stale lock"
  rm -f "$LOCK"
fi
echo $$ > "$LOCK"
trap "rm -f $LOCK" EXIT
```

## Step 0.2 — Initialize and resolve IDs

```bash
INIT=$(node .rihal/bin/rihal-tools.cjs init execute "$ARGUMENTS")

# If argument is a short ID pattern (NN or NN.MM), resolve to actual path
if [[ "$ARGUMENTS" =~ ^[0-9]{2}(\.[0-9]+)?$ ]]; then
  RESOLVED=$(node .rihal/bin/rihal-tools.cjs state resolve-id "$ARGUMENTS")
  TARGET=$(echo "$RESOLVED" | jq -r '.path')
else
  TARGET="$ARGUMENTS"
fi
```

Parse:
- `target` — the argument (plan path, phase name, or hierarchical ID like NN or NN.MM)
- `flags.wave` — run only this wave number
- `flags.interactive` — sequential mode, no subagents
- `flags.continue` — resuming after a checkpoint
- `flags.option` — user's choice for a decision checkpoint (A or B)
- `flags['skip-gates']` — skip post-execution verification gates
- `plans[]` — array of `{ path, depends_on, wave }` entries
- `plan_path` — set if single-plan mode
- `phase_dir` — set if phase mode

**Supported argument formats:**
- `.planning/phases/01-setup/PLAN.md` — direct path (backward compatible)
- `01` — execute all plans in phase 01 (wave-grouped)
- `01.02` — execute specific plan 01.02

**If no target:** print usage and stop:
```
Usage: /rihal:execute <plan-file.md | phase-id | plan-id> [--wave N] [--interactive] [--continue] [--skip-gates]

Examples:
  /rihal:execute .planning/phases/01-setup/PLAN.md
  /rihal:execute 01                  # all plans in phase 01
  /rihal:execute 01.02               # plan 01.02
```

## Step 0.3 — Detect non-plan arguments (redirect to plan)

If `$ARGUMENTS` doesn't end in `.md`, doesn't reference an existing directory, and looks like a question (contains "?", "should", "how", "what", or is a freeform topic):

```
⚠ /rihal:execute runs existing PLAN.md files — it doesn't create them.

To turn an idea or question into a plan first, use:

/rihal:plan $ARGUMENTS

Then run /rihal:execute on the resulting plan file.
```

Only proceed past this step if the argument points to an actual PLAN.md file or phase directory.

## Step 0.4 — Pre-flight Reference Verification (NEW)

**Before any state change** (no stash, no branch switch, no commit):

Verify that all files and symbols referenced in the plan(s) exist in the current branch. This prevents discovery of hallucinated references after expensive operations start.

**For each plan in `plans`:**

```bash
PLAN_PATH="{plan.path}"
VERIFY_RESULT=$(node .rihal/bin/rihal-tools.cjs verify-references "$PLAN_PATH")
```

The `rihal-tools.cjs verify-references` command internally calls code-references.cjs utility to:
1. Extract all file and symbol references from the plan
2. Verify each exists in the current project root
3. Return JSON result with summary (verified count, missing count, ratio)

**Check result:**

**If `summary.missing.files.length > 0` OR `summary.missing.symbols.length > 5`:**

⚠ STOP immediately. Print:
```
⚠ PRE-FLIGHT CHECK FAILED

Plan references files or symbols that don't exist in the current branch:

Missing files ({count}):
  - {list}

Missing symbols ({count}):
  - {list}

This usually means:
  - Plan was built on stale findings (from debug/research on different branch)
  - Or you need to switch to a different branch first

Suggested next steps:
  1. /rihal:plan {original input} --revise   ← re-plan with current code
  2. /rihal:execute {plan} --force-stale     ← proceed anyway (NOT recommended)

Default: stop here.
```

**Decision point:** If `--force-stale` flag was set on this `/rihal:execute` invocation, proceed to Step 1 anyway (skip this gate). Otherwise, stop.

**If verified:** All references exist, proceed to Step 1.

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
PLAN_ID=$(grep "^id:" "$PLAN_PATH" | head -1 | cut -d'"' -f2)
node .rihal/bin/rihal-tools.cjs state advance-plan
node .rihal/bin/rihal-tools.cjs state record-execution \
  --plan "$PLAN_ID" --tasks "{number of tasks completed}" --duration "{duration in ms}" --hash "{commit hash}"
node .rihal/bin/rihal-tools.cjs state record-session
```

> **Note:** If `rihal-tools.cjs` state commands fail (e.g. state.json missing or not yet initialized), continue without error — state tracking is optional, execution output is mandatory.

## Step 5 — Post-execution verification gates

**If `flags['skip-gates'] === true`:** Skip this step and go to Success Criteria.

**Otherwise, spawn verification gates in PARALLEL:**

Spawn both `rihal-integration-checker` and `rihal-nyquist-auditor` subagents simultaneously:

### Gate 1: Integration Checker

```
Agent tool call:
  subagent_type: "rihal-integration-checker"
  description: "Verify integration and system connectivity"
  prompt: |
    Check the completed plan for integration issues.
    
    Plan path: {completed plan path}
    Summary path: {SUMMARY.md path}
    Project root: {paths.project_root}
    
    Verify:
    - All external service connections working
    - API integrations functional
    - Database migrations successful
    - Environment variables correctly set
    - Third-party dependencies integrated
    
    Return a structured report with PASS/FAIL status and any remediation steps needed.
```

### Gate 2: Nyquist Auditor

```
Agent tool call:
  subagent_type: "rihal-nyquist-auditor"
  description: "Audit coverage and completeness"
  prompt: |
    Audit the completed plan for coverage gaps.
    
    Plan path: {completed plan path}
    Summary path: {SUMMARY.md path}
    Project root: {paths.project_root}
    
    Verify:
    - Test coverage meets standards
    - Documentation complete
    - Edge cases handled
    - Error handling comprehensive
    - Performance requirements met
    
    Return a structured audit report with PASS/FAIL status and remediation steps.
```

### Step 5.5 — Process gate results

Wait for both gates to complete (parallel execution).

**For each gate result:**
1. Append the result to SUMMARY.md as:
   - `## Integration Check` (from rihal-integration-checker)
   - `## Coverage Audit` (from rihal-nyquist-auditor)

**If either gate returns FAIL:**
- Print remediation suggestions under each section
- Print:
  ```
  ⚠ Execution gates flagged issues. Review above sections for remediation.
  ```

**If both gates return PASS:**
- Print:
  ```
  ✅ All verification gates passed.
  ```

## Success Criteria

- [ ] All plans in the target phase/file read successfully
- [ ] All subagents (or inline tasks in interactive mode) executed without stopping
- [ ] Each `---PLAN COMPLETE---` block returned and printed verbatim
- [ ] State updated with execution record and session timestamp

## On Error

- **No target specified:** print usage block, stop.
- **Non-plan arguments:** redirect to `/rihal:plan` (Step 0.5).
- **Plan file not found:** print the path, stop.
- **Circular dependency in phase:** print the cycle, ask user to fix `depends_on` frontmatter.
- **state.json missing or corrupted:** continue without error — execution output is mandatory, state tracking is optional.
- **Executor returns neither COMPLETE nor CHECKPOINT:** treat as deviation, print raw output, stop.
- **Executor returns empty response:** print "Executor produced no output. Check plan validity and retry."
- **`rihal-tools.cjs` missing:** tell user to run `rihal-code install-v2`.
