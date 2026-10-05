# autonomous - step 02: Initialize, discover phases

This step file was split verbatim out of `workflows/autonomous.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<step name="initialize" priority="first">

## 1. Initialize

Parse `$ARGUMENTS` for `--from N`, `--to N`, `--only N`, and `--interactive` flags:

```bash
FROM_PHASE=""
if echo "$ARGUMENTS" | grep -qE '\-\-from\s+[0-9]'; then
  FROM_PHASE=$(echo "$ARGUMENTS" | grep -oE '\-\-from\s+[0-9]+\.?[0-9]*' | awk '{print $2}')
fi

TO_PHASE=""
if echo "$ARGUMENTS" | grep -qE '\-\-to\s+[0-9]'; then
  TO_PHASE=$(echo "$ARGUMENTS" | grep -oE '\-\-to\s+[0-9]+\.?[0-9]*' | awk '{print $2}')
fi

ONLY_PHASE=""
if echo "$ARGUMENTS" | grep -qE '\-\-only\s+[0-9]'; then
  ONLY_PHASE=$(echo "$ARGUMENTS" | grep -oE '\-\-only\s+[0-9]+\.?[0-9]*' | awk '{print $2}')
  FROM_PHASE="$ONLY_PHASE"
fi

INTERACTIVE=""
if echo "$ARGUMENTS" | grep -q '\-\-interactive'; then
  INTERACTIVE="true"
fi
```

When `--only` is set, also set `FROM_PHASE` to the same value so existing filter logic applies.

When `--interactive` is set, discuss runs inline with questions (not auto-answered), while plan and execute are dispatched as background agents. This keeps the main context lean — only discuss conversations accumulate — while preserving user input on all design decisions.

Bootstrap via rcode-tools init + state:

```bash
INIT=$(node .rcode/bin/rcode-tools.cjs init milestone-op 2>/dev/null || node .rcode/bin/rcode-tools.cjs init)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
STATE=$(node .rcode/bin/rcode-tools.cjs state brief 2>/dev/null || echo '{}')
```

Parse JSON for: `milestone_version`, `milestone_name`, `phase_count`, `completed_phases`, `roadmap_exists`, `state_exists`, `commit_docs`, `response_language`.

**If `response_language` is set:** include `Respond in {response_language}.` in all spawned subagent prompts.

**If `roadmap_exists` is false:** Error — "No ROADMAP.md found. Run `/rcode-new-milestone` first."
**If `state_exists` is false:** Error — "No STATE.md found. Run `/rcode-new-milestone` first."

Display startup banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► AUTONOMOUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Milestone: {milestone_version} — {milestone_name}
 Phases: {phase_count} total, {completed_phases} complete
```

If `ONLY_PHASE` is set, display: `Single phase mode: Phase ${ONLY_PHASE}`
Else if `FROM_PHASE` is set, display: `Starting from phase ${FROM_PHASE}`
If `TO_PHASE` is set, display: `Stopping after phase ${TO_PHASE}`
If `INTERACTIVE` is set, display: `Mode: Interactive (discuss inline, plan+execute in background)`

</step>

<step name="discover_phases">

## 2. Discover Phases

Parse ROADMAP.md directly (rcode-tools does not expose `roadmap analyze`):

```bash
cat .planning/ROADMAP.md
ROADMAP_LINES=$(wc -l < .planning/ROADMAP.md 2>/dev/null || echo 0)
# For per-phase detail, inspect .planning/phases/<phase_slug>/ directory for SPRINT.md, SUMMARY.md presence
```

Track `ROADMAP_LINES` for the rest of the run — the iterate step uses it to detect whether ROADMAP.md actually changed before paying to re-read it.

Build an internal `phases` array with: `number`, `name`, `goal`, `disk_status` (complete if SUMMARY.md exists, partial if SPRINT.md exists without SUMMARY.md, planned if neither), `has_ui_hint`.

**Filter to incomplete phases:** Keep only phases where `disk_status !== "complete"`.

**Apply `--from N` filter:** If `FROM_PHASE` was provided, additionally filter out phases where `number < FROM_PHASE` (use numeric comparison — handles decimal phases like "5.1").

**Apply `--to N` filter:** If `TO_PHASE` was provided, additionally filter out phases where `number > TO_PHASE` (use numeric comparison). This limits execution to phases up through the target phase.

**Apply `--only N` filter:** If `ONLY_PHASE` was provided, additionally filter OUT phases where `number != ONLY_PHASE`. This means the phase list will contain exactly one phase (or zero if already complete).

**If `TO_PHASE` is set and no phases remain:**

```
All phases through ${TO_PHASE} are already completed. Nothing to do.
```

Exit cleanly.

**If `ONLY_PHASE` is set and no phases remain:**

```
Phase ${ONLY_PHASE} is already complete. Nothing to do.
```

Exit cleanly.

**Sort by `number`** in numeric ascending order.

**If no incomplete phases remain:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► AUTONOMOUS ▸ COMPLETE 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 All phases complete! Nothing left to do.
```

Exit cleanly.

**Display phase plan:**

```
## Phase Plan

| # | Phase | Status |
|---|-------|--------|
| 5 | Skill Scaffolding & Phase Discovery | In Progress |
| 6 | Smart Discuss | Not Started |
| 7 | Auto-Chain Refinements | Not Started |
| 8 | Lifecycle Orchestration | Not Started |
```

For each phase, extract `phase_name`, `goal`, `success_criteria` by reading its section in ROADMAP.md. Store for use in execute_phase and transition messages.

Use TaskCreate to register a task per incomplete phase.

</step>

Next: Read `.rcode/workflows/autonomous/steps/03-phase-discuss.md` before starting it (skip it if its Read-when condition is false).
