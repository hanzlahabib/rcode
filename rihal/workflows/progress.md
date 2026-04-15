# Workflow: rihal:progress

<purpose>
Check current project progress, summarize recent work and what's ahead, then intelligently route to the next action. Provides situational awareness before continuing work.

Note: This is a narrative "where are we and what's next" view. For a dashboard-style state snapshot, use `/rihal:status`.
</purpose>


## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rihal:progress <argument-here>
```

**Examples:**
```
/rihal:progress example 1
/rihal:progress example 2
```

STOP — do not proceed.

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

## Step 0 — Load progress context

**Action:** Initialize progress context and check if project exists.

```bash
INIT=$(node .rihal/bin/rihal-tools.cjs init progress)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Extract from init JSON: `project_exists`, `state_path`, `config_path`.

If `project_exists` is false (no `.rihal/` directory):

```
No Rihal project structure found.

Run `/rihal:plan` to start a new project.
```

Exit immediately.

If STATE.md missing: suggest creating project structure first.

## Step 1 — Load project state and configuration

**Action:** Read project files and extract current state.

Check what files exist:
- `.rihal/STATE.md` — current status, decisions, blockers
- `.rihal/PROJECT.md` — project definition and requirements
- Project git history — recent work

Extract key data from each source.

## Step 2 — Gather recent work context

**Action:** Check git history and uncommitted changes to understand recent activity.

```bash
git log --oneline -10 -- .rihal/ 2>/dev/null || true
```

Extract: "What have we been working on recently"

Also check for uncommitted changes:
```bash
git status --short 2>/dev/null || true
```

## Step 3 — Parse current position

**Action:** Extract project state and count pending work.

From STATE.md or PROJECT.md:
- Project name and current focus
- What phase/stage we're in
- What has been completed
- What's blocked or pending

Count:
- Pending todos: check if .rihal/todos exists
- Uncommitted changes: git status
- Active threads/discussions

## Step 4 — Generate progress narrative

**Action:** Format and display progress report.

Present in this format:

```
# [Project Name]

**Current Focus:** [One sentence on current objective]

## Recent Work
- [Last commit/action]: [what was accomplished]
- [Previous action]: [context]

## Current Position
Stage/Phase: [What we're in now]
Last activity: [date] - [summary]

## Key Decisions Made
- [decision 1]
- [decision 2]

## Blockers/Concerns
- [concern 1]
- [concern 2]
(Only show if any exist)

## Pending Work
- [count] uncommitted changes
- [count] pending todos (if any)
(Only show if any exist)

## What's Next
[Based on current state: next logical action or phase]
```

## Step 5 — Suggest next action

**Action:** Route to appropriate next action based on state.

Determine logical next step:

| Condition | Suggestion |
|-----------|-----------|
| Has uncommitted changes | Review and commit |
| Has pending todos | Check todos with `/rihal:add-todo` |
| Blocked on decision | Use `/rihal:council` for input |
| Ready to plan new work | Use `/rihal:plan` |
| Executing work | Use `/rihal:execute` |
| Needs status overview | Use `/rihal:status` |

Present:

```
---

## ▶ What's Next

[One sentence on recommended action]

`/rihal:[command] [args]`

---
```

## Success Criteria

- [ ] Project context loaded successfully
- [ ] Recent work summarized
- [ ] Current position clearly described
- [ ] Decisions and blockers highlighted
- [ ] Next action intelligently suggested
- [ ] User has clear situational awareness

## On Error

- **Project not found:** Show "No Rihal project structure found" and suggest `/rihal:plan`
- **State file missing:** Proceed with default progress view
- **Git commands fail:** Continue without git history
