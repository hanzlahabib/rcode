<purpose>
Check current project progress, summarize recent work and what's ahead, then intelligently route to the next action. Provides situational awareness before continuing work.

Note: This is a narrative "where are we and what's next" view. For a dashboard-style state snapshot, use `/rihal:status`.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="init_context">
**Load progress context:**

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

Exit.

If missing STATE.md: suggest creating project structure.
</step>

<step name="load">
**Load project state and configuration:**

Check what files exist:
- `.rihal/STATE.md` — current status, decisions, blockers
- `.rihal/PROJECT.md` — project definition and requirements
- Project git history — recent work

Extract key data from each source.
</step>

<step name="recent">
**Gather recent work context:**

Check git log for recent commits related to project:

```bash
git log --oneline -10 -- .rihal/ 2>/dev/null || true
```

Extract: "What have we been working on recently"

Also check for uncommitted changes:
```bash
git status --short 2>/dev/null || true
```
</step>

<step name="position">
**Parse current position:**

From STATE.md or PROJECT.md:
- Project name and current focus
- What phase/stage are we in
- What has been completed
- What's blocked or pending

Count:
- Pending todos: check if .rihal/todos exists
- Uncommitted changes: git status
- Active threads/discussions
</step>

<step name="report">
**Generate progress narrative:**

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

</step>

<step name="route">
**Suggest next action based on current state:**

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

</step>

</process>

<success_criteria>
- [ ] Project context loaded successfully
- [ ] Recent work summarized
- [ ] Current position clearly described
- [ ] Decisions and blockers highlighted
- [ ] Next action intelligently suggested
- [ ] User has clear situational awareness
</success_criteria>
</process>
