# Workflow: rcode-audit-milestone

<purpose>
Cross-phase audit of milestone completion. Reads all SUMMARY.md files from completed phases, compares their outcomes to the original ROADMAP goals, flags gaps, and generates an audit report showing completion percentage and decision traceability.
</purpose>

## Step 0 — Parse arguments

Parse `$ARGUMENTS`:
- `--help` or `-h` → print usage and stop:
  ```
  /rcode-audit-milestone [<unverified-count>] [--fix-drift] [--strict] [--report]
  ```
- A bare integer (e.g. `28`) → `HINT_UNVERIFIED_COUNT = 28` (pre-computed by rcode-status for display; use as expected minimum in the scan)
- `--fix-drift` → `FIX_DRIFT = true` (after audit, suggest the drift sync command)
- `--strict` → `STRICT = true`
- `--report` → `WRITE_REPORT = true`

If `HINT_UNVERIFIED_COUNT` is set, print at the top of the audit output:
```
ℹ Expecting ~{HINT_UNVERIFIED_COUNT} phases to verify (from rcode-status)
```

## Step 1 — Locate milestone context

Determine the active milestone. Check:

1. Is there a `.planning/current-milestone.txt` file?
2. If not, find the most recent directory in `.planning/milestones/`

If neither exists:

```
⚠ No active milestone found. Start a new one:

/rcode-new-milestone <name>
```

STOP.

Store path as `$MILESTONE_DIR`.

## Step 2 — Load original goals

Read `$MILESTONE_DIR/ROADMAP.md` and extract the Goals section.

Parse into array `$ORIGINAL_GOALS` (just the text of each goal).

## Step 3 — Scan all phases

List all directories in `$MILESTONE_DIR/phases/` and find every SUMMARY.md file.

For each SUMMARY.md:
- Extract the phase name (from the phase directory name or filename)
- Extract the "Outcomes" or "Summary" section
- Extract "Decisions Made" section if present
- Store in array `$PHASE_SUMMARIES`

## Step 4 — Audit completeness

For each `$ORIGINAL_GOALS`:

1. Search all phase SUMMARY.md files for text matching the goal
2. If found, mark as ✓ COMPLETED
3. If partially addressed, mark as ◐ PARTIAL
4. If not addressed, mark as ✗ NOT ADDRESSED

Create audit report showing coverage percentage:

```
Goal Coverage:
  ✓ Goal 1: COMPLETED
  ◐ Goal 2: PARTIAL (addressed in Phase 2, not Phase 3)
  ✗ Goal 3: NOT ADDRESSED

Coverage: 67% (2/3 goals fully addressed)
```

## Step 5 — Check for scope creep

Count total phases and compare to original phase count in ROADMAP. If actual > planned:

```
⚠ Scope creep: Planned {planned} phases, executed {actual}. Review ROADMAP updates.
```

## Step 6 — Trace decisions

If `--strict` flag set:

- For each decision in any SUMMARY.md, verify it's documented in STATE.md under "Decisions Made"
- Flag undocumented decisions

```
Decision Traceability (--strict mode):
  ✓ Decision in Phase 1 documented in STATE
  ⚠ Decision in Phase 2 NOT in STATE.md
```

## Step 7 — Generate report

Create `.planning/audit-{TIMESTAMP}.md`:

```markdown
# Audit Report: {MILESTONE_NAME}

**Date:** ISO-DATE
**Milestone:** {MILESTONE_DIR}

## Executive Summary

{coverage_percentage}% of original goals completed.

## Goal Coverage

{detailed goal audit}

## Scope

- Planned phases: {count}
- Executed phases: {count}
- Variance: {+/- count}

## Decision Traceability

{decision_audit, if --strict}

## Recommendations

[Auto-generated based on gaps]
```

If `--report` flag set, also print the report to stdout. Otherwise, just save to file.

## Success Criteria

- Audit report created with goal coverage assessment
- All phases scanned for outcomes
- Original goals compared to actual outcomes
- Report saved to `.planning/audit-*.md`

## On Error

If no SUMMARY.md files found, **do not dead-halt**. Probe
for executed-phase signals and offer recovery options:

```bash
PLANS=$(find "$MILESTONE_DIR" \( -name PLAN.md -o -name '*-SPRINT.md' \) 2>/dev/null | wc -l)
GIT_FEAT=$(git log --oneline --grep='^feat' 2>/dev/null | wc -l)
APPS=$(ls -d apps packages src 2>/dev/null | wc -l)
```

If `PLANS > 0` AND (`GIT_FEAT > 0` OR `APPS > 0`):

```
⚠ {PLANS} phases planned, 0 SUMMARY.md, {GIT_FEAT} feat commits, code present.
  Phases were executed but never formally closed.

  Options:
    1. Synthesize SUMMARY.md per phase from SPRINT.md + git log [recommended]
       (groups commits by phase tag like "feat(03-1):", writes a
        first-pass SUMMARY.md the user can edit)
    2. Run /rcode-verify-phase NN per phase (manual close path)
    3. Continue audit anyway (only assesses what is documented — likely
       reports 0% goal coverage)
    0. Cancel
```

In `mode: yolo` (read via `node .rcode/bin/rcode-tools.cjs config-get
mode`), auto-pick option 1. In guided mode, ask. STOP after the user
picks 0 or 2; resume audit at Step 4 after option 1 completes.

If `PLANS == 0`:

```
⚠ No phase summaries and no plans found. Have phases been executed?
  Check: {MILESTONE_DIR}/phases/
  Start one: /rcode-plan
```

STOP.

If ROADMAP missing:

```
⚠ ROADMAP.md missing. Cannot audit without original goals.
  Create one: /rcode-new-milestone
```

## Next Up

- `/rcode-plan-milestone-gaps` — create fix phases for every gap the audit found
- `/rcode-complete-milestone` — mark milestone complete when all gaps are resolved
