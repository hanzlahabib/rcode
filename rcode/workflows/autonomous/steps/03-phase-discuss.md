# autonomous - step 03: Execute phase: header and smart discuss (3a)

This step file was split verbatim out of `workflows/autonomous.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<step name="execute_phase">

## 3. Execute Phase

**Before displaying the banner, re-derive T from disk** (compaction guard — same
logic as iterate step 4.0):

```bash
PROGRESS_REFRESH=$(node .rcode/bin/rcode-tools.cjs progress init 2>/dev/null)
```

Update `phase_count` and `completed_phases` from the refresh. This ensures
the banner always shows the correct total, even after context compaction.

For the current phase, display the progress banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► AUTONOMOUS ▸ Phase {N}/{T}: {Name} [████░░░░] {P}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Where N = current phase number (from the ROADMAP, e.g., 63), T = total milestone phases (from `phase_count` parsed in initialize step, e.g., 67). **Important:** T must be `phase_count` (the total number of phases in this milestone), NOT the count of remaining/incomplete phases. P = percentage of all milestone phases completed so far — (number of phases with SUMMARY.md / T × 100). Use █ for filled and ░ for empty segments in the progress bar (8 characters wide).

**Alternative display when phase numbers exceed total** (multi-milestone projects where phases are numbered globally): If N > T, use the format `Phase {N} ({position}/{T})` where `position` is the 1-based index among incomplete phases being processed. This prevents confusing displays like "Phase 63/5".

### 3a. Smart Discuss

Check if CONTEXT.md already exists for this phase:

```bash
PHASE_SLUG="<zero-padded-phase-number>-<phase-slug>"
PHASE_DIR=".planning/phases/${PHASE_SLUG}"
HAS_CONTEXT=$([ -f "${PHASE_DIR}/${PADDED_PHASE}-CONTEXT.md" ] || [ -f "${PHASE_DIR}/CONTEXT.md" ] && echo true || echo false)
```

**If has_context is true:** Skip discuss — context already gathered. Display:

```
Phase ${PHASE_NUMBER}: Context exists — skipping discuss.
```

Proceed to 3b.

**If has_context is false:** Check if discuss is disabled via settings:

```bash
SKIP_DISCUSS=$(node .rcode/bin/rcode-tools.cjs config 2>/dev/null | grep -oE '"skip_discuss"[^,}]*' | grep -oE 'true|false' || echo "false")
```

**If SKIP_DISCUSS is `true`:** Skip discuss entirely — the ROADMAP phase description is the spec. Display:

```
Phase ${PHASE_NUMBER}: Discuss skipped (workflow.skip_discuss=true) — using ROADMAP phase goal as spec.
```

Write a minimal CONTEXT.md so downstream plan-phase has valid input. Extract `goal` and `requirements` from ROADMAP.md for this phase. Write `${PHASE_DIR}/${PADDED_PHASE}-CONTEXT.md` with:

```markdown
# Phase {PHASE_NUMBER}: {Phase Name} - Context

**Gathered:** {date}
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

{goal from ROADMAP phase description}

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

</decisions>

<canonical_refs>
## Canonical References

No external specs pre-gathered — discuss phase skipped. Planner will extract canonical refs from ROADMAP.md during research.

</canonical_refs>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — discuss phase skipped. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
```

Commit the minimal context (guarded for gitignored `.planning/`):

```bash
git add "${PHASE_DIR}/${PADDED_PHASE}-CONTEXT.md" 2>/dev/null \
  && git commit -m "docs(${PADDED_PHASE}): auto-generated context (discuss skipped)" 2>/dev/null \
  || echo "ℹ .planning/ gitignored — context written, not committed"
```

Proceed to 3b.

**If SKIP_DISCUSS is `false` (or unset):**

**IMPORTANT — Discuss must be single-pass in autonomous mode.**
The discuss step in autonomous mode MUST NOT loop. If CONTEXT.md already exists after discuss completes, do NOT re-invoke discuss for the same phase. The has_context check below is authoritative.

**If `INTERACTIVE` is set:** Run the standard discuss-phase skill inline (asks interactive questions, waits for user answers):

```
Skill(skill="rcode-discuss-phase", args="${PHASE_NUMBER}")
```

**If `INTERACTIVE` is NOT set:** Execute the smart_discuss step for this phase (batch table proposals, auto-optimized — see smart_discuss step below).

After discuss completes (either mode), verify context was written by checking for CONTEXT.md. If not present → go to handle_blocker: "Discuss for phase ${PHASE_NUMBER} did not produce CONTEXT.md."

Next: Read `.rcode/workflows/autonomous/steps/04-phase-plan-execute.md` before starting it (skip it if its Read-when condition is false).
