# execute - step 03: Phase snapshot, blocking antipatterns, interactive mode, branching, validate phase, discover and group plans

This step file was split verbatim out of `workflows/execute.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

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

**"phase" or "milestone":** `init execute` does not return `branch_name` (see the "initialize" step's field notes above) — compute `BRANCH_NAME` from `workflow.branch_pattern` config (default `<phase>-<plan>-<slug>`) before running:
```bash
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
```

All subsequent commits go to this branch. User handles merging.
</step>

<step name="validate_phase">
From init JSON: `phase_dir` (real); `plan_count` derives as `plans.length`; `incomplete_count` has no source at this point (see the "initialize" step's field notes) — treat as unknown until `phase-plan-index` runs.

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

@.rcode/workflows/execute-waves.md

Next: Read `.rcode/workflows/execute/steps/04-wave-execution.md` before starting it (skip it if its Read-when condition is false).
