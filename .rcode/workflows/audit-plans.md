# Workflow: rcode-audit plans

<purpose>
Forward-looking planning integrity audit. Reads every SPRINT.md, ROADMAP.md,
REQUIREMENTS.md, and STATE.md in the current milestone and checks for:
  1. Structural completeness  — phases with no sprints, sprints with no tasks, tasks missing must_haves
  2. Status consistency       — STATE.md current pointers vs actual sprint/phase status
  3. Dependency integrity     — depends_on and requirements references that don't resolve
  4. Next action recommendation — one concrete /rihal-* command to run next

Unlike /rihal-audit-milestone (backward-looking), this audit is forward-looking:
it checks *planned* items before they are executed.
</purpose>

## Step 0 — Usage check

If `$ARGUMENTS` contains `--help` or `-h`:

```
/rihal-audit plans [--report] [--strict]
```

**Examples:**
```
/rihal-audit plans
/rihal-audit plans --report
/rihal-audit plans --strict
```

STOP — do not proceed.

## Step 1 — Locate planning root

```bash
PLANNING=".planning"
ROADMAP="$PLANNING/ROADMAP.md"
STATE="$PLANNING/STATE.md"
REQS="$PLANNING/REQUIREMENTS.md"
PHASES_DIR="$PLANNING/phases"
```

If `$PLANNING` does not exist:
```
⚠ No .planning/ directory found.
  Run /rihal-new-milestone to start a milestone.
```
STOP.

If `$ROADMAP` does not exist:
```
⚠ No ROADMAP.md found at $ROADMAP.
  Run /rihal-new-milestone to define goals.
```
STOP.

## Step 2 — Collect all sprint files

```bash
SPRINT_FILES=$(find "$PHASES_DIR" -name "*-SPRINT.md" | sort)
PHASE_DIRS=$(find "$PHASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort)
SPRINT_COUNT=$(echo "$SPRINT_FILES" | grep -c . || echo 0)
PHASE_COUNT=$(echo "$PHASE_DIRS" | grep -c . || echo 0)
```

Read STATE.md and extract:
- `current_phase` — the phase ID listed as current
- `current_sprint` — the sprint ID listed as current (if any)
- `milestone` — the active milestone name

Read ROADMAP.md and extract every numbered phase entry (lines like `## Phase NN` or
table rows with phase IDs). Store as `$ROADMAP_PHASES`.

Read REQUIREMENTS.md (if it exists) and extract every requirement ID
(e.g. `HIST-1`, `AUTH-3`) from headings or definition lines. Store as `$KNOWN_REQS`.

## Step 3 — Run checks

Initialize counters: `ERRORS=0`, `WARNINGS=0`. Build a findings array.

### Check A — Structural completeness

**A1. Phase directories with no sprint file**

For each directory in `$PHASE_DIRS`:
- If `find "$phase_dir" -name "*-SPRINT.md" | wc -l` returns 0
- AND no SUMMARY.md exists in that directory (i.e. not yet completed)
- → WARN: `Phase {phase_id} has no SPRINT.md — run /rihal-plan to create one`

**A2. Sprint files with no tasks**

For each file in `$SPRINT_FILES`:
- Read the file and check if a `<tasks>` block exists
- If `<tasks>` block is empty (no `<task` entries inside it)
- → WARN: `Sprint {sprint_id} has no tasks — run /rihal-sprint-planning to add stories`

**A3. Tasks missing must_haves / acceptance criteria**

For each sprint file:
- Parse the YAML frontmatter block (`---` ... `---`)
- Check if `must_haves` key is present and non-empty
- If missing or empty AND the sprint status is not `completed`
- → WARN: `Sprint {sprint_id} missing must_haves — add acceptance criteria before executing`

**A4. ROADMAP phases with no matching directory**

For each phase ID in `$ROADMAP_PHASES`:
- Check if a directory matching that ID exists in `$PHASES_DIR`
- If not, and the phase is not marked as skipped/cancelled in ROADMAP
- → ERROR: `ROADMAP lists Phase {id} but no directory exists — run /rihal-add-phase {id}`

### Check B — Status consistency

**B1. STATE.md current_phase points to a non-existent or completed phase**

Read `current_phase` from STATE.md.

If the phase directory does not exist:
- → ERROR: `STATE.md current_phase={id} but that phase directory does not exist`

If a SUMMARY.md exists in that phase directory (meaning it was completed and closed):
- → WARN: `STATE.md current_phase={id} is already completed (has SUMMARY.md) — run /rihal-next to advance`

**B2. STATE.md current_sprint points to a sprint where all tasks are done**

If STATE.md has a `current_sprint` value:
- Find the matching SPRINT.md file
- Count tasks with `status: done` vs total tasks
- If all tasks are done and sprint status is not `completed`
- → WARN: `Sprint {sprint_id} all tasks done but not closed — run /rihal-verify-phase to close it`

**B3. Phase directories with a SUMMARY.md but no entry in ROADMAP as completed**

For each phase in `$PHASE_DIRS`:
- If SUMMARY.md exists, the phase is done
- Check that ROADMAP.md reflects this (status column or checkmark)
- If ROADMAP still shows it as active/planned
- → WARN: `Phase {id} has SUMMARY.md (complete) but ROADMAP shows it as active — update ROADMAP`

### Check C — Dependency integrity

**C1. depends_on references non-existent sprint**

For each sprint file:
- Read the `depends_on` list from the YAML frontmatter
- For each entry in `depends_on`, check if a SPRINT.md with that phase/sprint ID exists
- If not found
- → ERROR: `Sprint {sprint_id} depends_on {missing_id} which does not exist`

**C2. requirements references unknown requirement ID**

For each sprint file:
- Read the `requirements` list from YAML frontmatter
- For each requirement ID, check if it appears in `$KNOWN_REQS` (from REQUIREMENTS.md)
- If REQUIREMENTS.md exists but the ID is missing
- → WARN: `Sprint {sprint_id} references unknown requirement {req_id} — add it to REQUIREMENTS.md`

**C3. Wave ordering: sprint with depends_on in a later wave**

For each sprint file:
- Read `wave` and `depends_on` from YAML frontmatter
- For each dependency, find the wave of the dependency sprint
- If dependency wave >= current sprint's wave
- → ERROR: `Sprint {sprint_id} (wave {w}) depends on {dep_id} (wave {dw}) — circular or forward dependency`

## Step 4 — Build findings report

Format all findings into severity groups:

```
rcode ► AUDIT PLANS

Scanned: {PHASE_COUNT} phases, {SPRINT_COUNT} sprints
Milestone: {milestone}

━━━ ERRORS ({error_count}) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{each ERROR finding, prefixed with ✗}

━━━ WARNINGS ({warning_count}) ━━━━━━━━━━━━━━━━━━━━━━━━━━━
{each WARNING finding, prefixed with ⚠}

━━━ CLEAN ({clean_count}) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{each passing check, prefixed with ✓}

━━━ NEXT ACTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{recommendation — see Step 5}
```

If zero errors and zero warnings:
```
✓ All planning checks passed. Plans are coherent and ready to execute.
```

## Step 5 — Recommend next action

Pick exactly ONE recommended next command based on highest-priority finding:

| Condition (checked in order) | Recommendation |
|---|---|
| Any ERROR from Check C (dependency) | `/rihal-plan` — fix dependency before executing |
| Any ERROR from Check A4 (ROADMAP phase missing) | `/rihal-add-phase {id}` — create the missing phase |
| Any WARN from B1 (current_phase completed) | `/rihal-next` — advance to the next phase |
| Any WARN from B2 (sprint all-done not closed) | `/rihal-verify-phase` — close the current sprint |
| Any WARN from A1 (phase with no sprint) | `/rihal-plan` — create sprint plan for the earliest unplanned phase |
| Any WARN from A2 (sprint no tasks) | `/rihal-sprint-planning {sprint_id}` — groom the empty sprint |
| Any WARN from A3 (missing must_haves) | `/rihal-create-story` — add acceptance criteria |
| Any WARN from C2 (unknown requirement) | edit `REQUIREMENTS.md` — define the missing requirement |
| No findings | `/rihal-execute` — plans are clean, execute the next sprint |

Print as:
```
► Recommended next step:
  {command}
  {one-line reason}
```

## Step 6 — Save report (if --report flag)

If `--report` is in `$ARGUMENTS`, write findings to:
```
.planning/audit-plans-{YYYY-MM-DD}.md
```

Format:
```markdown
# Plan Audit — {milestone}

**Date:** {ISO-DATE}
**Phases scanned:** {count}
**Sprints scanned:** {count}
**Errors:** {count}
**Warnings:** {count}

## Findings

{all findings with severity}

## Next Action

{recommendation}
```

## Success Criteria

- [ ] Runs without modification on any project with `.planning/` + ROADMAP.md
- [ ] Zero false positives on phases that have SUMMARY.md (already completed)
- [ ] Dependency check correctly resolves phase/sprint IDs from file paths
- [ ] Exactly one "next action" command printed at end
- [ ] `--report` writes a dated file under `.planning/`

## On Error

- `.planning/` missing → prompt to run `/rihal-new-milestone`
- ROADMAP.md missing → prompt to run `/rihal-new-milestone`
- No sprint files found → report as WARNING and recommend `/rihal-plan`
- REQUIREMENTS.md missing → skip C2 check silently (not all projects use it)
