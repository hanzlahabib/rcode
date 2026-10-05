# execute - step 04: Checkpoint handling, aggregate results, partial wave execution, run verify commands

This step file was split verbatim out of `workflows/execute.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

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

**Waves:** {N} | **Plans:** {M}/{total} executed

Verification gates (run_verify_commands, code_review_gate, regression gate, uat_gate) have not run yet — this table reflects agent execution only, not verification.

| Wave | Plans | Status |
|------|-------|--------|
| 1 | plan-01, plan-02 | ✓ Executed |
| CP | plan-03 | ✓ Checkpoint passed |
| 2 | plan-04 | ✓ Executed |

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

After all executor agents finish, extract and run any `<verify>` blocks defined in plan tasks. These are the machine-executable proof that a task's `<done>` criteria are met — the plan schema has no such tag; `<verify><automated>` plus `<evidence>` grounding are what the planner and executor actually emit and enforce.

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

Next: Read `.rcode/workflows/execute/steps/05-review-gate.md` before starting it (skip it if its Read-when condition is false).
