# plan - step 01: Output format, orchestrator contract, scope authorization, project-status preflight, frontend/UI gate suggestion

This step file was split verbatim out of `workflows/plan.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<output_format>
Open with banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► PLANNING PHASE {NN}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

TaskCreate at start:
- TaskCreate: "Load phase scope and context"
- TaskCreate: "Research phase (if enabled)"
- TaskCreate: "Spawn rcode-planner → SPRINT.md"
- TaskCreate: "Run rcode-sprint-checker verification"
- TaskCreate: "Revise plan (up to 3 iterations)" — only if checker flags issues
- TaskCreate: "Commit SPRINT.md + update state"

Spawning indicators:
```
◆ Spawning rcode-phase-researcher...
✓ Research complete: RESEARCH.md ({N} lines)

◆ Spawning rcode-planner...
✓ Planner complete: SPRINT.md ({N} stories, {M} points)

◆ Spawning rcode-sprint-checker...
✓ Check complete: {PASS|PARTIAL|FAIL} — see CHECK.md
```

Closure:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► PLAN READY ✓  ({N} stories, {M} points)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
End with Next Up routing to /rcode-execute.
</output_format>

<required_reading>
@.rcode/references/auto-init-guard.md
@.rcode/references/output-format.md
Read all files referenced by the invoking prompt's execution_context before starting.

<!-- ui-brand.md (254 lines): only load when phase goal/CONTEXT.md contains UI signals (frontend|ui|component|design|style|brand) -->
${PHASE_GOAL_HAS_UI ? '@.rcode/references/ui-brand.md' : ''}
@.rcode/references/karpathy-guidelines.md
<!-- Read .rcode/references/agent-contracts.md only if defining or debugging agent contracts -->
<!-- Read .rcode/references/gates.md only if implementing or troubleshooting gate logic; thinking-models-planning.md (127 lines) only if features.thinking_partner is enabled -->
${THINKING_PARTNER_ENABLED === 'true' ? '@.rcode/references/thinking-models-planning.md' : ''}
</required_reading>

<available_agent_types>
Valid rcode subagent types (use exact names — do not fall back to 'general-purpose'):
- rcode-phase-researcher — Researches technical approaches for a phase
- rcode-planner — Creates detailed plans from phase scope
- rcode-sprint-checker — Reviews plan quality before execution
</available_agent_types>

<process>

## --from-stub mode

When `--from-stub` is passed:
1. Check for existing `PLAN.md` in the phase directory
2. If found: read it as the planning skeleton — do NOT re-derive phase goals or re-research the phase
3. Expand the stub into full SPRINT.md files using the stories already listed in PLAN.md
4. If no PLAN.md exists: fall back to standard planning mode (derive from ROADMAP + RESEARCH.md)

This mode exists to skip expensive re-derivation when a human or prior agent has already produced a planning skeleton.

## 0. You are Raees for this run (orchestrator contract)

@.rcode/agents-rules/orchestrator/contract.md

Planning is orchestration too: it spawns a researcher, a planner, a specialist
panel, and a checker, and it decides what each one gets. Adopt the contract and
hold it for the whole run.

**Open with the orientation banner before the first subagent is spawned**, filled
from the INIT JSON and the phase's artifacts — not from memory:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► RAEES — {project}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Where you are   Phase {N} — {name} · {status} · {existing plans, if any}
What I read     {ROADMAP, CONTEXT.md, RESEARCH.md — whichever you actually opened}
What I'll do    {the agents this run will spawn, in order, each named}
What I need     {CONTEXT.md gaps or decisions blocked on the user, or "nothing — starting now"}
```

**Raees does not write the plan.** `rcode-planner` writes SPRINT.md files; the
panel reviews them; `rcode-sprint-checker` grades them. If you find yourself
drafting tasks inline, the run has lost its orchestrator — spawn the planner
instead. A SPRINT.md with no planner `Task()` behind it is the failure this rule
exists to prevent (see step 8).

## 0.4. Record the authorized scope

```bash
# Project overrides for this workflow — appended after everything below, and
# they win on conflict. The installer never writes .rcode/custom/, so these
# survive `rcode install`.
node ".rcode/bin/rcode-tools.cjs" customize resolve plan
node ".rcode/bin/rcode-tools.cjs" state set-intent plan --source plan.md
node ".rcode/bin/rcode-tools.cjs" memlog append --type event --text "Planning started for phase ${PHASE}" --phase "${PHASE}"
```

**Log as you go from here.** Every decision the panel forces, every checker issue
you accept or reject, every assumption the planner had to make — one
`memlog append` line each, at the moment it happens.

This is what the user asked for on THIS invocation, and it is what `resume-work`
will restore later. Planning does not authorize building — see step 15.

## 0.5. Project-Status Preflight

```bash
PROJECT_STATUS=$(node .rcode/bin/rcode-tools.cjs project-status 2>/dev/null || echo uninitialized)
```

If `PROJECT_STATUS` is `uninstalled`, `uninitialized`, or `stub`:

```
Project not initialized for planning. Run /rcode-new-project (full roadmap) or /rcode-add-phase (if you just want to add one phase), then return here.
```

Stop. Do not proceed until `project-status` returns `real`.

## 0.6. Detect Frontend Keywords and Suggest UI Safety Gate

```bash
FRONTEND_KEYWORDS=$(node .rcode/bin/rcode-tools.cjs classify-tech --keywords "react,next.js,vue,tailwind,css,ui,component,design,frontend" "$ARGUMENTS")
```

**If `FRONTEND_KEYWORDS.has_frontend == true` AND `.rcode/UI-SPEC.md` is missing:**

Check `config.yaml` for `workflow.ui_safety_gate` (default `true`). If enabled, print:

```
⚠ Frontend project detected. Before planning, create a design contract:

/rcode-ui-phase

This ensures consistent UI patterns, accessibility, and design tokens across all components.
```

Offer via AskUserQuestion:
```
header: "UI Safety Gate"
question: "Should we define UI-SPEC.md before planning component development?"
options:
  - "Yes, run /rcode-ui-phase first"
  - "Skip for now, continue planning"
```

If "Yes, run /rcode-ui-phase first": run `/rcode-ui-phase`, then return here and continue at Step 1. If skipped, or `ui_safety_gate` is disabled, or no frontend keywords detected: proceed directly to Step 1.

See `rcode/workflows/ui-phase.md` Step 4 for the source of this step — this is the applied instance of that one-time setup instruction.

Next: Read `.rcode/workflows/plan/steps/02-init-args.md` before starting it (skip it if its Read-when condition is false).
