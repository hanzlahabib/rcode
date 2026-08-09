<purpose>
Add a new integer phase to the end of the current milestone in the roadmap. Automatically calculates next phase number, creates phase directory, and updates roadmap structure.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="parse_arguments">
Parse the command arguments:
- All arguments become the phase description
- Example: `/rcode-add-phase Add authentication` → description = "Add authentication"
- Example: `/rcode-add-phase Fix critical performance issues` → description = "Fix critical performance issues"

If no arguments provided:

```
ERROR: Phase description required
Usage: /rcode-add-phase <description>
Example: /rcode-add-phase Add authentication system
```

Exit.
</step>

<step name="init_context">
Load phase operation context:

```bash
INIT=$(node ".rcode/bin/rcode-tools.cjs" init phase-op "1" 2>/dev/null)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

`init phase-op` only populates the phase-aware fields (`roadmap_exists`,
`planning_exists`, `phase_found`, ...) when its `question` argument's first
token parses as an integer `> 0` (rcode-tools.cjs's `phase-op` handler gates
on `phaseNum > 0`). add-phase has no target phase to pass — it's creating a
new one — so a placeholder is required. `"0"` fails that guard, silently
dropping `roadmap_exists` from every response (#1017); `"1"` satisfies it.
The dummy value only affects unused fields like `phase_found`/`phase_name`
(harmless here) — `roadmap_exists` itself is purely a file-existence check
and doesn't depend on phase 1 actually existing.

If `INIT` is empty, print error and exit:
```
Error: rcode-tools init failed. Verify .rcode/ is installed and state.json is valid.
```

Check `roadmap_exists` from init JSON. If false:
```
ERROR: No roadmap found (.planning/ROADMAP.md)
Run /rcode-new-project to initialize.
```
Exit.
</step>

<step name="detect_task_list">
**Detect bulk-task input** — when /rcode-quick or /rcode-do auto-routes a multi-task input here, the entire bug list arrives as `${description}`. Don't put it all in the phase title; extract structure.

Match if `${description}` contains ANY of:
- 5+ numbered list items (`/^\s*\d+\.\s/m` ≥ 5)
- 5+ bullet items (`/^\s*[-*]\s/m` ≥ 5)
- 3+ "Bug Report:" / "Issue:" / "Severity:" headers
- Multiple newlines (> 5 lines total)

If matched:

1. **Phase name** = first line of `${description}` (or first 80 chars if no newline). If the first line is itself a heading like `# Phase 09 — UI Bug Cleanup`, strip the leading `#` characters.
2. **Phase body** = the rest of the input.
3. After the phase directory is created (next step), write the body to `.planning/phases/{NN}-{slug}/TASKS.md` with header:

   ```markdown
   # Phase {N} — {phase name} — Tasks

   *Auto-extracted from /rcode-quick or /rcode-do bulk auto-route on {ISO date}.*

   {original body, preserved verbatim}
   ```

4. Note in the completion message: "TASKS.md written with N tasks". The downstream /rcode-plan workflow consumes TASKS.md as the input to SPRINT.md generation — no manual re-paste needed.

If NOT matched (single task), proceed normally — `${description}` is the phase name as-is.

Set `BULK_MODE=true|false` for the next step.
</step>

<step name="add_phase">
**Delegate the phase addition to rcode-tools:**

```bash
# In bulk mode, pass only the extracted phase name (not the entire body)
PHASE_NAME=$( [ "$BULK_MODE" = "true" ] && echo "$EXTRACTED_FIRST_LINE" || echo "$description" )
RESULT=$(node ".rcode/bin/rcode-tools.cjs" phase add "${PHASE_NAME}")
```

The CLI handles:
- Finding the highest existing integer phase number
- Calculating next phase number (max + 1)
- Generating slug from description
- Creating the phase directory (`.planning/phases/{NN}-{slug}/`)
- Inserting the phase entry into ROADMAP.md with Goal, Depends on, and Plans sections

Extract from result: `phase_number`, `padded`, `name`, `slug`, `directory`,
`milestone_health` (object: `open_phases`, `recommendation`, `threshold_should`,
`threshold_consider`), `nudge` (present only when `recommendation` isn't
`healthy` — a ready-to-print one-liner naming the milestone). `phase add`
computes these via `milestoneCloseNudge()` (issue #942) as part of the same
call, so `milestone_health_check` below reads them straight off `$RESULT`
instead of re-deriving them.

**If `BULK_MODE=true`:** after the CLI returns, write the bulk body to `${directory}/TASKS.md` per the structure defined in `detect_task_list`. This step is non-destructive — it only ADDs a TASKS.md file inside the new phase directory.
</step>

<step name="update_project_state">
Update STATE.md to reflect the new phase:

1. Read `.planning/STATE.md`
2. Under "## Accumulated Context" → "### Roadmap Evolution" add entry:
   ```
   - Phase {N} added: {description}
   ```

If "Roadmap Evolution" section doesn't exist, create it.
</step>

<step name="milestone_health_check">
After the phase is added, read the milestone-health gauge (issue #718)
straight off the `phase add` result captured in `add_phase` — no extra
subprocess calls. Previously this step spawned a separate `milestone-health`
call plus 3 `node -e` JSON field extractions to re-derive data that `phase
add` already returns inline via `milestoneCloseNudge()` (#942); that was
4 wasted calls per phase-add for data already sitting in `$RESULT` (#1018).

```
RECOMMENDATION="$RESULT.milestone_health.recommendation"   # e.g. healthy | consider-closing | should-close
OPEN_COUNT="$RESULT.milestone_health.open_phases"
NUDGE="$RESULT.nudge"                                       # ready-to-print, names the milestone; absent when healthy
```

If `RECOMMENDATION` is `should-close` (≥12 open phases), surface a hard nudge:

```
⚠ {NUDGE}

Phase {N} is now in this milestone, but the milestone is well past the
12-phase threshold for considering closure. Phases are accumulating without
a milestone boundary — historically this is where roadmaps lose structure.

Recommended next step:
  /rcode-complete-milestone    close the milestone cleanly + archive done phases
  /rcode-new-milestone         start a fresh milestone for ongoing work

If you genuinely want a giant single-milestone roadmap, ignore this and
continue. The threshold is conservative on purpose.
```

If `RECOMMENDATION` is `consider-closing` (8-11 open phases), softer nudge:

```
ℹ {NUDGE}
```

If `RECOMMENDATION` is `healthy` or `milestone_health` is absent (no state.json / no milestone), say nothing.
</step>

<step name="completion">
Present completion summary:

```
Phase {N} added to current milestone:
- Description: {description}
- Directory: .planning/phases/{phase-num}-{slug}/
- Status: Not planned yet

Roadmap updated: .planning/ROADMAP.md

---

## ▶ Next Up

**Phase {N}: {description}**

`/clear` then:

`/rcode-plan {N}`

---

**Also available:**
- `/rcode-add-phase <description>` — add another phase
- Review roadmap

---
```
</step>

</process>

<success_criteria>
- [ ] `rcode-tools phase add` executed successfully
- [ ] Phase directory created
- [ ] Roadmap updated with new phase entry
- [ ] STATE.md updated with roadmap evolution note
- [ ] User informed of next steps
</success_criteria>

## Next Up

- `/rcode-discuss-phase` — discuss the new phase before planning
- `/rcode-plan` — plan the newly added phase
