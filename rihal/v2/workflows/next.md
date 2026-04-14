# Workflow: rihal:next

<purpose>
Detect current project state and automatically advance to the next logical Rihal workflow step. Reads project state to determine: discuss → plan → execute progression.
</purpose>


## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rihal:next <argument-here>
```

**Examples:**
```
/rihal:next example 1
/rihal:next example 2
```

STOP — do not proceed.

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

## Step 0 — Detect current project state

**Action:** Read project state to determine current position.

```bash
# Get state snapshot
[ -f .rihal/STATE.md ] && cat .rihal/STATE.md || echo "No STATE.md"
```

Also check:
- `.rihal/PROJECT.md` — project definition
- `.rihal/PLAN.md` — if exists, planning stage
- Recent git commits — work progress

Extract:
- `project_exists` — is there a .rihal/ directory
- `current_stage` — what phase is active
- `has_uncommitted` — any changes not committed

If no `.rihal/` directory exists:
```
No Rihal project detected. Run `/rihal:plan` to get started.
```
Exit immediately.

## Step 1 — Apply routing rules

**Action:** Determine next action based on project state.

Route decisions:

**Route 1 — No project structure yet**
If `.rihal/` doesn't exist → Next action: `/rihal:plan <topic>`

**Route 2 — Project exists but no plan**
If PROJECT.md exists but no detailed plan → Suggest: `/rihal:discuss <question>` for context OR `/rihal:plan` to create plan

**Route 3 — Plan exists but not executed**
If PLAN.md exists and has action items → Next action: `/rihal:execute`

**Route 4 — Changes made but not committed**
If git shows uncommitted changes → Suggest: Commit changes first, then continue

**Route 5 — Planned work complete**
If plan is complete → Next action: `/rihal:progress` to assess and determine next phase

## Step 2 — Display determination and advance

**Action:** Show current state and next action, then invoke command immediately.

Display:

```
## Next Step

**Current:** [Project state in 1 line]
**Status:** [What's ready/in progress]

▶ **Next:** `/rihal:[command] [args]`
  [One-line explanation of why this is the next step]
```

Immediately invoke the determined command via SlashCommand. Do not ask for confirmation — the whole point of `/rihal:next` is zero-friction advancement.

## Success Criteria

- [ ] Project state correctly detected
- [ ] Next action correctly determined from routing rules
- [ ] Command invoked immediately without user confirmation
- [ ] Clear status shown before invoking

## On Error

- **State file missing:** Treat as Route 1 (no project)
- **Cannot determine next step:** Default to `/rihal:progress` for context
- **Git command fails:** Proceed without git state check
