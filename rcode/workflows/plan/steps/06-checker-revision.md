# plan - step 06: Spawn rcode-sprint-checker, handle checker return, revision loop, wave file-overlap check

This step file was split verbatim out of `workflows/plan.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

## 10. Spawn rcode-sprint-checker Agent

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► VERIFYING PLANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning plan checker...
```

Checker prompt:

```markdown
<verification_context>
**Phase:** {phase_number}
**Phase Goal:** {goal from ROADMAP}

<files_to_read>
- {PHASE_DIR}/*-SPRINT.md (Plans to verify)
- {roadmap_path} (Roadmap)
- {requirements_path} (Requirements)
- {context_path} (USER DECISIONS from /rcode-discuss-phase)
- {research_path} (Technical Research — includes Validation Architecture)
</files_to_read>

{agent_skills.checker}

**Phase requirement IDs (MUST ALL be covered):** {phase_req_ids}

**Project instructions:** Read ./CLAUDE.md if exists — verify plans honor project guidelines
**Project skills:** Check .claude/skills/ or .agents/skills/ directory (if either exists) — verify plans account for project skill rules
</verification_context>

<expected_output>
- ## VERIFICATION PASSED — all checks pass
- ## ISSUES FOUND — structured issue list
</expected_output>
```

```
Task(
  prompt=checker_prompt,
  subagent_type="rcode-sprint-checker",
  model="{checker_model}",
  description="Verify Phase {phase} plans"
)
```

## 11. Handle Checker Return

- **`## VERIFICATION PASSED`:** Display confirmation, proceed to step 13.
- **`## ISSUES FOUND`:** Display issues, check iteration count, proceed to step 12.

**Thinking partner for architectural tradeoffs (default ON in guided mode, OFF in yolo/autonomous):**
```bash
THINKING_PARTNER_CONFIG=$(node ".rcode/bin/rcode-tools.cjs" config-get features.thinking_partner 2>/dev/null || echo "")
if [ -n "$THINKING_PARTNER_CONFIG" ]; then
  THINKING_PARTNER_ENABLED="$THINKING_PARTNER_CONFIG"
elif [ "$MODE" = "yolo" ] || [ -n "$AUTONOMOUS" ]; then
  THINKING_PARTNER_ENABLED="false"
else
  THINKING_PARTNER_ENABLED="true"
fi
```
${THINKING_PARTNER_ENABLED === 'true' ? '@.rcode/references/plan-thinking-partner.md' : ''}
If `THINKING_PARTNER_ENABLED` is `false`: skip this block entirely. An explicit
`features.thinking_partner` in config.yaml always wins over the mode-based
default (set it `false` to silence even in guided mode, or `true` to keep it
on during autonomous runs if you want that). The check itself is cheap — a
keyword scan over the checker's existing issues, not a new agent spawn —
which is why it defaults on for guided/interactive planning: a second-opinion
sanity check on architectural tradeoffs is exactly the kind of thing "does
this actually get built right" needs, and it only activates when the checker
already flagged a tradeoff-shaped issue.

## 12. Revision Loop (Max 3 Iterations, 1 in autonomous/yolo mode)

**Mode-based iteration cap (token cost protection):**

```bash
MAX_ITERATIONS=$($TOOL config-get workflow.max_checker_iterations 2>/dev/null || echo "")
if [ -z "$MAX_ITERATIONS" ]; then
  # Default: 1 in yolo/autonomous, 3 in guided
  [ "$MODE" = "yolo" ] || [ -n "$AUTONOMOUS" ] && MAX_ITERATIONS=1 || MAX_ITERATIONS=3
fi
```

Track `iteration_count` (starts at 1 after initial plan + check).
Track `prev_issue_count` (initialized to `Infinity` before the loop begins).
Track `stall_reentry_count` (starts at 0; incremented each time "Adjust approach" re-enters step 8).

**If iteration_count < MAX_ITERATIONS:**

**Sprint-checker malfunction guard (BLOCKER-class):**

Before parsing issues, verify the checker actually invoked tools. The checker MUST exhibit at least one of these evidence markers in its return:

- A YAML `issues:` block (even an empty one — `issues: []`)
- A YAML `verified_files:` block listing files it read
- At least one `path:` field in any block (e.g. `path: src/components/Foo.tsx:42`)
- A summary line of the form `Verified N of M files` or `Checked N symbols`

If NONE of these evidence markers are present, the checker malfunctioned (returned narrative without invoking tools). BLOCK execution:

```
Display: "Sprint-checker returned without evidence of tool use — likely
         malfunctioned (returned narrative without tool use). Refusing to advance the plan
         on unverified output. Re-run /rcode-plan or inspect the agent."
Halt the workflow with a non-zero exit signal.
```

Do NOT treat empty / narrative-only checker output as "plan approved". An empty checker output is a malfunction, not a pass.

Parse issue count from checker return: count BLOCKER + WARNING entries in the YAML issues block (structured output from rcode-sprint-checker). If the checker's return contains a populated YAML issues block with `issues: []` (i.e., the plan was approved with no issues AFTER actual checking), treat `issue_count` as 0 and skip the stall check — the plan passed. Proceed to step 13.

Display: `Revision iteration {N}/3 -- {blocker_count} blockers, {warning_count} warnings`

**Stall detection:** If `issue_count >= prev_issue_count`:
  Display: `Revision loop stalled — issue count not decreasing ({issue_count} issues remain after {N} iterations)`

  **If `stall_reentry_count < 2`:**
    Ask user:
      Question: "Issues remain after {N} revision attempts with no progress. Proceed with current output?"
      Options: "Proceed anyway" | "Adjust approach"
    If "Proceed anyway": accept current plans and continue to step 13.
    If "Adjust approach": increment `stall_reentry_count`, open freeform discussion, then re-enter step 8 (full replanning). Note: re-entry resets `iteration_count` and `prev_issue_count` but `stall_reentry_count` persists across re-entries and is capped at 2.

  **If `stall_reentry_count >= 2`:**
    Display: `Stall persists after 2 re-planning attempts. The following issues could not be resolved automatically:`
    List the remaining issues from the checker.
    Suggest: "Consider resolving these issues manually or running `/rcode-debug` to investigate root causes."
    Options: "Proceed anyway" | "Abandon"
    If "Proceed anyway": accept current plans and continue to step 13.
    If "Abandon": stop workflow.

Set `prev_issue_count = issue_count`.

Revision prompt:

```markdown
<revision_context>
**Phase:** {phase_number}
**Mode:** revision

<files_to_read>
- {PHASE_DIR}/*-SPRINT.md (Existing plans)
- {context_path} (USER DECISIONS from /rcode-discuss-phase)
</files_to_read>

{agent_skills.planner}

**Checker issues:** {structured_issues_from_checker}
</revision_context>

<instructions>
Make targeted updates to address checker issues.
Do NOT replan from scratch unless issues are fundamental.
Return what changed.
</instructions>
```

```
Task(
  prompt=revision_prompt,
  subagent_type="rcode-planner",
  model="{planner_model}",
  description="Revise Phase {phase} plans"
)
```

After planner returns, checkpoint the revision before spawning the checker
again (same rationale as step 9.4 — each iteration through this loop can
itself involve a full specialist re-review, so commit what the planner just
wrote rather than letting N iterations of uncommitted rewrites accumulate
behind one crash-vulnerable window):

```bash
if [ "${commit_docs}" = "true" ]; then
  git add ${PHASE_DIR}/*-SPRINT.md
  git commit -m "docs(phase-${PHASE_NUMBER}): plan revision ${iteration_count} — checker/panel feedback addressed"
fi
```

Then spawn checker again (step 10), increment iteration_count.

**If iteration_count >= 3:**

Display: `Max iterations reached. {N} issues remain:` + issue list

Offer: 1) Force proceed, 2) Provide guidance and retry, 3) Abandon

## 12.5. Wave Parallelism File-Overlap Check

Before declaring plans ready, validate the wave-parallelism rule the planner declares: **same wave + overlapping `files_modified` = sequential, not parallel**. If two plans share `depends_on` (same wave) and both list the same file in `files_modified`, the planner should have marked the later one `sequential: true`. Catch the cases where it didn't.

```bash
# Skip if plan_count == 1 (from INIT JSON): with exactly one plan in the phase,
# there is no second plan to overlap with — a conflict is structurally impossible.
if [[ "${plan_count}" -eq 1 ]]; then
  echo "Wave parallelism: skipped (single plan, overlap structurally impossible)."
else
  # For every pair of plans (A, B) with the same depends_on, if files_modified(A)
  # ∩ files_modified(B) is non-empty, the later plan (by sprint id) MUST declare
  # sequential: true and list the conflicting files in its frontmatter.
  node ".rcode/bin/rcode-tools.cjs" plan check-wave-overlaps "${PHASE_NUMBER}"
fi
```
Returns (else branch only):
```json
{
  "conflicts": [
    {
      "wave": 2,
      "plan_a": "96.2",
      "plan_b": "96.3",
      "shared_files": ["src/components/LeadDetailPanel.tsx", "src/styles/inbox.css"],
      "plan_b_sequential": false
    }
  ]
}
```

**If `conflicts` is non-empty:**

1. For each conflict, edit the later plan's SPRINT.md frontmatter to add:
   ```yaml
   sequential: true
   sequential_after: <plan_a id>
   conflicting_files: [<shared_files...>]
   ```
2. Recompute waves: the formerly-parallel plan now depends on the earlier one, so its wave is `max(waves of dependencies) + 1`.
3. Re-run the checker to confirm the updated frontmatter.
4. Display: `Wave parallelism: {N} conflict(s) auto-corrected to sequential.`

**If `conflicts` is empty:** Display `Wave parallelism: ✓ no file-overlap conflicts.` and proceed. (This closes the wave-overlap gap — the rule was stated in `rcode-planner.md` but not enforced until now.)

Next: Read `.rcode/workflows/plan/steps/07-coverage-status.md` before starting it (skip it if its Read-when condition is false).
