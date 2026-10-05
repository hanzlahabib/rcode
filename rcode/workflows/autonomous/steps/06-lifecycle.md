# autonomous - step 06: Lifecycle: audit, complete milestone, cleanup, final completion

This step file was split verbatim out of `workflows/autonomous.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<step name="lifecycle">

## 5. Lifecycle

**If `ONLY_PHASE` is set:** Skip lifecycle. Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► AUTONOMOUS ▸ PHASE ${ONLY_PHASE} COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Phase ${ONLY_PHASE}: ${PHASE_NAME} — Done
 Mode: Single phase (--only)

 Lifecycle skipped — run /rcode-autonomous without --only
 after all phases complete to trigger audit/complete/cleanup.
```

Exit cleanly.

**Otherwise:** After all phases complete, run the milestone lifecycle sequence: audit → complete → cleanup.

Display lifecycle transition banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► AUTONOMOUS ▸ LIFECYCLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 All phases complete → Starting lifecycle: audit → complete → cleanup
 Milestone: {milestone_version} — {milestone_name}
```

### 5a. Audit

```
Skill(skill="rcode-audit-milestone")
```

After audit completes, detect the result:

```bash
AUDIT_FILE=".planning/v${milestone_version}-MILESTONE-AUDIT.md"
[ -f "$AUDIT_FILE" ] || AUDIT_FILE=".planning/MILESTONE-AUDIT.md"
AUDIT_STATUS=$(grep "^status:" "${AUDIT_FILE}" 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
```

**If AUDIT_STATUS is empty:** Go to handle_blocker: "Audit did not produce results — audit file missing or malformed."

**If `passed`:**

```
Audit ✓ passed — proceeding to complete milestone
```

Proceed to 5b.

**If `gaps_found`:**

Read the gaps summary from the audit file. Display:
```
⚠ Audit: Gaps Found
```

**If `INTERACTIVE`:** Ask via AskUserQuestion:
- **question:** "Milestone audit found gaps. How to proceed?"
- **options:** "Continue anyway — accept gaps" / "Stop — fix gaps manually"
- On "Stop": Go to handle_blocker.

**Otherwise (autonomous):** Display the gaps summary inline (not just a reference to the audit file), then display `Audit ⏭ Gaps accepted — continuing`, set `AUDIT_HAD_GAPS="true"`, and proceed to 5b.

**If `tech_debt`:**

Show the summary, then:

**If `INTERACTIVE`:** Ask via AskUserQuestion:
- **options:** "Continue with tech debt" / "Stop — address debt first"
- On "Stop": Go to handle_blocker.

**Otherwise (autonomous):** Display the tech debt summary inline (not just a reference to the audit file), then display `Tech debt noted — continuing`, set `AUDIT_HAD_GAPS="true"`, and proceed to 5b.

### 5b. Complete Milestone

**If `AUDIT_HAD_GAPS` is set:** Display before invoking the skill:

```
⚠ Marking milestone complete with known gaps/tech debt (see summary above).
```

```
Skill(skill="rcode-complete-milestone", args="${milestone_version}")
```

After complete-milestone returns, verify archive output:

```bash
ls .planning/milestones/v${milestone_version}-ROADMAP.md 2>/dev/null || true
```

If the archive file does not exist, go to handle_blocker: "Complete milestone did not produce expected archive files."

### 5c. Cleanup

```
Skill(skill="rcode-cleanup")
```

Cleanup shows its own dry-run and asks user for approval internally — this is an acceptable pause since it's an explicit decision about file deletion.

### 5d. Final Completion

**If `AUDIT_HAD_GAPS` is NOT set:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► AUTONOMOUS ▸ COMPLETE 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Milestone: {milestone_version} — {milestone_name}
 Status: Complete ✓
 Lifecycle: audit ✓ → complete ✓ → cleanup ✓

 Ship it! 🚀
```

**If `AUDIT_HAD_GAPS` is set:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► AUTONOMOUS ▸ COMPLETE — WITH KNOWN GAPS ⚠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Milestone: {milestone_version} — {milestone_name}
 Status: NOT audit-clean — gaps/tech debt accepted, not verified passed
 Lifecycle: audit ⚠ → complete ✓ → cleanup ✓

 This is not the same as "shippable." Review the gaps summary above and
 resolve or explicitly accept each item before treating this as done.
```

**If autonomous created a branch** (i.e., `BRANCH_NAME` was set in the prepare_branch step):

Display:

```
🔀 Branch: ${BRANCH_NAME}
   All work is on this branch. When ready, merge to main:
     git checkout main && git merge ${BRANCH_NAME}
   Or create a PR for review.
```

</step>

Next: Read `.rcode/workflows/autonomous/steps/07-blocker-success.md` before starting it (skip it if its Read-when condition is false).
