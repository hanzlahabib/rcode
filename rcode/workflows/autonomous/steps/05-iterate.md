# autonomous - step 05: Iterate: refresh phase count, blockers, token report, loop

This step file was split verbatim out of `workflows/autonomous.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<step name="iterate">

## 4. Iterate

### 4.0. Refresh Phase Count From Disk (MANDATORY — Compaction Guard)

**This step is NON-NEGOTIABLE.** LLM context compaction loses in-memory
variables. Re-derive `phase_count` and `completed_phases` from disk at the
START of every iteration — never rely on values held from the initialize step.

```bash
# Re-read the authoritative progress snapshot from the CLI
PROGRESS_REFRESH=$(node .rcode/bin/rcode-tools.cjs progress init 2>/dev/null)
```

Parse `PROGRESS_REFRESH` JSON and update:
- `phase_count` ← `PROGRESS_REFRESH.phase_count`
- `completed_phases` ← `PROGRESS_REFRESH.completed_count`
- `T` (for banner display) ← `phase_count`

If `PROGRESS_REFRESH` fails or is empty, fall back to direct ROADMAP.md parsing:

```bash
# Fallback: count phases directly from ROADMAP.md
PHASE_COUNT_DISK=$(grep -cE '^\|\s*\d{1,3}' .planning/ROADMAP.md 2>/dev/null || echo "0")
COMPLETED_DISK=$(find .planning/phases/ -name '*SUMMARY.md' 2>/dev/null | wc -l)
```

**Sanity check:** If `current_phase_number > phase_count`, this is a drift
symptom. Log a warning and re-derive from disk:

```
⚠ Phase drift detected: current phase ${N} > total ${T}. Re-reading from ROADMAP.md.
```

**If `ONLY_PHASE` is set:** Do not iterate. Proceed directly to lifecycle step (which exits cleanly per single-phase mode).

**If `TO_PHASE` is set and current phase number >= `TO_PHASE`:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► AUTONOMOUS ▸ --to ${TO_PHASE} REACHED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Completed through phase ${TO_PHASE} as requested.
 Remaining phases were not executed.

 Resume with: /rcode-autonomous --from ${next_incomplete_phase}
```

Proceed directly to lifecycle step (which handles partial completion). Exit cleanly.

**Otherwise:** After each phase completes, check whether ROADMAP.md actually changed before paying to re-read it — phases are usually only inserted mid-execution when a grey-area decision demanded it, not every iteration:

```bash
ROADMAP_LINES_NOW=$(wc -l < .planning/ROADMAP.md 2>/dev/null || echo 0)
if [ "$ROADMAP_LINES_NOW" != "$ROADMAP_LINES" ]; then
  cat .planning/ROADMAP.md
  ROADMAP_LINES=$ROADMAP_LINES_NOW
fi
```

If the line count changed, re-filter incomplete phases using the same logic as discover_phases (this catches phases inserted mid-execution, e.g. decimal phases like 5.1). If it did not change, keep the existing `phases` array as-is.

Extract only the fields needed to decide what happens next — never re-read the full state document on every iteration:

```bash
node .rcode/bin/rcode-tools.cjs state get current_phase current_plan blockers 2>/dev/null
```

If `blockers` is non-empty, go to handle_blocker.

If incomplete phases remain: proceed to next phase, loop back to execute_phase.

**Token cost report and /clear offer (closes #586):**

After each phase completes, display a cost summary:

```
Phase {N} ✓ {name} — {sprint_count} sprints, {revision_count} revision(s)
```

Track `PHASES_COMPLETED` (increment after each iterate). Every 3 completed phases:

```
⚠ Context growing — {PHASES_COMPLETED} phases done in this session.
  Tip: /clear now and resume to keep remaining phases lean:
  /rcode-autonomous --from {next_phase} --to {TO_PHASE}
  Continue anyway? [Yes, keep going] / [I'll clear now — show resume command]
```

In `mode: yolo`: skip the offer and just print the resume command as an info line.

**Interactive mode overlap:** When `INTERACTIVE` is set, the iterate step enables pipeline parallelism:
1. After discuss completes for Phase N, dispatch plan+execute as background agents
2. Immediately start discuss for Phase N+1 while Phase N builds
3. Before starting plan for Phase N+1, wait for Phase N's execute agent to complete and handle its post-execution routing

This means the user is always answering discuss questions (lightweight, interactive) while the heavy work runs in the background.

If all phases complete, proceed to lifecycle step.

</step>

Next: Read `.rcode/workflows/autonomous/steps/06-lifecycle.md` before starting it (skip it if its Read-when condition is false).
