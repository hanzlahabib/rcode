# Workflow: rihal:status

<purpose>
Read `.rihal/state.json` and print a human-readable project status dashboard.

**SSOT:** `.rihal/state.json` is the single source of truth for phase counts, milestone names, and current position. `/rihal:status` and `/rihal:progress` MUST agree — if `state.json` is out of date relative to `ROADMAP.md` or `epics.md`, that is a sync bug (see issue #126) and should be fixed by running `node .rihal/bin/rihal-tools.cjs state sync --from-disk`, not by reading the markdown files directly from this workflow.
</purpose>

<required_reading>
@.rihal/references/output-format.md
</required_reading>

<drift_detection>
Before printing the dashboard, detect state/disk drift:

```bash
if [ -f .planning/ROADMAP.md ]; then
  DISK_PHASES=$(grep -cE "^\|\s*[0-9]{1,3}" .planning/ROADMAP.md)
  STATE_PHASES=$(node .rihal/bin/rihal-tools.cjs state read 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const s=JSON.parse(d);console.log((s.state?.phases||[]).length)}catch{console.log(0)}}")
  if [ "$DISK_PHASES" -gt 0 ] && [ "$DISK_PHASES" -ne "$STATE_PHASES" ]; then
    echo "⚠ Drift detected: ROADMAP.md has $DISK_PHASES phases, state.json has $STATE_PHASES."
    echo "  Run: node .rihal/bin/rihal-tools.cjs state sync --from-disk"
  fi
fi
```

Print this warning above the dashboard if drift is detected. Do NOT silently fall back to reading `ROADMAP.md` — that was the cause of the `/rihal:status` vs `/rihal:progress` disagreement in issue #131.
</drift_detection>

<output_format>
Open with banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► STATUS — {project}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
Use status symbols (✓ complete, ◆ in_progress, ○ planned) in phase/plan list.
Highlight open blockers with ⚠. End with Next Up block routing to next action.
</output_format>

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
