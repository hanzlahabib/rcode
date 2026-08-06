<purpose>
Execute all plans in a phase using wave-based parallel execution. Orchestrator stays lean — delegates plan execution to subagents.
</purpose>

## Orchestrator Constraint — No Inline Implementation

**The execute orchestrator MUST NOT implement code directly.** Its only role is to dispatch, monitor, and checkpoint. All implementation is delegated to `rcode-executor` subagents.

If you are reading this as the main conversation loop and are tempted to write code, create files, or make commits directly instead of spawning a subagent:

> **STOP.** Spawn `rcode-executor` as a subagent with the sprint plan as context. The main loop's job is to call the agent, present checkpoints, and update state — not to implement.

Bypassing this constraint produces a built project with no execution trace, no SUMMARY.md, and a dashboard frozen at `planned`. See issue #915.

<pre_flight>
**Mandatory before execution begins.** Run these checks first and surface
findings BEFORE any subagents are spawned. If any check fails, stop and
route back to the user.

0. **Project-status preflight:**
   ```bash
   PROJECT_STATUS=$(node .rcode/bin/rcode-tools.cjs project-status 2>/dev/null || echo uninitialized)
   ```
   If `PROJECT_STATUS` is `uninstalled`, `uninitialized`, or `stub`:
   ```
   Project not initialized. Run /rcode-init first (or /rcode-new-project for a greenfield project), then return here.
   ```
   Stop. Do not proceed until `project-status` returns `real`.

1. **Init state**: `node .rcode/bin/rcode-tools.cjs init execute {N}`
2. **Phase index**: list all plans via `phase-plan-index {N}` — extract
   plan count, wave count, autonomy flag per plan, files_modified overlaps
3. **Anti-patterns**: check for `.continue-here.md` (paused state), STATE.md
   error flag, existing VERIFICATION.md with FAIL items without overrides
4. **Branch check**: confirm current git branch is appropriate
   for the work. Two checks, both blocking:

   a. **Not on main/master without consent**: if `git branch --show-current`
      returns `main` or `master`, refuse to execute. Suggest:
      `git switch -c <phase>-<plan>-<slug>` (e.g. `git switch -c 8-1-aria`).
      User can override only by passing `--allow-main` to /rcode-execute and
      explicitly typing the override on this turn.

   b. **Working tree clean enough**: if `git status --porcelain` shows
      modified files unrelated to this phase's `files_modified` frontmatter,
      surface them and ask whether to commit, stash, or proceed. Real-session
      repro: P0 CSS fixes landed loose in a dirty tree with no commit
      boundary.

   The branch name should align with the phase/plan IDs from state — check
   `workflow.branch_pattern` config (default `<phase>-<plan>-<slug>`).
5. **Worktree config**: read `workflow.use_worktrees` — if true + parallelization
   is true + no file overlaps, plans in a wave run parallel via worktrees
</pre_flight>

<insight_block>
After pre-flight, emit an insight block with the 2-3 most load-bearing
observations from phase inspection. Format exactly:

```
★ Insight ─────────────────────────────────────
  - {observation 1: key scope reality}
  - {observation 2: forced-sequential / overlap / checkpoint flags}
  - {observation 3: autonomous-false plans needing human presence}
─────────────────────────────────────────────────
```

Keep to 3 bullets. Name specific files and plan IDs. No generic advice.
</insight_block>

<execution_plan>
After insight block, render a table of waves × plans:

```
Execution Plan

Phase {NN}: {phase_name} — {N} plans across {M} waves{, building {one-line outcome}}.

┌──────┬───────┬───────────────┬──────────────────────────────────────────────┐
│ Wave │ Plan  │   Autonomy    │                 What it builds                │
├──────┼───────┼───────────────┼──────────────────────────────────────────────┤
│ 1    │ NN-01 │ 🛑 checkpoint │ {one-line what it builds}                    │
│ 1    │ NN-02 │ auto          │ {one-line what it builds}                    │
│ 2    │ NN-03 │ auto          │ {one-line what it builds}                    │
└──────┴───────┴───────────────┴──────────────────────────────────────────────┘
```

Below the table, flag any wave forced to sequential (file overlaps) and
why. One sentence reality check about scope size (file count, token cost,
wall-clock expectation).
</execution_plan>

<three_options>
Check config mode first:
```bash
CONFIG_MODE=$(node .rcode/bin/rcode-tools.cjs config-get mode 2>/dev/null || echo "guided")
```

**If `CONFIG_MODE == "yolo"` or `$ARGUMENTS` contains `--auto`:** Skip the menu. Auto-select **A) Autonomous run** and print one line: `▶ Auto-selecting Autonomous run (yolo mode). /rcode-settings set mode guided to change.`

Otherwise, offer three modes via AskUserQuestion. Each option names the tradeoff explicitly:

**A) Autonomous run** — Spawn subagent per plan in sequence/parallel per
    wave rules. Checkpoints still pause for user. Fastest wall-clock.
    Highest token cost. Least visibility mid-plan.

**B) Interactive mode** (`--interactive`) — Execute plans inline in the
    current context (no subagents). Pair-programming style. Lower token
    cost. Catch mistakes early. Best for design-heavy or novel work.

**C) Wave-only** (`--wave N`) — Run just one wave now, review, then run
    later waves in a separate session. Good for staged rollout / review
    gates.

Include a recommendation line: "My recommendation: {letter} because {reason
in one clause}." Then ask which option to proceed with — do NOT silently
pick one.
</three_options>

<output_format>
Open with banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► EXECUTING PHASE {NN}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use TaskCreate at start, one entry per wave:
- TaskCreate: "Wave 1: {N} plan(s) in parallel"
- TaskCreate: "Wave 2: {N} plan(s) in parallel"
- TaskCreate: "Write phase SUMMARY.md"
- TaskCreate: "Run verifier gate"

Per-wave banner as each begins:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► EXECUTING WAVE {N}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning {N} rcode-executor agents in parallel...
```

Per-agent completion:
```
✓ rcode-executor complete: {plan-id} → SUMMARY.md ({N} commits)
```

Closure:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► PHASE {NN} COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
End with Next Up block routing to /rcode-verify-work or /rcode-next.
</output_format>

<core_principle>
Orchestrator coordinates, not executes. Each subagent loads the full execute-sprint context. Orchestrator: discover plans → analyze deps → group waves → spawn agents → handle checkpoints → collect results.
</core_principle>

<runtime_compatibility>
**Subagent spawning is runtime-specific:**
- **Claude Code:** Uses `Task(subagent_type="rcode-executor",
  model="{executor_model}", ...)` — blocks until complete, returns result
- **Copilot:** Subagent spawning does not reliably return completion signals. **Default to
  sequential inline execution**: read and follow execute-sprint.md directly for each plan
  instead of spawning parallel agents. Only attempt parallel spawning if the user
  explicitly requests it — and in that case, rely on the spot-check fallback in step 3
  to detect completion.
- **Other runtimes:** If `Task`/`task` tool is unavailable, use sequential inline execution as the
  fallback. Check for tool availability at runtime rather than assuming based on runtime name.

**Fallback rule:** If a spawned agent completes its work (commits visible, SUMMARY.md exists) but
the orchestrator never receives the completion signal, treat it as successful based on spot-checks
and continue to the next wave/plan. Never block indefinitely waiting for a signal — always verify
via filesystem and git state.
</runtime_compatibility>

<required_reading>
<!-- If chained from plan.md's --auto (Skill(), same context), these 3 are already loaded — see AUDIT-workflow-complexity.md finding 3. -->
${AUTO_CHAINED_FROM_PLAN ? '' : '@.rcode/references/auto-init-guard.md'}
${AUTO_CHAINED_FROM_PLAN ? '' : '@.rcode/references/output-format.md'}
@.rcode/references/git-preflight.md
Read STATE.md before any operation to load project context.

${AUTO_CHAINED_FROM_PLAN ? '' : '@.rcode/references/karpathy-guidelines.md'}
@.rcode/references/execution-protocol.md
<!-- Read .rcode/references/agent-contracts.md only if debugging agent contract violations -->
<!-- Read .rcode/references/context-budget.md only if context degradation guidance is needed -->
<!-- Read .rcode/references/gates.md only if implementing or troubleshooting gate logic -->
</required_reading>

<available_agent_types>
These are the valid rcode subagent types registered in .claude/agents/ (or equivalent for your runtime).
Always use the exact name from this list — do not fall back to 'general-purpose' or other built-in types:

- rcode-executor — Executes plan tasks, commits, creates SUMMARY.md
- rcode-verifier — Verifies phase completion, checks quality gates
- rcode-planner — Creates detailed plans from phase scope
- rcode-phase-researcher — Researches technical approaches for a phase
- rcode-sprint-checker — Reviews plan quality before execution
- rcode-debugger — Diagnoses and fixes issues
- rcode-codebase-mapper — Maps project structure and dependencies
- rcode-integration-checker — Checks cross-phase integration
- rcode-nyquist-auditor — Validates verification coverage
- rcode-ux-designer — Researches UI/UX approaches
- rcode-ui-auditor — Audits UI against design requirements
- rcode-hanzla — Senior Full-Stack Engineer — full-stack plans spanning both frontend and backend
- rcode-yousef — Senior Backend Engineer — backend-only plans (API, DB, services, queues)
- rcode-haitham — Senior Frontend Engineer — frontend-only plans (React/Next.js/Tailwind/CSS/RTL/a11y)
- rcode-omar — Software Engineer (generalist) — fallback for cross-stack or small ambiguous plans when Hanzla isn't the clear fit
</available_agent_types>

<process>

<step name="parse_args" priority="first">
Parse `$ARGUMENTS` before loading any context:

- First positional token → `PHASE_ARG`
- Optional `--wave N` → `WAVE_FILTER`
- Optional `--gaps-only` keeps its current meaning

If `--wave` is absent, preserve the current behavior of executing all incomplete waves in the phase.
</step>

<step name="initialize" priority="first">
Load all context in one call:

```bash
INIT=$(node ".rcode/bin/rcode-tools.cjs" init execute "${PHASE_ARG}" 2>/dev/null)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
AGENT_SKILLS=$(node ".rcode/bin/rcode-tools.cjs" agent-skills rcode-executor 2>/dev/null || echo "")
```

If `INIT` is empty or `INIT.ok` is false, print error and exit:
```
Error: rcode-tools init failed. Verify .rcode/ is installed and state.json is valid.
```

Parse JSON for: `executor_model`, `verifier_model`, `commit_docs`, `parallelization`, `branching_strategy`, `branch_name`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `plans`, `incomplete_plans`, `plan_count`, `incomplete_count`, `state_exists`, `roadmap_exists`, `phase_req_ids`, `response_language`.

**If `response_language` is set:** Include `response_language: {value}` in all spawned subagent prompts so any user-facing output stays in the configured language.

Read worktree config:

```bash
USE_WORKTREES=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.use_worktrees 2>/dev/null || echo "true")
```

When `USE_WORKTREES` is `false`, all executor agents run without `isolation="worktree"` — they execute sequentially on the main working tree instead of in parallel worktrees.

Read context window size for adaptive prompt enrichment:

```bash
CONTEXT_WINDOW=$(node ".rcode/bin/rcode-tools.cjs" config-get context_window 2>/dev/null || echo "200000")

# Detect if any SPRINT.md in this phase references a checkpoint — used to lazy-load checkpoints.md
SPRINT_HAS_CHECKPOINT=$(grep -rl "checkpoint" "${phase_dir}"/*-SPRINT.md 2>/dev/null | head -1)
PRIOR_WAVE_FAILED=false  # set to true by wave failure handler if a prior wave errored
```

When `CONTEXT_WINDOW >= 500000` (1M-class models), subagent prompts include richer context:
- Executor agents receive prior wave SUMMARY.md files and the phase CONTEXT.md/RESEARCH.md
- Verifier agents receive all SPRINT.md, SUMMARY.md, CONTEXT.md files plus REQUIREMENTS.md
- This enables cross-phase awareness and history-aware verification

**If `phase_found` is false:** Error — phase directory not found. Run `/rcode-status` to inspect state or `/rcode-plan {N}` to create the phase.
**If `plan_count` is 0:** Error — no plans found in phase. Run `/rcode-plan {N}` to generate plans or `/rcode-help` for the command surface.
**If `state_exists` is false but `.planning/` exists:** Offer reconstruct or continue.

When `parallelization` is false, plans within a wave execute sequentially.

**Runtime detection for Copilot:**
Check if the current runtime is Copilot by testing for the `@rcode-executor` agent pattern
or absence of the `Task()` subagent API. If running under Copilot, force sequential inline
execution regardless of the `parallelization` setting — Copilot's subagent completion
signals are unreliable (see `<runtime_compatibility>`). Set `COPILOT_SEQUENTIAL=true`
internally and skip the `execute_waves` step in favor of `check_interactive_mode`'s
inline path for each plan.

**REQUIRED — Sync chain flag with intent.** If user invoked manually (no `--auto`), clear the ephemeral chain flag from any previous interrupted `--auto` chain. This prevents stale `_auto_chain_active: true` from causing unwanted auto-advance. This does NOT touch `workflow.auto_advance` (the user's persistent settings preference). You MUST execute this bash block before any config reads:
```bash
# REQUIRED: prevents stale auto-chain from previous --auto runs
if [[ ! "$ARGUMENTS" =~ --auto ]]; then
  node ".rcode/bin/rcode-tools.cjs" config-set workflow._auto_chain_active false 2>/dev/null
fi
```
</step>

<step name="create_phase_snapshot" priority="first">
**Create a pre-execution git tag so `/rcode-undo --phase NN --to-snapshot` can restore to this exact state.**

Only runs when inside a git repository with a valid HEAD (skip silently for fresh/empty repos).

```bash
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  SNAPSHOT_TAG="rcode/snapshot/phase-${phase_number}"
  if git rev-parse --verify "refs/tags/${SNAPSHOT_TAG}" >/dev/null 2>&1; then
    PREV_SHA=$(git rev-parse --short "${SNAPSHOT_TAG}")
    git tag -d "${SNAPSHOT_TAG}" >/dev/null 2>&1
    echo "Replaced prior snapshot (was at ${PREV_SHA})"
  fi
  git tag -a "${SNAPSHOT_TAG}" -m "Pre-execution snapshot for phase ${phase_number}" HEAD 2>/dev/null \
    && echo "✓ Snapshot: ${SNAPSHOT_TAG} @ $(git rev-parse --short HEAD)" \
    || echo "⚠ Could not create snapshot tag (non-fatal — undo --to-snapshot will be unavailable for this phase)"
fi
```

Tags are local-only by default (never auto-pushed), honoring the repo's push policy.
</step>

<step name="check_blocking_antipatterns" priority="first">
**MANDATORY — Check for blocking anti-patterns before any other work.**

Look for a `.continue-here.md` in the current phase directory:

```bash
ls ${phase_dir}/.continue-here.md 2>/dev/null || true
```

If `.continue-here.md` exists, parse its "Critical Anti-Patterns" table for rows with `severity` = `blocking`.

**If one or more `blocking` anti-patterns are found:**

This step cannot be skipped. Before proceeding to `check_interactive_mode` or any other step, the agent must demonstrate understanding of each blocking anti-pattern by answering all three questions for each one:

1. **What is this anti-pattern?** — Describe it in your own words, not by quoting the handoff.
2. **How did it manifest?** — Explain the specific failure that caused it to be recorded.
3. **What structural mechanism (not acknowledgment) prevents it?** — Name the concrete step, checklist item, or enforcement mechanism that stops recurrence.

Write these answers inline before continuing. If a blocking anti-pattern cannot be answered from the context in `.continue-here.md`, stop and ask the user for clarification.

**If no `.continue-here.md` exists, or no `blocking` rows are found:** Proceed directly to `check_interactive_mode`.
</step>

<step name="check_interactive_mode">
**Parse `--interactive` flag from $ARGUMENTS.**

**If `--interactive` flag present:** Switch to interactive execution mode.

```bash
INTERACTIVE_MODE=$([[ "$ARGUMENTS" =~ (^|[[:space:]])--interactive($|[[:space:]]) ]] && echo true || echo false)
```
${INTERACTIVE_MODE === 'true' ? '@.rcode/references/execute-interactive-mode.md' : ''}

**Skip to handle_branching step** (interactive plans execute inline after grouping).
</step>

<step name="handle_branching">
Check `branching_strategy` from init:

**"none":** Skip, continue on current branch.

**"phase" or "milestone":** Use pre-computed `branch_name` from init:
```bash
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
```

All subsequent commits go to this branch. User handles merging.
</step>

<step name="validate_phase">
From init JSON: `phase_dir`, `plan_count`, `incomplete_count`.

Report: "Found {plan_count} plans in {phase_dir} ({incomplete_count} incomplete)"

**Update STATE.md for phase start:**
```bash
node ".rcode/bin/rcode-tools.cjs" state begin-phase --phase "${PHASE_NUMBER}" --name "${PHASE_NAME}" --plans "${PLAN_COUNT}"
```
This updates Status, Last Activity, Current focus, Current Position, and plan counts in STATE.md so frontmatter and body text reflect the active phase immediately.
</step>

<step name="discover_and_group_plans">
Load plan inventory with wave grouping in one call:

```bash
PLAN_INDEX=$(node ".rcode/bin/rcode-tools.cjs" phase-plan-index "${PHASE_NUMBER}")
```

Parse JSON for: `phase`, `plans[]` (each with `id`, `wave`, `autonomous`, `objective`, `files_modified`, `task_count`, `has_summary`), `waves` (map of wave number → plan IDs), `incomplete`, `has_checkpoints`.

**Filtering:** Skip plans where `has_summary: true`. If `--gaps-only`: also skip non-gap_closure plans. If `WAVE_FILTER` is set: also skip plans whose `wave` does not equal `WAVE_FILTER`.

**Wave safety check:** If `WAVE_FILTER` is set and there are still incomplete plans in any lower wave that match the current execution mode, STOP and tell the user to finish earlier waves first. Do not let Wave 2+ execute while prerequisite earlier-wave plans remain incomplete.

If all filtered: "No matching incomplete plans" → exit.

Report:
```
## Execution Plan

**Phase {X}: {Name}** — {total_plans} matching plans across {wave_count} wave(s)

{If WAVE_FILTER is set: `Wave filter active: executing only Wave {WAVE_FILTER}`.}

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1 | 01-01, 01-02 | {from plan objectives, 3-8 words} |
| 2 | 01-03 | ... |
```
</step>

@rcode/workflows/execute-waves.md

<step name="checkpoint_handling">
Plans with `autonomous: false` require user interaction.

**Auto-mode checkpoint handling:**

Read auto-advance config (chain flag + user preference):
```bash
AUTO_CHAIN=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
AUTO_CFG=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
```

When executor returns a checkpoint AND (`AUTO_CHAIN` is `"true"` OR `AUTO_CFG` is `"true"`):
- **human-verify** → Auto-spawn continuation agent with `{user_response}` = `"approved"`. Log `⚡ Auto-approved checkpoint`.
- **decision** → Auto-spawn continuation agent with `{user_response}` = first option from checkpoint details. Log `⚡ Auto-selected: [option]`.
- **human-action** → Present to user (existing behavior below). Auth gates cannot be automated.

**Standard flow (not auto-mode, or human-action type):**

1. Spawn agent for checkpoint plan
2. Agent runs until checkpoint task or auth gate → returns structured state
3. Agent return includes: completed tasks table, current task + blocker, checkpoint type/details, what's awaited
4. **Present to user:**
   ```
   ## Checkpoint: [Type]

   **Plan:** 03-03 Dashboard Layout
   **Progress:** 2/3 tasks complete

   [Checkpoint Details from agent return]
   [Awaiting section from agent return]
   ```
5. User responds: "approved"/"done" | issue description | decision selection
6. **Spawn continuation agent (NOT resume)** using continuation-prompt.md template:
   - `{completed_tasks_table}`: From checkpoint return
   - `{resume_task_number}` + `{resume_task_name}`: Current task
   - `{user_response}`: What user provided
   - `{resume_instructions}`: Based on checkpoint type
7. Continuation agent verifies previous commits, continues from resume point
8. Repeat until plan completes or user stops

**Why fresh agent, not resume:** Resume relies on internal serialization that breaks with parallel tool calls. Fresh agents with explicit state are more reliable.

**Checkpoints in parallel waves:** Agent pauses and returns while other parallel agents may complete. Present checkpoint, spawn continuation, wait for all before next wave.
</step>

<step name="aggregate_results">
After all waves:

```markdown
## Phase {X}: {Name} Execution Complete

**Waves:** {N} | **Plans:** {M}/{total} complete

| Wave | Plans | Status |
|------|-------|--------|
| 1 | plan-01, plan-02 | ✓ Complete |
| CP | plan-03 | ✓ Verified |
| 2 | plan-04 | ✓ Complete |

### Plan Details
1. **03-01**: [one-liner from SUMMARY.md]
2. **03-02**: [one-liner from SUMMARY.md]

### Issues Encountered
[Aggregate from SUMMARYs, or "None"]
```

**Security gate check:**
```bash
SECURITY_CFG=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.security_enforcement --raw 2>/dev/null || echo "true")
SECURITY_FILE=$(ls "${PHASE_DIR}"/*-SECURITY.md 2>/dev/null | head -1)
```

If `SECURITY_CFG` is `false`: skip.

If `SECURITY_CFG` is `true` AND `SECURITY_FILE` is empty (no SECURITY.md yet):
Include in the next-steps routing output:
```
⚠ Security enforcement enabled — run before advancing:
  /rcode-secure-phase {PHASE}
```

If `SECURITY_CFG` is `true` AND SECURITY.md exists: check frontmatter `threats_open`. If > 0:
```
⚠ Security gate: {threats_open} threats open
  /rcode-secure-phase {PHASE} — resolve before advancing
```
</step>

<step name="handle_partial_wave_execution">
If `WAVE_FILTER` was used, re-run plan discovery after execution:

```bash
POST_PLAN_INDEX=$(node ".rcode/bin/rcode-tools.cjs" phase-plan-index "${PHASE_NUMBER}")
```

Apply the same "incomplete" filtering rules as earlier:
- ignore plans with `has_summary: true`
- if `--gaps-only`, only consider `gap_closure: true` plans

**If incomplete plans still remain anywhere in the phase:**
- STOP here
- Do NOT run phase verification
- Do NOT mark the phase complete in ROADMAP/STATE
- Present:

```markdown
## Wave {WAVE_FILTER} Complete

Selected wave finished successfully. This phase still has incomplete plans, so phase-level verification and completion were intentionally skipped.

/rcode-execute {phase}                # Continue remaining waves
/rcode-execute {phase} --wave {next}  # Run the next wave explicitly
```

**If no incomplete plans remain after the selected wave finishes:**
- continue with the normal phase-level verification and completion flow below
- this means the selected wave happened to be the last remaining work in the phase
</step>

<step name="run_verify_commands">
**Run per-task `<verify>` shell commands from all completed SPRINT.md plans.**

After all executor agents finish, extract and run any `<verify>` blocks defined in plan tasks. These are the machine-executable counterpart to `<acceptance_criteria>` prose.

```bash
# Extract all <verify> blocks from all SPRINT.md files for this phase
for plan in "${PHASE_DIR}"/*-SPRINT.md; do
  python3 -c "
import re, sys
content = open('$plan').read()
verifies = re.findall(r'<verify>(.*?)</verify>', content, re.DOTALL)
for v in verifies:
    for line in v.strip().splitlines():
        line = line.strip()
        if line:
            print(line)
" 2>/dev/null
done
```

Run each extracted command. Collect results:
- Exit 0 → `✓ PASS`
- Non-zero → `❌ FAIL: {command}`

**If any verify command fails:**
```
⚠ Task verify commands failed:

  ❌ {command}
  Output: {stderr/stdout}

These are task-level acceptance checks. Fix before proceeding to code review.
/rcode-debug "verify command failed: {command}" — diagnose the failure
```
STOP — do not proceed to `code_review_gate` until all verify commands pass or the user explicitly overrides.

**If all pass (or no `<verify>` blocks exist):** proceed to `code_review_gate` silently.

**Skip if:** `--skip-verify` flag is set.
</step>

<step name="code_review_gate" required="true">
**This step is REQUIRED and must not be skipped.** Spawn `rcode-reviewer` to review the phase's source changes. Acts as a BLOCKING gate before the verifier when critical or high findings are present.

**Config gate (default ON):**
```bash
CODE_REVIEW_ENABLED=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.code_review_enabled 2>/dev/null || echo "true")
```

If `CODE_REVIEW_ENABLED` is `"false"`: display "Code review skipped (workflow.code_review_enabled=false)" and proceed to `close_parent_artifacts`.

**Resolve reviewer model:**
```bash
REVIEWER_MODEL=$(node ".rcode/bin/rcode-tools.cjs" resolve-model reviewer 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).model)}catch{console.log('')}})" || echo "sonnet")
REVIEWER_MODEL=${REVIEWER_MODEL:-sonnet}
REVIEWER_SKILLS=$(node ".rcode/bin/rcode-tools.cjs" agent-skills rcode-reviewer 2>/dev/null || echo "")
# Issue #652 — no leading zeros. Variable name kept for backward compat in this workflow.
PADDED="${PHASE_NUMBER}"
REVIEW_FILE="${PHASE_DIR}/${PADDED}-REVIEW.md"
```

**Spawn the reviewer agent:**
```
Task(
  description="Code review for phase {phase_number}",
  prompt="Review the source code changes for phase {phase_number}.
Phase directory: {phase_dir}
Phase goal: {goal from ROADMAP.md}

Read all plan files and summaries in the phase directory, then review the source files actually modified (from SUMMARY.md `key-files.created`/`modified`). Classify each finding by severity: critical, high, medium, or low.

Write the review to: ${REVIEW_FILE}

The file MUST begin with YAML frontmatter including:
---
status: clean | issues_found | skipped
phase: {phase_number}
critical: <count>
high: <count>
medium: <count>
low: <count>
generated: <ISO timestamp>
---

Group findings by severity. For each finding include: file path, line reference, description, recommended fix.

${REVIEWER_SKILLS}",
  subagent_type="rcode-reviewer",
  model="${REVIEWER_MODEL}"
)
```

**Error handling:** If the Task invocation fails or throws, display "Code review encountered an error (non-blocking): {error}" and proceed to `close_parent_artifacts`. A broken reviewer must never permanently block execution.

**Parse severity counts:**
```bash
# Fail-safe defaults — malformed/missing frontmatter must NOT bypass the gate (#602).
# Empty string compared against an integer in bash evaluates to false, which
# would silently let critical findings through. Default missing to a sentinel
# that fails the gate so a bad REVIEW.md is treated as "block, ask the user".
REVIEW_STATUS="malformed"
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0
REVIEW_PARSE_OK=false
if [[ -f "$REVIEW_FILE" ]]; then
  FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$REVIEW_FILE")
  PARSED_STATUS=$(echo "$FRONTMATTER" | grep "^status:" | head -1 | cut -d: -f2 | tr -d ' ')
  PARSED_CRIT=$(echo "$FRONTMATTER"   | grep "^critical:" | head -1 | cut -d: -f2 | tr -d ' ')
  PARSED_HIGH=$(echo "$FRONTMATTER"   | grep "^high:"     | head -1 | cut -d: -f2 | tr -d ' ')
  PARSED_MED=$(echo "$FRONTMATTER"    | grep "^medium:"   | head -1 | cut -d: -f2 | tr -d ' ')
  PARSED_LOW=$(echo "$FRONTMATTER"    | grep "^low:"      | head -1 | cut -d: -f2 | tr -d ' ')
  # Accept the parse only when status + all four counts are present AND counts
  # are pure digits. Anything else = malformed → block and ask.
  if [[ -n "$PARSED_STATUS" \
        && "$PARSED_CRIT" =~ ^[0-9]+$ \
        && "$PARSED_HIGH" =~ ^[0-9]+$ \
        && "$PARSED_MED"  =~ ^[0-9]+$ \
        && "$PARSED_LOW"  =~ ^[0-9]+$ ]]; then
    REVIEW_STATUS="$PARSED_STATUS"
    CRITICAL_COUNT="$PARSED_CRIT"
    HIGH_COUNT="$PARSED_HIGH"
    MEDIUM_COUNT="$PARSED_MED"
    LOW_COUNT="$PARSED_LOW"
    REVIEW_PARSE_OK=true
  fi
fi

# Malformed REVIEW.md = treat as a blocking finding. The gate must NEVER
# silently pass when it can't read the report (#602).
if [[ "$REVIEW_PARSE_OK" != "true" ]]; then
  echo "⛔ Code review gate: REVIEW.md missing or malformed at ${REVIEW_FILE}."
  echo "   Cannot determine severity counts. Treating as blocking — re-run the reviewer."
  CRITICAL_COUNT=1   # force the gate to block; user can override below
fi
```

**Blocking gate on critical/high:**

If `CRITICAL_COUNT > 0` OR `HIGH_COUNT > 0`, present the block banner and use AskUserQuestion:

```
## ⛔ Code Review Gate: Blocking Findings

Phase {phase_number} code review found:
  critical: ${CRITICAL_COUNT}
  high:     ${HIGH_COUNT}
  medium:   ${MEDIUM_COUNT}
  low:      ${LOW_COUNT}

Report: ${REVIEW_FILE}

Verifier is blocked until critical/high findings are resolved.
```

AskUserQuestion with options:
1. **"Run /rcode-review-fix first (recommended)"** — Stop. Print next command: `/rcode-review-fix ${PHASE_NUMBER}`. Do NOT spawn verifier.
2. **"Proceed to verifier anyway (high findings unresolved)"** — Log override and continue to `close_parent_artifacts` → `regression_gate` → `verify_phase_goal`.
3. **"Cancel execution"** — Stop. Report partial completion.

**Advisory line on medium/low only:**

If `CRITICAL_COUNT == 0` AND `HIGH_COUNT == 0` AND (`MEDIUM_COUNT > 0` OR `LOW_COUNT > 0`), display:
```
⚠ Code review found non-blocking findings (medium: ${MEDIUM_COUNT}, low: ${LOW_COUNT}).
  Report: ${REVIEW_FILE}
  Consider: /rcode-review-fix ${PHASE_NUMBER}
```
Then continue to `close_parent_artifacts`.

**Clean review:** If `REVIEW_STATUS == "clean"` (or all counts are zero), display "✓ Code review clean" and continue.

Only when the gate is clean or the user overrides do we proceed to close_parent_artifacts → regression_gate → verify_phase_goal.
</step>

<step name="close_parent_artifacts">
**For decimal/polish phases only (X.Y pattern):** Close the feedback loop by resolving parent UAT and debug artifacts.

**Skip if** phase number has no decimal (e.g., `3`, `04`) — only applies to gap-closure phases like `4.1`, `03.1`.

```bash
IS_GAP_CLOSURE_PHASE=$([[ "$PHASE_NUMBER" == *.* ]] && echo true || echo false)
```
${IS_GAP_CLOSURE_PHASE === 'true' ? '@.rcode/references/execute-close-parent-artifacts.md' : ''}
</step>

@rcode/workflows/execute-regression-gates.md

@rcode/workflows/execute-verify-phase-goal.md

<step name="uat_gate" priority="blocker">
**UAT gate:**

Before marking the phase complete, verify a passing VERIFICATION.md exists for this phase. Without it, the phase advances to `status: executed` (work done, awaiting verification) — not `status: complete`.

```bash
VERIFICATION_FILE=$(ls "${PHASE_DIR}"/*-VERIFICATION.md 2>/dev/null | head -1)

if [ -z "$VERIFICATION_FILE" ]; then
  VERIFICATION_STATUS="missing"
elif grep -qE "^status:[[:space:]]*passed" "$VERIFICATION_FILE" 2>/dev/null; then
  VERIFICATION_STATUS="pass"
elif grep -qE "^status:[[:space:]]*(gaps_found|fail)" "$VERIFICATION_FILE" 2>/dev/null; then
  VERIFICATION_STATUS="fail"
else
  VERIFICATION_STATUS="indeterminate"
fi
```

**If `VERIFICATION_STATUS` is `missing` or `indeterminate`:**

1. Mark the phase as `status: executed` (NOT `complete`) via:
   ```bash
   node ".rcode/bin/rcode-tools.cjs" phase set-status "${PHASE_NUMBER}" executed
   ```
2. Print the mandatory UAT checklist:
   ```
   ⚠ Phase {X} EXECUTED but not yet verified.

   The following acceptance criteria require human verification before
   the phase can advance to `status: complete`:

   {list AC items from SPRINT.md}

   Recommended next steps:
   /rcode-add-tests {X} — generate unit + E2E tests before UAT
   /rcode-verify-work {X} — perform UAT and produce VERIFICATION.md

   /rcode-next will refuse to advance until the UAT gate passes.
   ```
3. STOP the workflow. Do NOT proceed to `update_roadmap`. Do NOT call `phase complete`.

**If `VERIFICATION_STATUS` is `fail`:**

1. Mark the phase as `status: executed` (so /rcode-plan --gaps can run a closure cycle).
2. Surface the failed AC items.
3. STOP. Don't mark complete on a failing verification.

**Only when `VERIFICATION_STATUS` is `pass`** — proceed to `update_roadmap` below.

The previous behaviour (printing "Next Up: /rcode-verify-work" without state-gating) caused phases to reach `status: complete` without any human-verified UAT.
</step>

<step name="update_roadmap">
**Mark phase complete and update all tracking files:**

```bash
COMPLETION=$(node ".rcode/bin/rcode-tools.cjs" phase complete "${PHASE_NUMBER}")
```

Record execution telemetry (plan count + latest commit hash):
```bash
EXEC_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "")
node ".rcode/bin/rcode-tools.cjs" state record-execution \
  --plan "${PHASE_NUMBER}" \
  --tasks "${PLAN_COUNT}" \
  --hash "${EXEC_HASH}" \
  2>/dev/null || true
```

The CLI handles:
- Marking phase checkbox `[x]` with completion date
- Updating Progress table (Status → Complete, date)
- Updating plan count to final
- Advancing STATE.md to next phase
- Updating REQUIREMENTS.md traceability
- Scanning for verification debt (returns `warnings` array)

Extract from result: `next_phase`, `next_phase_name`, `is_last_phase`, `warnings`, `has_warnings`, `open_phases_remaining`, `nudge`.

**If `nudge` is present (#943 — no open phases remain, milestone finished):**
Surface it verbatim so the user is guided forward instead of stranded:
```
✓ Milestone complete — all phases done.
{nudge}
```
Do not auto-advance past a finished milestone; let the user choose
`/rcode-complete-milestone` or `/rcode-new-milestone`.

**If has_warnings is true:**
```
## Phase {X} marked complete with {N} warnings:

{list each warning}

These items are tracked and will appear in `/rcode-progress` and `/rcode-audit-uat`.
```

```bash
node ".rcode/bin/rcode-tools.cjs" commit "docs(phase-{X}): complete phase execution" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md {phase_dir}/*-VERIFICATION.md
```
</step>

<step name="auto_copy_learnings">
**Auto-copy phase learnings to global store (when enabled).**

**Check config gate:**
```bash
GL_ENABLED=$(node ".rcode/bin/rcode-tools.cjs" config-get features.global_learnings --raw 2>/dev/null || echo "false")
```

**If `GL_ENABLED` is not `true`:** Skip this step entirely (feature disabled by default).
${GL_ENABLED === 'true' ? '@.rcode/references/execute-auto-copy-learnings.md' : ''}
</step>

<step name="update_project_md">
**Evolve PROJECT.md to reflect phase completion (prevents planning document drift — #956):**

PROJECT.md tracks validated requirements, decisions, and current state. Without this step,
PROJECT.md falls behind silently over multiple phases.

1. Read `.planning/PROJECT.md`
2. If the file exists and has a `## Validated Requirements` or `## Requirements` section:
   - Move any requirements validated by this phase from Active → Validated
   - Add a brief note: `Validated in Phase {X}: {Name}`
3. If the file has a `## Current State` or similar section:
   - Update it to reflect this phase's completion (e.g., "Phase {X} complete — {one-liner}")
4. Update the `Last updated:` footer to today's date
5. Commit the change:

```bash
node ".rcode/bin/rcode-tools.cjs" commit "docs(phase-{X}): evolve PROJECT.md after phase completion" --files .planning/PROJECT.md
```

**Skip this step if** `.planning/PROJECT.md` does not exist.
</step>

<step name="notify_on_completion">
**Post phase completion to configured webhooks (Slack / Discord / MS Teams).**

Silent no-op if no webhook URLs are in `.rcode/config.yaml`. Failures are reported but never block the workflow.

```bash
WEBHOOK_CONFIGURED=$(node ".rcode/bin/rcode-tools.cjs" config-get slack_webhook_url 2>/dev/null; node ".rcode/bin/rcode-tools.cjs" config-get discord_webhook_url 2>/dev/null; node ".rcode/bin/rcode-tools.cjs" config-get teams_webhook_url 2>/dev/null)
WEBHOOK_CONFIGURED=$([ -n "$WEBHOOK_CONFIGURED" ] && echo true || echo false)
```
${WEBHOOK_CONFIGURED === 'true' ? '@.rcode/references/execute-notify-webhooks.md' : ''}
</step>

<step name="generate_tests">
**Offer test generation for the completed phase.**

After verification passes and the roadmap is updated, check whether tests were already written as part of the phase plans:

```bash
TEST_FILES=$(find "${PHASE_DIR}" -name "*test*" -o -name "*spec*" 2>/dev/null | wc -l)
```

If `TEST_FILES` is 0 — no test artifacts were produced during execution. Present the test generation offer:

```
## ✓ Phase {X}: {Name} — Add Tests?

No test files were generated during this phase.
Run /rcode-add-tests to generate unit + E2E tests from the SUMMARY:

/rcode-add-tests {X}

Skip if tests are out of scope for this phase (infra, config, docs-only).
```

If `TEST_FILES` is > 0 — tests were written inline. Skip this step silently.

**This step is advisory only — it never blocks phase completion.**
</step>

<step name="offer_next">

**Exception:** If `gaps_found`, the `verify_phase_goal` step already presents the gap-closure path (`/rcode-plan {X} --gaps`). No additional routing needed — skip auto-advance.

**No-transition check (spawned by auto-advance chain):**

Parse `--no-transition` flag from $ARGUMENTS.

**If `--no-transition` flag present:**

Execute-phase was spawned by plan's auto-advance. Do NOT run transition.md.
After verification passes and roadmap is updated, return completion status to parent:

```
## PHASE COMPLETE

Phase: ${PHASE_NUMBER} - ${PHASE_NAME}
Plans: ${completed_count}/${total_count}
Verification: {Passed | Gaps Found}

[Include aggregate_results output]
```

STOP. Do not proceed to auto-advance or transition.

**If `--no-transition` flag is NOT present:**

**Auto-advance detection:**

1. Parse `--auto` flag from $ARGUMENTS
2. Read both the chain flag and user preference (chain flag already synced in init step):
   ```bash
   AUTO_CHAIN=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
   AUTO_CFG=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
   ```

**If `--auto` flag present OR `AUTO_CHAIN` is true OR `AUTO_CFG` is true (AND verification passed with no gaps):**

```
╔══════════════════════════════════════════╗
║  AUTO-ADVANCING → TRANSITION             ║
║  Phase {X} verified, continuing chain    ║
╚══════════════════════════════════════════╝
```

Execute the transition workflow inline (do NOT use Task — orchestrator context is ~10-15%, transition needs phase completion data already in context):

Read and follow `.rcode/workflows/transition.md`, passing through the `--auto` flag so it propagates to the next phase invocation.

**If none of `--auto`, `AUTO_CHAIN`, or `AUTO_CFG` is true:**

**STOP. Do not auto-advance. Do not execute transition. Do not plan next phase. Present options to the user and wait.**

**IMPORTANT: There is NO `/rcode-transition` command. Never suggest it. The transition workflow is internal only.**

```
## ✓ Phase {X}: {Name} Complete

/rcode-add-tests {X} — generate unit + E2E tests for this phase
/rcode-progress — see updated roadmap
/rcode-discuss-phase {next} — discuss next phase before planning
/rcode-plan {next} — plan next phase
/rcode-execute {next} — execute next phase
```

**Next step — paste this to verify:**
> /rcode-verify {X}

Only suggest the commands listed above. Do not invent or hallucinate command names.
</step>

</process>

<context_efficiency>
Orchestrator: ~10-15% context for 200k windows, can use more for 1M+ windows.
Subagents: fresh context each (200k-1M depending on model). No polling (Task blocks). No context bleed.

For 1M+ context models, consider:
- Passing richer context (code snippets, dependency outputs) directly to executors instead of just file paths
- Running small phases (≤3 plans, no dependencies) inline without subagent spawning overhead
- Relaxing /clear recommendations — context rot onset is much further out with 5x window
</context_efficiency>

<failure_handling>
- See the classifyHandoffIfNeeded workaround in execute-waves.md (already @-included above).
- **Agent fails mid-plan:** Missing SUMMARY.md → report, ask user how to proceed
- **Dependency chain breaks:** Wave 1 fails → Wave 2 dependents likely fail → user chooses attempt or skip
- **All agents in wave fail:** Systemic issue → stop, report for investigation
- **Checkpoint unresolvable:** "Skip this plan?" or "Abort phase execution?" → record partial progress in STATE.md
</failure_handling>

<resumption>
Re-run `/rcode-execute {phase}` → discover_plans finds completed SUMMARYs → skips them → resumes from first incomplete plan → continues wave execution.

STATE.md tracks: last completed plan, current wave, pending checkpoints.
</resumption>

## Next Up

- `/rcode-verify-phase` — verify the phase goal is achieved after execution completes
- `/rcode-ship` — push the branch and open a PR once verification passes
- `/rcode-debug` — investigate root cause if any plan fails during execution
