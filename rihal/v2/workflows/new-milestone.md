# Workflow: rihal:new-milestone

<purpose>
Initialize a fresh milestone cycle. Creates ROADMAP, STATE, and REQUIREMENTS artifacts in `.planning/` with baseline state, ready for phase planning. Milestone structure tracks phases, decisions, and completion status across a logical work boundary.
</purpose>

## Step 0 — Usage check

If `$ARGUMENTS` is empty or only `--help` or `-h`:

```
/rihal:new-milestone [milestone-name] [--dry-run]
```

**Examples:**
```
/rihal:new-milestone Auth System Overhaul
/rihal:new-milestone --dry-run Q2 Platform Improvements
```

STOP — do not proceed. Only continue when user provides milestone name or approves default.

## Step 1 — Parse arguments

Extract from `$ARGUMENTS`:
- `$MILESTONE_NAME` — the milestone name (e.g., "Auth System Overhaul")
- `--dry-run` flag → if set, show what would be created without writing files

If `$MILESTONE_NAME` is empty, ask:

```
AskUserQuestion(
  header: "New Milestone",
  question: "Give this milestone a name (e.g., 'Q2 Platform Upgrades')",
  followUp: null
)
```

## Step 2 — Create milestone directory structure

Verify `.planning/milestones/` exists. If not:

```bash
mkdir -p .planning/milestones
```

Create milestone-specific directory:

```bash
MILESTONE_DIR=".planning/milestones/$(date +%Y%m%d)-$(echo $MILESTONE_NAME | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"
mkdir -p "$MILESTONE_DIR"
```

Create subdirectories:

```bash
mkdir -p "$MILESTONE_DIR/phases"
mkdir -p "$MILESTONE_DIR/artifacts"
```

## Step 3 — Create ROADMAP.md

Create `$MILESTONE_DIR/ROADMAP.md`:

```markdown
# Milestone: {MILESTONE_NAME}

**Started:** ISO-DATE
**Status:** PLANNING

## Goals

_Add 3-5 measurable goals for this milestone._

- Goal 1: ...
- Goal 2: ...
- Goal 3: ...

## Phases

| # | Name | Status | Owner | Completion |
|---|------|--------|-------|------------|
| 1 | TBD  | PLAN   | —     | —%         |

## Success Criteria

_What does done look like?_

- Criterion 1
- Criterion 2

## Kill Criteria

_What evidence stops this milestone?_

- Kill condition 1
- Kill condition 2
```

## Step 4 — Create STATE.md

Create `$MILESTONE_DIR/STATE.md`:

```markdown
# Milestone State: {MILESTONE_NAME}

**Last Updated:** ISO-DATE
**Phase:** PLANNING

## Decisions Made

None yet.

## Blockers

None.

## Active Workstreams

None yet.

## Quick Tasks Completed

None yet.
```

## Step 5 — Create REQUIREMENTS.md

Create `$MILESTONE_DIR/REQUIREMENTS.md`:

```markdown
# Requirements: {MILESTONE_NAME}

**Updated:** ISO-DATE

## User Stories

None yet. Add via `/rihal:plan <story>` or `/rihal:quick <task>`.

## Technical Specs

None yet.

## Acceptance Criteria

None yet.

## Out of Scope

None defined yet.
```

## Step 6 — Report

If `--dry-run` was set:

```
Dry run — files would be created at:
  {MILESTONE_DIR}/ROADMAP.md
  {MILESTONE_DIR}/STATE.md
  {MILESTONE_DIR}/REQUIREMENTS.md
```

Otherwise, print:

```
✓ Milestone created: {MILESTONE_NAME}
  Location: {MILESTONE_DIR}
  
Next steps:
  /rihal:plan <phase 1 description>
  /rihal:council is this milestone strategic?
```

## Success Criteria

- ROADMAP, STATE, and REQUIREMENTS files created
- Milestone directory structure exists
- User can see the full path and begin planning

## On Error

If directory creation fails (permissions):

```
⚠ Could not create milestone directory. Check permissions:
  {MILESTONE_DIR}
```
