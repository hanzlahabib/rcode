<purpose>
Detect current project state and automatically advance to the next logical rcode workflow step.
Reads project state to determine: plan → execute → verify → complete progression.
Zero-friction — detects and invokes, no confirmation needed.
</purpose>

<required_reading>
@.rcode/references/output-format.md
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<output_format>
Print a routing banner when dispatching to the next command:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► ROUTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current: Phase {N} — {name} | Sprint {sprint_id}
Status:  {status description}

▶ Next: `/rcode-{command} {args}`
  {One-line explanation}
```

Follow all banner and status-symbol conventions from output-format.md.
</output_format>

<process>

<step name="detect_state">
Read project state to determine current position:

```bash
STATE=$(node .rcode/bin/rcode-tools.cjs state read 2>/dev/null | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(json.dumps({
    'current_phase': d.get('current_phase'),
    'current_sprint': d.get('current_sprint'),
    'phases': [{'number': p.get('number'), 'status': p.get('status')} for p in d.get('phases', [])],
    'blockers': d.get('blockers', [])[:3],
}))
" 2>/dev/null || echo '{}')
SPRINT_STATUS=$(node .rcode/bin/rcode-tools.cjs state sprint status 2>/dev/null || echo '{}')
VELOCITY=$(node .rcode/bin/rcode-tools.cjs state sprint velocity 2>/dev/null || echo '{}')
[ -f .planning/ROADMAP.md ] && ROADMAP_EXISTS=1 || ROADMAP_EXISTS=0
```

`STATE` already carries everything this command needs — `current_phase`, `current_sprint`, `phases[].status`, and the top few `blockers`. Do not additionally `cat` `.planning/STATE.md` or `.planning/ROADMAP.md`; both are large documents and `/rcode-next` is meant to be the cheap, frequently-run status check. `ROADMAP_EXISTS` is enough for Route 1 below, which only needs to know the file is present.

If no `.planning/` directory AND no `.rcode/state.json`:
```
No rcode project detected. Run `/rcode-new-project` to get started.
```
Exit.
</step>

<step name="safety_gates">
Run hard-stop checks before routing. Exit on first hit unless `--force` was passed.

If `--force` flag was passed, skip all gates.
Print: `Warning: --force — skipping safety gates`
Then proceed to `determine_next_action`.

**Gate 1: Unresolved checkpoint**
```bash
[ -f .planning/.continue-here.md ]
```
If found:
```
Stop: Unresolved checkpoint

`.planning/.continue-here.md` exists — a previous session left
unfinished work. Read it, resolve, then delete to continue.
Use `--force` to bypass.
```
Exit.

**Gate 2: Error state**
Check STATE.md for `status: error` or `status: failed`.
If found:
```
Stop: Project in error state

Resolve the error before advancing. Run `/rcode-health` to diagnose.
Use `--force` to bypass.
```
Exit.

**Gate 3: Unchecked verification**
Check if current phase has VERIFICATION.md with FAIL items:
If found:
```
Stop: Unchecked verification failures

Phase {N} has {count} unresolved failures. Address them first.
Use `--force` to bypass.
```
Exit.
</step>

<step name="determine_next_action">
Apply routing rules based on state:

**Route 1: No phases exist yet**
ROADMAP.md exists but no phase directories on disk:
Next: `/rcode-sprint-planning`

**Route 2: Phase exists but no sprint**
Current phase directory exists but has no SPRINT.md:
Next: `/rcode-sprint-planning --phase {current_phase}`

**Route 3: Sprint exists, stories incomplete**
SPRINT.md exists and has stories with status != done:
Next: `/rcode-execute .planning/phases/{phase_dir}/SPRINT.md`

**Route 4: All stories done, sprint not closed**
All stories are done but sprint status is still "active":
Next: complete the sprint via `rcode-tools.cjs state sprint complete`, then suggest `/rcode-sprint-planning` for next sprint

**Route 5: Sprint complete, next phase exists**
Current phase is complete, next phase exists in ROADMAP:
Next: `/rcode-sprint-planning --phase {next_phase}`

**Route 6: All phases complete**
All phases in ROADMAP are complete:
Next: `/rcode-complete-milestone`

**Route 7: Paused**
State shows paused_at is set:
Next: `/rcode-resume-work`

**Route 8: No sprint system, fallback**
State has no sprints[] data — legacy or empty project:
Next: `/rcode-sprint-planning`
</step>

<step name="show_and_execute">
Display the determination:

```
## rcode Next

**Current:** Phase {N} — {name} | Sprint {sprint_id}
**Sprint:** {done}/{total} stories ({points_done}/{points_total} pts)

Next: `/rcode-{command} {args}`
  {One-line explanation}
```

Then immediately invoke the determined command.
Do not ask for confirmation — `/rcode-next` is zero-friction advancement.
</step>

</process>

<success_criteria>
- [ ] Project state correctly detected
- [ ] Next action correctly determined from routing rules
- [ ] Command invoked immediately without user confirmation
- [ ] Clear status shown before invoking
</success_criteria>

## Next Up

- `/rcode-do` — describe what you want if auto-detection is unclear
- `/rcode-status` — review project state before advancing
