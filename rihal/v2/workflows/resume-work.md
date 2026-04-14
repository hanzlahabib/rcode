<purpose>
Instantly restore full project context when resuming work after a break.

When the user says "continue", "what's next", "where were we", or "resume", this workflow quickly reestablishes the mental model and surfaces any incomplete work that needs attention first.
</purpose>

<required_reading>
Review project files to understand current state: PROJECT.md, STATE.md, PLAN.md
</required_reading>

<process>

<step name="initialize">
Load all context:

```bash
[ -d .rihal ] && echo "Rihal project found" || echo "No Rihal project"
```

Check what files exist:
- `.rihal/PROJECT.md` — project definition
- `.rihal/STATE.md` — current status
- `.rihal/PLAN.md` — execution plan
- `.rihal/NOTES.md` — session notes if any
- Git status — uncommitted changes

If `.rihal/` doesn't exist:
```
No Rihal project found. Start with `/rihal:plan` to create one.
```
Exit.
</step>

<step name="load_state">

Read and parse key files:

```bash
cat .rihal/PROJECT.md 2>/dev/null || true
cat .rihal/STATE.md 2>/dev/null || true
cat .rihal/PLAN.md 2>/dev/null || true
cat .rihal/HANDOFF.json 2>/dev/null || echo "{}"
```

**From PROJECT.md extract:**
- Project name and description
- Current objectives
- Key requirements

**From STATE.md extract:**
- Current stage/phase
- Recent decisions
- Any blockers or concerns
- Pending items

**From PLAN.md extract:**
- What's planned
- What's been completed
- What's in progress

**From HANDOFF.json extract (if present):**
- `blocking_constraints` — external dependencies or constraints from previous session
- `uncommitted_files` — work left uncommitted
- `current_phase` — where work was paused
- `next_steps` — suggested resumption path
</step>

<step name="check_incomplete_work">
Look for incomplete work that needs immediate attention:

```bash
# Check for uncommitted changes
git status --short 2>/dev/null || true

# Check for TODOs or FIXMEs in notes
grep -i "TODO\|FIXME\|BLOCKED" .rihal/NOTES.md 2>/dev/null || true

# Check for incomplete tasks in PLAN
grep -i "in.progress\|blocked\|pending" .rihal/PLAN.md 2>/dev/null || true
```

Track:
- `uncommitted_changes`: any git changes
- `pending_work`: tasks not yet done
- `blockers`: anything blocking progress
</step>

<step name="present_status">
Present complete project status to user:

```
╔═════════════════════════════════════════════════════════════╗
║  PROJECT STATUS                                              ║
╠═════════════════════════════════════════════════════════════╣
║  Building: [one-liner from PROJECT.md]                      ║
║                                                              ║
║  Current Stage: [phase/state]                               ║
║  Last activity: [date] - [what happened]                    ║
║  Progress: [brief % or status]                              ║
╚═════════════════════════════════════════════════════════════╝

[If HANDOFF.json exists and has blocking_constraints:]
⚠️  BLOCKING CONSTRAINTS from previous session:
    {blocking_constraints text}
    
[If uncommitted changes:]
⚠️  Uncommitted changes found:
    - [file 1]
    - [file 2]

[If pending work:]
📋 Pending work:
    - [task 1]
    - [task 2]

[If other blockers in state.json:]
⚠️  Blockers/Concerns:
    - [blocker 1]
    - [blocker 2]
```

</step>

<step name="determine_next_action">
Based on project state, determine the most logical next action:

**If uncommitted changes exist:**
→ Primary: Review and commit changes first
→ Then: Proceed with next phase

**If pending work exists (in progress tasks):**
→ Primary: Complete the in-progress work
→ Option: Review or adjust plan

**If all work complete:**
→ Primary: Assess and create next phase plan
→ Use: `/rihal:progress` to understand what's next

**If blocked on a decision:**
→ Primary: Use `/rihal:council` for input
→ Then: Resume work after resolving

**If ready to continue execution:**
→ Primary: Show next phase/task
→ Use: `/rihal:execute` to continue
</step>

<step name="offer_options">
Present contextual options based on project state:

```
What would you like to do?

[Primary action based on state - e.g.:]
1. Commit pending changes
   OR
1. Continue with in-progress work
   OR
1. Review project progress (/rihal:progress)
   OR
1. Execute next phase (/rihal:execute)

[Secondary options:]
2. Review current plan
3. Check decision log
4. See what's blocking us
5. Something else
```

Wait for user selection.
</step>

<step name="route_to_workflow">
Based on user selection, route to appropriate workflow:

- **Commit changes** → Show git status and guide to commit
- **Continue work** → Show the next task/phase
- **Review progress** → Invoke `/rihal:progress`
- **See decisions** → Display PROJECT.md key decisions
- **Execute** → Invoke `/rihal:execute`
- **Something else** → Ask what they need
</step>

<step name="update_session">
Before proceeding, update session continuity:

Update STATE.md with:
```
## Session Continuity

Last resumed: [now]
Proceeding to: [action]
```

This ensures if session ends unexpectedly, next resume knows the state.
</step>

</process>

<success_criteria>
- [ ] Project state correctly loaded
- [ ] Incomplete work identified and surfaced
- [ ] Current position clearly presented
- [ ] Blockers/concerns highlighted
- [ ] Next action logically determined
- [ ] User can immediately resume work
</success_criteria>
</process>
