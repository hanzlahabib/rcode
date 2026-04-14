# Workflow: rihal:stats

<purpose>
Read .rihal/state.json and display project statistics: phases, plans, council sessions, decisions, blockers, timeline, and git stats.
</purpose>

## Step 1 — Load state

Read `.rihal/state.json`:

```bash
cat .rihal/state.json 2>/dev/null || echo '{}'
```

Parse as JSON. If parse fails or file doesn't exist, print:
```
ℹ️ No rihal state found in this project yet.
Run /rihal:help to get started.
```
Exit.

Store the parsed state as `$STATE`.

## Step 2 — Compute statistics

From `$STATE`, extract:

- **phases**: `$STATE.phases.length` (total)
- **active_phases**: count of phases with status = "active"
- **plans_completed**: `$STATE.current_plan` (number completed in current phase)
- **council_sessions**: `$STATE.council_sessions.length`
- **chains_run**: `$STATE.executions.length` (all execution records)
- **decisions**: `$STATE.decisions.length` (total)
- **blockers_open**: count of blockers with status = "open"
- **blockers_resolved**: count of blockers with status = "resolved"
- **last_3_decisions**: extract summaries from the last 3 items in `$STATE.decisions` array (summary field or description field)
- **timeline_start**: `$STATE.created` (ISO timestamp of first session)
- **timeline_end**: `$STATE.last_session` (ISO timestamp of most recent activity)

## Step 3 — Compute timeline duration

Calculate human-readable duration from timeline_start to timeline_end:
- If more than 30 days: show "N months"
- If 1-30 days: show "N days"
- If less than 1 day: show "hours"
- If null/missing: show "never started"

## Step 4 — Compute git stats (if .git exists)

If `.git/` directory exists, run:

```bash
git log --oneline --pretty=format:'%s' -- .rihal rihal/ | wc -l
git log --oneline --pretty=format:'%s' -- .rihal rihal/ | head -5
```

Extract:
- **rihal_commits**: count of commits on .rihal or rihal paths
- **recent_commits**: last 5 commit messages

If `.git/` does not exist, set `rihal_commits` = 0 and omit recent_commits from output.

## Step 5 — Format and print output

Print a human-readable stats block:

```
📊 rihal:stats — Project Timeline

Project: $PROJECT_NAME
Created: $TIMELINE_START
Updated: $TIMELINE_END
Duration: $DURATION

Phases
  Total: N
  Active: N

Plans
  Completed: N

Council
  Sessions: N
  Decisions: N (last 3: "...", "...", "...")

Chains
  Executions: N

Blockers
  Open: N
  Resolved: N

Git Activity (rihal-related)
  Commits: N
  Recent:
    - message-1
    - message-2
    - message-3
```

If any counts are 0, still show them (e.g., "Phases: 0").
