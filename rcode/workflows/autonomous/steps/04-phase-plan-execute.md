# autonomous - step 04: UI contract, plan, execute, code review, post-execution routing, UI review (3a.5-3d.5)

This step file was split verbatim out of `workflows/autonomous.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

### 3a.5. UI Design Contract (Frontend Phases)

Check if this phase has frontend indicators and whether a UI-SPEC already exists:

```bash
PHASE_SECTION=$(sed -n "/^## Phase ${PHASE_NUMBER}/,/^## Phase /p" .planning/ROADMAP.md)
echo "$PHASE_SECTION" | grep -iE "UI|interface|frontend|component|layout|page|screen|view|form|dashboard|widget" > /dev/null 2>&1
HAS_UI=$?
UI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-SPEC.md 2>/dev/null | head -1)
UI_PHASE_CFG=$(node .rcode/bin/rcode-tools.cjs config 2>/dev/null | grep -oE '"ui_phase"[^,}]*' | grep -oE 'true|false' || echo "true")
```

**If `HAS_UI` is 0 (frontend indicators found) AND `UI_SPEC_FILE` is empty AND `UI_PHASE_CFG` is not `false`:**

Display:

```
Phase ${PHASE_NUMBER}: Frontend phase detected — generating UI design contract...
```

```
Skill(skill="rcode-ui-phase", args="${PHASE_NUMBER}")
```

Verify UI-SPEC was created (rcode-ui-phase produces WIREFRAMES.md alongside it in the same run). If still empty after ui-phase, display a non-blocking warning and proceed to 3b.

**Otherwise:** Skip silently to 3b.

### 3b. Plan

**If `INTERACTIVE` is set:** Dispatch plan as a background Task agent to keep the main context lean:

```
Task(
  description="Plan phase ${PHASE_NUMBER}: ${PHASE_NAME}",
  subagent_type="rcode-planner",
  run_in_background=true,
  prompt="Run plan-phase for phase ${PHASE_NUMBER}: Skill(skill=\"rcode-plan\", args=\"${PHASE_NUMBER}\")"
)
```

Store the agent task_id. After discuss for the next phase completes (or if no next phase), wait for the plan agent to finish before proceeding to execute.

**If `INTERACTIVE` is NOT set (default):** Run plan inline as before.

```
Skill(skill="rcode-plan", args="${PHASE_NUMBER}")
```

Verify plan produced output — check `${PHASE_DIR}` for `*-PLAN.md` or `SPRINT.md`. If none → go to handle_blocker: "Plan phase ${PHASE_NUMBER} did not produce any plans."

### 3c. Execute

**If `INTERACTIVE` is set:** Wait for the plan agent to complete (if not already), verify plans exist, then dispatch execute as a background agent:

```
Task(
  description="Execute phase ${PHASE_NUMBER}: ${PHASE_NAME}",
  subagent_type="rcode-executor",
  run_in_background=true,
  prompt="Run execute-phase for phase ${PHASE_NUMBER}: Skill(skill=\"rcode-execute\", args=\"${PHASE_NUMBER} --no-transition\")"
)
```

Store the agent task_id. The workflow can now start discussing the next phase while this phase executes in the background. Before starting post-execution routing for this phase, wait for the execute agent to complete, then run the mandatory reconciliation command below (same as the non-interactive path) before continuing.

**If `INTERACTIVE` is NOT set (default):** Run execute inline as before.

```
Skill(skill="rcode-execute", args="${PHASE_NUMBER} --no-transition")
```

**Mandatory reconciliation (run this bash command directly, every phase, no exceptions):**
`execute.md`'s own state-write steps (`phase set-status`/`phase complete`) are
documented but not mechanically guaranteed — a real unattended multi-phase
run was observed skipping them, leaving `state.json` stuck at every phase's
planning-time status while ROADMAP.md correctly showed them complete. Don't
rely on remembering to do this; run it as its own step, immediately after
execute returns, before moving to post-execution routing:

```bash
node ".rcode/bin/rcode-tools.cjs" state sync --from-disk >/dev/null 2>&1 || true
```

This is idempotent and cheap — it re-derives phase status from ROADMAP.md's
actual `**Status:**` text (never downgrades an already-advanced status), so
running it here closes the gap even if execute.md's own inline state-write
steps were skipped during a long run. Do this for every phase in the loop,
not just once at the end.

### 3c.5. Code Review and Fix

Auto-invoke code review and fix chain. Autonomous mode chains both review and fix.

**Config gate:**
```bash
CODE_REVIEW_ENABLED=$(node .rcode/bin/rcode-tools.cjs config 2>/dev/null | grep -oE '"code_review"[^,}]*' | grep -oE 'true|false' || echo "false")
```
If `"false"`: display "Code review skipped (workflow.code_review=false)" and proceed to 3d.

```
Skill(skill="rcode-review", args="${PHASE_NUMBER}")
```

Parse status from REVIEW.md frontmatter. If "clean" or "skipped": proceed to 3d. If findings found: auto-invoke:
```
Skill(skill="rcode-review-fix", args="${PHASE_NUMBER} --auto")
```

**Error handling:** If either Skill fails, catch the error, display as non-blocking, and proceed to 3d.

### 3d. Post-Execution Routing

**If `INTERACTIVE` is set:** Wait for the execute agent to complete before reading verification results.

After execute returns, read the verification result:

```bash
VERIFY_STATUS=$(grep "^status:" "${PHASE_DIR}"/*-VERIFICATION.md 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
```

**If VERIFY_STATUS is empty** (no VERIFICATION.md or no status field):

Go to handle_blocker: "Execute phase ${PHASE_NUMBER} did not produce verification results."

**If `passed`:**

Display:
```
Phase ${PHASE_NUMBER} ✓ ${PHASE_NAME} — Verification passed
```

Proceed to iterate step.

**If `human_needed`:**

Read the human_verification section from VERIFICATION.md to get the count and items requiring manual testing.

Display the items, then ask user via AskUserQuestion:
- **question:** "Phase ${PHASE_NUMBER} has items needing manual verification. Validate now or continue to next phase?"
- **options:** "Validate now" / "Continue without validation"

On **"Validate now"**: Present the specific items from VERIFICATION.md. After user reviews, ask:
- **question:** "Validation result?"
- **options:** "All good — continue" / "Found issues"

On "All good — continue": Display `Phase ${PHASE_NUMBER} ✓ Human validation passed` and proceed to iterate step.

On "Found issues": Go to handle_blocker with the user's reported issues as the description.

On **"Continue without validation"**: Display `Phase ${PHASE_NUMBER} ⏭ Human validation deferred` and proceed to iterate step.

**If `gaps_found`:**

Read gap summary from VERIFICATION.md (score and missing items). Display:
```
⚠ Phase ${PHASE_NUMBER}: ${PHASE_NAME} — Gaps Found
Score: {N}/{M} must-haves verified
```

**If `INTERACTIVE` is set:** Ask via AskUserQuestion:
- **question:** "Gaps found in phase ${PHASE_NUMBER}. How to proceed?"
- **options:** "Run gap closure" / "Continue without fixing" / "Stop autonomous mode"
- On "Stop": go to handle_blocker

**If `INTERACTIVE` is NOT set (default autonomous):** Auto-select "Run gap closure" — display `⚙ Phase ${PHASE_NUMBER}: auto-running gap closure` and proceed.

Execute gap closure cycle (limit: 1 attempt):

```
Skill(skill="rcode-plan", args="${PHASE_NUMBER} --gaps")
```

Verify gap plans were created. If none → go to handle_blocker: "Gap closure planning for phase ${PHASE_NUMBER} did not produce plans."

Re-execute:
```
Skill(skill="rcode-execute", args="${PHASE_NUMBER} --no-transition")
```

Re-read verification status. If `passed` or `human_needed`: route normally. If still `gaps_found` after this retry:
- **If `INTERACTIVE`:** ask "Continue anyway / Stop autonomous mode"
- **Otherwise:** display `⏭ Phase ${PHASE_NUMBER}: gaps persist after closure — continuing` and proceed to iterate step.

This limits gap closure to 1 automatic retry to prevent infinite loops.

### 3d.5. UI Review (Frontend Phases)

> Run after any successful execution routing (passed, human_needed accepted, or gaps deferred/accepted) — before proceeding to the iterate step.

```bash
UI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-SPEC.md 2>/dev/null | head -1)
UI_REVIEW_CFG=$(node .rcode/bin/rcode-tools.cjs config 2>/dev/null | grep -oE '"ui_review"[^,}]*' | grep -oE 'true|false' || echo "true")
```

**If `UI_SPEC_FILE` is not empty AND `UI_REVIEW_CFG` is not `false`:**

Display:

```
Phase ${PHASE_NUMBER}: Frontend phase with UI-SPEC — running UI review audit...
```

```
Skill(skill="rcode-ui-review", args="${PHASE_NUMBER}")
```

Display the review result summary (score from UI-REVIEW.md if produced). Continue to iterate step regardless of score — UI review is advisory, not blocking.

**Otherwise:** Skip silently to iterate step.

</step>

@rcode/workflows/autonomous-smart-discuss.md

Next: Read `.rcode/workflows/autonomous/steps/05-iterate.md` before starting it (skip it if its Read-when condition is false).
