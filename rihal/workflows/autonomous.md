# Workflow: rihal:autonomous

<purpose>
Execute remaining incomplete phases autonomously with minimal human intervention. Runs plan → execute → verify cycles in a loop, pausing at checkpoints, failures, or decision gates. With `--interactive`, keeps discuss/plan steps inline in current context instead of delegating to subagents.
</purpose>

<required_reading>
@.rihal/references/workstream-flag.md
@.rihal/references/output-realism.md
</required_reading>

## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rihal:autonomous <argument-here>
```

**Examples:**
```
/rihal:autonomous example 1
/rihal:autonomous example 2
```

STOP — do not proceed.

<available_tools>
- Bash — read state, list plans, git ops
- Read — read state.json, SPRINT.md files
- Agent — spawn rihal-planner, rihal-executor, rihal-sprint-checker
- AskUserQuestion — handle checkpoints and failures
</available_tools>

## Flag Processing

Parse command arguments:

```
--from N     → start from phase N (1-based index)
--to M       → stop after phase M (1-based index)
--only N     → execute only phase N
--interactive → keep plan/discuss steps in current context
```

If no flags, process all incomplete phases from current_phase onward.

## Step 0 — Initialize

Load state:

```bash
node .rihal/bin/rihal-tools.cjs state read
```

Extract:
- `phases` array (list of all phases)
- `current_phase` (active phase name or null)
- `executions` array (track completed work)

Determine phase range:
- If `--only N`: phases = [phases[N-1]]
- If `--from` and `--to`: phases = phases[from-1:to]
- If `--from` only: phases = phases[from-1:]
- If `--to` only: phases = phases[0:to]
- Otherwise: phases = all phases from current_phase onward

Filter to incomplete phases (no SUMMARY.md):

```bash
# Check each phase directory for SUMMARY.md
for phase_dir in .planning/phases/*/; do
  [ ! -f "$phase_dir/SUMMARY.md" ] && echo "incomplete"
done
```

Store filtered phases list as `todo_phases`.

## Step 1 — Phase Loop

For each phase in `todo_phases`:

### 1.1 — Check for SPRINT.md

```bash
PLAN_FILE=".planning/phases/$phase_slug/SPRINT.md"
[ -f "$PLAN_FILE" ] || PLAN_FILE=""
```

If no SPRINT.md found:

**Option A (default `--interactive=false`):**

Spawn rihal-planner subagent:

```
Agent spawn:
  type: rihal-planner
  brief: "Generate a SPRINT.md for this phase"
  prompt: |
    Phase: {phase_name}
    
    Create a SPRINT.md that breaks down this phase into executable steps.
    Save to: .planning/phases/{phase_slug}/SPRINT.md
    
    Follow the SPRINT.md schema in references/execution-protocol.md
```

Wait for planner to complete. Read generated SPRINT.md.

**Option B (`--interactive=true`):**

Spawn a rihal-planner in the current context (inline discussion, not delegated). Keep the planner's questions and drafts visible to the user for real-time feedback.

### 1.2 — Execute Plan

After SPRINT.md exists, spawn rihal-executor:

```
Agent spawn:
  type: rihal-executor
  brief: "Execute the SPRINT.md for this phase"
  prompt: |
    Execute SPRINT.md at: .planning/phases/{phase_slug}/SPRINT.md
    
    Follow all checkpoints. If a checkpoint blocks execution, return to
    the orchestrator with a clear summary of what to decide.
    
    Save task outputs to .planning/phases/{phase_slug}/tasks/
```

### 1.3 — Handle Executor Response

After executor completes:

**If CHECKPOINT found:**

Print checkpoint summary with a human decision prompt:

```
⏸  CHECKPOINT: {checkpoint_title}

{checkpoint description}

What would you like to do?
  1. Continue (proceed with next step)
  2. Modify (adjust the plan)
  3. Rollback (undo this task and retry)
  4. Pause (save progress and stop)
```

Ask user via AskUserQuestion. Branch:
- **Continue:** Loop back to Step 1.2 (re-spawn executor with `--continue` flag)
- **Modify:** Re-spawn rihal-planner to patch the SPRINT.md
- **Rollback:** Run `git reset --hard HEAD~N` or undo via planner, then loop back to executor
- **Pause:** Write HANDOFF.json and stop

**If FAILURE found:**

Print failure summary:

```
❌ TASK FAILED: {task_name}

Error:
{error details from executor}

What would you like to do?
  1. Retry (run the task again)
  2. Skip (mark as failed, continue)
  3. Investigate (pause and debug)
  4. Rollback (undo and modify plan)
```

Ask user. Branch:
- **Retry:** Loop back to executor with same task
- **Skip:** Record failure in execution log, continue to next phase
- **Investigate:** Call `/rihal:debug <task>` inline or pause work
- **Rollback:** Reset and return to planning

**If SUCCESS (no failures/checkpoints):**

Print success summary:

```
✓ Phase completed: {phase_name}

Tasks executed: {count}
Duration: {time}
Artifact: {path to outputs}
```

Record execution in state:

```bash
node .rihal/bin/rihal-tools.cjs state record-execution \
  --plan "{phase_slug}" \
  --tasks {count} \
  --duration {milliseconds} \
  --hash "$(git rev-parse HEAD)"
```

Write SUMMARY.md to phase directory:

```
# Summary: {phase_name}

Completed: {timestamp}
Duration: {time}

## Outcomes
{list of delivered artifacts}

## Decisions
{key decisions made during execution}

## Follow-ups
{any remaining work or tech debt}
```

Set current_phase to next incomplete phase:

```bash
# Find next incomplete phase from todo_phases
NEXT_PHASE=$(next_incomplete_phase_from_list)
[ -n "$NEXT_PHASE" ] && node .rihal/bin/rihal-tools.cjs state set-phase "$NEXT_PHASE"
```

### 1.4 — Loop to Next Phase

Re-read state.json. Update `todo_phases` (ROADMAP may have changed).

Continue to next phase in filtered list.

## Step 2 — Completion

When all phases in `todo_phases` are completed:

Print autonomous summary:

```
✓ Autonomous execution complete!

Phases completed: {count}
Duration: {total time}
Artifacts: .planning/phases/*/SUMMARY.md

Command to resume from where you left off:
/rihal:resume-work

Command to review decisions:
/rihal:council review recent decisions
```

Update state:

```bash
node .rihal/bin/rihal-tools.cjs state record-session
```

## Error Handling

If autonomous execution encounters an error it cannot recover from:

1. Write HANDOFF.json with current progress
2. Print error context and recovery command
3. Exit with non-zero status

Example:

```
❌ Autonomous execution stopped at Phase 3.2

Reason: {error}
Progress saved: .rihal/HANDOFF.json

To resume manually:
/rihal:resume-work

To debug the error:
/rihal:debug phase-3-2
```

## Interactive Mode (`--interactive`)

When `--interactive` is passed:

- Planning and discussion steps run in the current context (inline), not delegated to subagents
- User can provide real-time feedback, ask questions, modify plans before execution
- Executor still runs as a subagent but with closer human oversight
- Useful for learning, high-stakes work, or when you want to stay in the loop

Example usage:

```bash
/rihal:autonomous --interactive --from 1 --to 3
```

This keeps the first 3 phases' planning discussions inline with the user, then executes autonomously.

## Success Criteria

- [ ] Task completed as requested
- [ ] Output saved or reported
- [ ] State updated if necessary
- [ ] No errors encountered

## On Error

If arguments are invalid, missing files, or subagent fails:
- Validate inputs match expected format
- Check that required files exist
- Retry with clearer arguments or report the specific error to the user

