# Workflow: rihal:status

<purpose>
Read `.rihal/state.json` and print a human-readable project status dashboard.
</purpose>

<required_reading>
@.rihal/references/output-format.md
</required_reading>

<process>

## Step 1 — Read state

```bash
node .rihal/bin/rihal-tools.cjs state read
```

Parse the JSON output.

**If the output contains `"state": null`:** print the following message and stop:

```
No state found. Run a council session or execute a plan to initialize state.
```

## Step 2 — Print dashboard

Using the parsed state, print a dashboard in this format:

```
╭─ Rihal Status — {project} ─────────────────────╮
│ Phase:    {current_phase or "none started"}          │
│ Plan:     {current_plan} completed                   │
│ Updated:  {updated, human-readable: "2 hours ago"}   │
╰──────────────────────────────────────────────────────╯

Phases:
▶ [01] Initial Setup — complete ✓
  [01.01] Schema setup — done
  [01.02] Seed data — in progress (2/3 tasks)
▷ [02] API Development — pending
  [02.01] Routes — pending

Recent decisions ({last 3}):
• {decision summary} — [phase.plan], {date}

Open blockers ({count}):
⚠ {blocker description} — [phase.plan]

Council sessions ({last 3}):
• {date} — {question_slug} — Panel: {panel}

Chain runs ({last 3}):
• {date} — {slug} — {agents}

Workstreams ({active count}):
▶ {name} (active) — {phase count} phases
✓ {name} (complete)

Last session: {last_session, human-readable}
```

**Formatting rules:**
- Show hierarchical IDs in `[NN]` format for phases and `[NN.MM]` for plans
- For `updated` and `last_session`, compute a human-readable relative time (e.g. "2 hours ago", "3 days ago", "just now").
- For decisions and council sessions, show only the last 3 entries (most recent first).
- For blockers, show only unresolved ones (`resolved === false`).
- Include phases section showing current status of all phases and their plans
- Omit any section that has zero entries (e.g. if no decisions, skip "Recent decisions" entirely).

## Step 3 — Blocker warning

If there are any open (unresolved) blockers, end with:

```
⚠ {n} unresolved blocker(s). Address before proceeding.
```

</process>

## Success Criteria

- [ ] State is successfully read from `.rihal/state.json`
- [ ] Dashboard displays all available sections
- [ ] Phase hierarchy is clear and properly formatted
- [ ] Relative timestamps are human-readable
- [ ] Blockers are highlighted if present

## On Error

- **`rihal-tools.cjs` not found:** tell user to run `rihal-code install-v2`.
- **state.json missing:** handled in Step 1 with the clean "No state found" message.
- **Invalid state JSON:** report the specific parsing error and suggest manual inspection of state file
