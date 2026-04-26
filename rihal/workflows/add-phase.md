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
- Example: `/rihal:add-phase Add authentication` → description = "Add authentication"
- Example: `/rihal:add-phase Fix critical performance issues` → description = "Fix critical performance issues"

If no arguments provided:

```
ERROR: Phase description required
Usage: /rihal:add-phase <description>
Example: /rihal:add-phase Add authentication system
```

Exit.
</step>

<step name="init_context">
Load phase operation context:

```bash
INIT=$(node ".rihal/bin/rihal-tools.cjs" init phase-op "0")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Check `roadmap_exists` from init JSON. If false:
```
ERROR: No roadmap found (.planning/ROADMAP.md)
Run /rihal:new-project to initialize.
```
Exit.
</step>

<step name="detect_task_list">
**Detect bulk-task input** — when /rihal:quick or /rihal:do auto-routes a multi-task input here, the entire bug list arrives as `${description}`. Don't put it all in the phase title; extract structure.

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

   *Auto-extracted from /rihal:quick or /rihal:do bulk auto-route on {ISO date}.*

   {original body, preserved verbatim}
   ```

4. Note in the completion message: "TASKS.md written with N tasks". The downstream /rihal:plan workflow consumes TASKS.md as the input to SPRINT.md generation — no manual re-paste needed.

If NOT matched (single task), proceed normally — `${description}` is the phase name as-is.

Set `BULK_MODE=true|false` for the next step.
</step>

<step name="add_phase">
**Delegate the phase addition to rihal-tools:**

```bash
# In bulk mode, pass only the extracted phase name (not the entire body)
PHASE_NAME=$( [ "$BULK_MODE" = "true" ] && echo "$EXTRACTED_FIRST_LINE" || echo "$description" )
RESULT=$(node ".rihal/bin/rihal-tools.cjs" phase add "${PHASE_NAME}")
```

The CLI handles:
- Finding the highest existing integer phase number
- Calculating next phase number (max + 1)
- Generating slug from description
- Creating the phase directory (`.planning/phases/{NN}-{slug}/`)
- Inserting the phase entry into ROADMAP.md with Goal, Depends on, and Plans sections

Extract from result: `phase_number`, `padded`, `name`, `slug`, `directory`.

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

`/rihal:plan {N}`

---

**Also available:**
- `/rihal:add-phase <description>` — add another phase
- Review roadmap

---
```
</step>

</process>

<success_criteria>
- [ ] `rihal-tools phase add` executed successfully
- [ ] Phase directory created
- [ ] Roadmap updated with new phase entry
- [ ] STATE.md updated with roadmap evolution note
- [ ] User informed of next steps
</success_criteria>
