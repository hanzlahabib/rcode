<purpose>
Detect current project state and automatically advance to the next logical Rihal workflow step.
Reads project state to determine: discuss → plan → execute progression.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="detect_state">
Read project state to determine current position:

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
Exit.
</step>

<step name="determine_next_action">
Apply routing rules based on state:

**Route 1: No project structure yet → plan**
If `.rihal/` doesn't exist:
→ Next action: `/rihal:plan <topic>`

**Route 2: Project exists but no PLAN.md → discuss or plan**
If PROJECT.md exists but no detailed plan:
→ Suggest: `/rihal:discuss <question>` for context OR `/rihal:plan` to create plan

**Route 3: Plan exists but not executed → execute**
If PLAN.md exists and has action items:
→ Next action: `/rihal:execute`

**Route 4: Changes made but not committed → commit**
If git shows uncommitted changes:
→ Suggest: Commit changes first, then continue

**Route 5: All planned work complete → assess next phase**
If plan is complete:
→ Next action: `/rihal:progress` to assess and determine next phase
</step>

<step name="show_and_execute">
Display the determination:

```
## Next Step

**Current:** [Project state in 1 line]
**Status:** [What's ready/in progress]

▶ **Next:** `/rihal:[command] [args]`
  [One-line explanation of why this is the next step]
```

Then immediately invoke the determined command via SlashCommand.
Do not ask for confirmation — the whole point of `/rihal:next` is zero-friction advancement.
</step>

</process>

<success_criteria>
- [ ] Project state correctly detected
- [ ] Next action correctly determined from routing rules
- [ ] Command invoked immediately without user confirmation
- [ ] Clear status shown before invoking
</success_criteria>
</process>
