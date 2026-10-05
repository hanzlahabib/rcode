# execute - step 02: Output format, core principle, runtime compatibility, required reading, parse_args, initialize

This step file was split verbatim out of `workflows/execute.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

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

Closure: this banner is NOT printed here, right after the wave loop. It is
gated behind `uat_gate` — see that step's "Only when `VERIFICATION_STATUS`
is `pass`" branch, which is the only point in `<process>` where phase
completion is actually confirmed (after code_review_gate, run_verify_commands,
close_parent_artifacts, the regression gate, and verify_phase_goal have all
passed):
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

Parse JSON for these real, top-level fields: `executor_model`, `verifier_model`, `phase_dir`, `plans`, `state_exists`, `response_language`. Fields commonly assumed to exist but that are NOT top-level (verified live this session against `init execute`'s real output, `cmdInitExecute` in rcode-tools.cjs): `branching_strategy` is nested under `config.branching_strategy`; `commit_docs` doesn't exist (closest real value is `config.commit_planning`, a `"true"`/`"false"` string); `parallelization` has no source anywhere (not top-level, not under `config`, not in `phase-plan-index`'s output either); `branch_name` isn't returned (the `handle_branching` step below now computes it from config instead); `phase_name` isn't derivable either (`phase_dir`'s basename is a slug, not the human-readable name — read ROADMAP.md if a step needs it); `incomplete_plans`/`incomplete_count` don't exist (`plans[]` items only carry `{path, depends_on, wave, plan}`, no completion field); `roadmap_exists`/`phase_req_ids` are returned only by the separate `init sprint-plan` command, not `init execute`.
Derivable, not literal: `phase_found` as `phase_dir !== null`; `phase_number` as the `target` field (the raw phase argument as passed, e.g. `"45"`); `phase_slug` from `phase_dir`'s basename (the part after the first `-`); `plan_count` as `plans.length`. Downstream `${PHASE_NUMBER}`/`${PLAN_COUNT}` references later in this workflow (snapshot tag, review prompts, `phase complete`, etc.) resolve from `target`/`plans.length` per these derivations; `${PHASE_NAME}` and `${INCOMPLETE_COUNT}` have no source here — read `PHASE_NAME` from ROADMAP.md if a later step needs it, and treat `INCOMPLETE_COUNT` as unknown until `phase-plan-index` runs in `discover_and_group_plans` (which does return a real per-plan `has_summary` completion signal).

**If `response_language` is set:** Include `response_language: {value}` in all spawned subagent prompts so any user-facing output stays in the configured language.

Read worktree config:

```bash
USE_WORKTREES=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.use_worktrees 2>/dev/null)
USE_WORKTREES=${USE_WORKTREES:-true}  # config-get exits 0 with empty output when key absent; || fallback won't fire
```

When `USE_WORKTREES` is `false`, all executor agents run without `isolation="worktree"` — they execute sequentially on the main working tree instead of in parallel worktrees.

Read context window size for adaptive prompt enrichment:

```bash
CONTEXT_WINDOW=$(node ".rcode/bin/rcode-tools.cjs" config-get context_window 2>/dev/null || echo "200000")

# Detect if any SPRINT.md in this phase references a checkpoint — used to lazy-load checkpoints.md
SPRINT_HAS_CHECKPOINT=$(grep -rl "checkpoint" "${phase_dir}"/*-SPRINT.md 2>/dev/null | head -1)
PRIOR_WAVE_FAILED=false  # set true in execute-waves.md step 6 (spot-check failure) and the pre-wave key-links gate when the user continues past a failed wave — read at step 3 to lazy-load checkpoints.md (#1090)
```

When `CONTEXT_WINDOW >= 500000` (1M-class models), subagent prompts include richer context:
- Executor agents receive prior wave SUMMARY.md files and the phase CONTEXT.md/RESEARCH.md
- Verifier agents receive all SPRINT.md, SUMMARY.md, CONTEXT.md files plus REQUIREMENTS.md
- This enables cross-phase awareness and history-aware verification

**If `phase_dir` is `null` (derived `phase_found` false):** Error — phase directory not found. Run `/rcode-status` to inspect state or `/rcode-plan {N}` to create the phase.
**If `plans.length` is 0 (derived `plan_count` 0):** Error — no plans found in phase. Run `/rcode-plan {N}` to generate plans or `/rcode-help` for the command surface.
**If `state_exists` is false but `.planning/` exists:** Offer reconstruct or continue.

`parallelization` is not a real field in `init execute`'s output (see the "initialize" step's field notes above) — this line currently documents behavior with no data source; don't treat it as a working toggle until a real source is wired in.

**Runtime detection for Copilot:**
Check if the current runtime is Copilot by testing for the `@rcode-executor` agent pattern
or absence of the `Task()` subagent API. If running under Copilot, force sequential inline
execution unconditionally (there is no real `parallelization` toggle to override — see the
"initialize" step's field notes above) — Copilot's subagent completion
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

Next: Read `.rcode/workflows/execute/steps/03-snapshot-guards.md` before starting it (skip it if its Read-when condition is false).
