# Workflow: rihal:complete-milestone

<purpose>
Archive and reset the current milestone. Moves completed planning directory to milestone-archive/, creates a final summary, and clears `.planning/` for the next milestone cycle. This is the formal close-out step.
</purpose>

## Step 0 — Usage check

If `$ARGUMENTS` contains only `--help` or `-h`:

```
/rihal:complete-milestone [--archive-path=PATH]
```

**Examples:**
```
/rihal:complete-milestone
/rihal:complete-milestone --archive-path=backlog/milestones
```

STOP — do not proceed.

## Step 1 — Locate current milestone

Check `.planning/current-milestone.txt` for the active milestone name.

If missing, find the most recent in `.planning/milestones/`.

Store as `$MILESTONE_DIR` and `$MILESTONE_NAME`.

If no milestone found:

```
⚠ No active milestone. Nothing to complete.
```

STOP.

## Step 2 — Verify milestone is ready to archive

Check that `$MILESTONE_DIR` contains at least:
- ROADMAP.md
- STATE.md
- REQUIREMENTS.md

If not, warn:

```
⚠ Incomplete milestone. Missing key files. Archive anyway? (y/N)

AskUserQuestion(header: "Confirm", question: "Proceed with archival?")
```

If user says no, STOP.

## Step 3 — Create archive destination

Determine archive path:

```bash
ARCHIVE_BASE="${--archive-path:-.planning/milestone-archive}"
ARCHIVE_DIR="$ARCHIVE_BASE/$(basename $MILESTONE_DIR)"
```

Create directory:

```bash
mkdir -p "$ARCHIVE_DIR"
```

## Step 4 — Copy milestone to archive

Copy entire milestone directory to archive:

```bash
cp -r "$MILESTONE_DIR"/* "$ARCHIVE_DIR/"
```

## Step 5 — Create completion summary

Create `$ARCHIVE_DIR/COMPLETION.md`:

```markdown
# Milestone Completion: {MILESTONE_NAME}

**Completed:** ISO-DATE
**Duration:** [start date] — [end date]
**Archive Location:** {ARCHIVE_DIR}

## Final State

- Total phases executed: {count}
- Goals completed: {count}/{total}
- Key decisions: {count}

## Archive Contents

- ROADMAP.md (original goals)
- STATE.md (final state)
- REQUIREMENTS.md (requirements met)
- phases/ (all phase artifacts)
- artifacts/ (deliverables)

## Next Actions

To review this milestone:
```
ls -la {ARCHIVE_DIR}
```

To start a new milestone:
```
/rihal:new-milestone <name>
```

## Lessons Learned

[To be filled by reviewer]
```

## Step 6 — Reset planning directory

Remove current milestone tracking:

```bash
rm .planning/current-milestone.txt 2>/dev/null || true
```

Optionally clean out old phase directories (ask user):

```
Clear old phase directories from .planning/? (y/N)

AskUserQuestion(header: "Cleanup", question: "Remove phase artifacts?")
```

If yes:

```bash
rm -rf .planning/phases .planning/artifacts
mkdir -p .planning/phases .planning/artifacts
```

## Step 7 — Report

Print completion summary:

```
✓ Milestone archived: {MILESTONE_NAME}
  Archive: {ARCHIVE_DIR}
  
Cleanup:
  - Removed current-milestone.txt
  - Cleared phase directories (optional)
  
Next: /rihal:new-milestone <name> to start the next cycle
```

## Success Criteria

- Milestone copied to archive
- COMPLETION.md created with metadata
- Current milestone tracking cleared
- Archive location reported to user
- `.planning/` reset for next cycle

## On Error

If copy fails (permissions):

```
⚠ Could not archive milestone. Check permissions:
  From: {MILESTONE_DIR}
  To: {ARCHIVE_DIR}
```

If archive directory already exists:

```
⚠ Archive already exists: {ARCHIVE_DIR}
   Move it or choose a different archive path.
```
