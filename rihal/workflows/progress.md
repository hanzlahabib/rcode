<purpose>
Check project progress, summarize recent work and what's ahead, then intelligently route to the next action — either executing an existing plan or creating the next one. Provides situational awareness before continuing work.

For a quick board view use `/rihal:sprint-status`. This gives the full narrative + routing.

**SSOT:** `.rihal/state.json` is the single source of truth for phase counts and current position. `/rihal:progress` and `/rihal:status` MUST agree. When this workflow reads `ROADMAP.md` for human-readable goal text, it must first verify that `state.json` is in sync — if not, surface a drift warning and suggest `node .rihal/bin/rihal-tools.cjs state sync --from-disk`. See issue #131.
</purpose>

<required_reading>
@.rihal/references/output-format.md

Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<output_format>
Print a progress header using banner format from output-format.md:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Use status symbols (✓ complete, ◆ in_progress, ○ planned) throughout.
End with a Next Up block (see output-format.md) when a routing suggestion applies.
</output_format>

<process>

<step name="init_context">

## 1. Init context

**Load progress context:**

```bash
INIT=$(node .rihal/bin/rihal-tools.cjs init progress 2>/dev/null || node .rihal/bin/rihal-tools.cjs init)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
STATE=$(node .rihal/bin/rihal-tools.cjs state read 2>/dev/null || echo '{}')

# Drift check — detect state/disk divergence (issue #131)
if [ -f .planning/ROADMAP.md ]; then
  DISK_PHASES=$(grep -cE "^\|\s*[0-9]{1,3}" .planning/ROADMAP.md)
  STATE_PHASES=$(echo "$STATE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const s=JSON.parse(d);console.log((s.state?.phases||s.phases||[]).length)}catch{console.log(0)}}")
  if [ "$DISK_PHASES" -gt 0 ] && [ "$DISK_PHASES" -ne "$STATE_PHASES" ]; then
    echo "⚠ Drift: ROADMAP.md has $DISK_PHASES phases, state.json has $STATE_PHASES. Run: node .rihal/bin/rihal-tools.cjs state sync --from-disk"
  fi
fi
```

Extract from init/state JSON: `project_exists`, `roadmap_exists`, `state_exists`, `phases`, `current_phase`, `next_phase`, `milestone_version`, `completed_count`, `phase_count`, `paused_at`, `state_path`, `roadmap_path`, `project_path`, `config_path`.

```bash
DISCUSS_MODE=$(node .rihal/bin/rihal-tools.cjs config 2>/dev/null | grep -oE '"discuss_mode"\s*:\s*"[^"]*"' | cut -d'"' -f4 || echo "discuss")
```

If `project_exists` is false (no `.planning/` directory and no `.rihal/state.json`):

```
No planning structure found.

Run /rihal:new-project to start a new project.
```

Exit.

If missing STATE.md: suggest `/rihal:new-project`.

**If ROADMAP.md missing but PROJECT.md exists:**

This means a milestone was completed and archived. Go to **Route F** (between milestones).

If missing both ROADMAP.md and PROJECT.md: suggest `/rihal:new-project`.
</step>

<step name="load">

## 2. Load

Use structured extraction — prefer targeted reads over dumping full files:

- `STATE=$(node .rihal/bin/rihal-tools.cjs state read)` — decisions, blockers, current_phase
- `cat .planning/ROADMAP.md` — phase list
- Inspect `.planning/phases/*/` for PLAN.md, SPRINT.md, SUMMARY.md presence

This minimizes orchestrator context usage.
</step>

<step name="analyze_roadmap">

## 3. Analyze roadmap

Parse ROADMAP.md sections into an internal phases array. For each phase, record:
- number
- name
- goal
- dependencies (from "Depends on" lines if present)
- `disk_status` — `complete` (SUMMARY.md exists), `partial` (PLAN.md/SPRINT.md exists without SUMMARY.md), `planned` (directory exists, no plan yet), `empty` (directory exists but empty), `no_directory` (not yet scaffolded)
- plan_count, summary_count

Aggregate: total plans, summaries, progress percent. Identify current and next phase.
</step>

<step name="recent">

## 4. Recent work

Gather recent work context:

```bash
# Last 10 commits
git log --oneline -10 2>/dev/null

# 2-3 most recent SUMMARY.md files
(find .planning/phases -name "SUMMARY.md" -o -name "*-SUMMARY.md" 2>/dev/null) | xargs -r ls -t 2>/dev/null | head -3
```

Read the 2-3 most recent SUMMARY.md files. Extract the first one-liner line (often under a `## One-liner` or `## Summary` heading, or the first non-empty paragraph after the H1). This shows "what we've been working on".
</step>

<step name="position">

## 5. Position

Parse current position from init context and roadmap analysis:

- Use `current_phase` and `next_phase` from the parsed roadmap
- Note `paused_at` if work was paused (from `$STATE`)
- Count pending todos: `node .rihal/bin/rihal-tools.cjs state read | grep -c '"status":"pending"' 2>/dev/null || echo 0`
- Check for active debug sessions: `(ls .planning/debug/*.md 2>/dev/null || true) | grep -v resolved | wc -l`
</step>

<step name="report">

## 6. Report

Generate a simple text progress bar (e.g., `[████░░░░] 50%`) where filled is proportional to `completed_count / phase_count`.

Present:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# [Project Name]

**Progress:** [████░░░░] {completed_count}/{phase_count} phases
**Profile:** [quality/balanced/budget/inherit]
**Discuss mode:** {DISCUSS_MODE}

## Recent Work
- [Phase X, Plan Y]: [what was accomplished - 1 line from SUMMARY.md]
- [Phase X, Plan Z]: [what was accomplished]

## Current Position
Phase [N] of [total]: [phase-name]
Plan [M] of [phase-total]: [status]
CONTEXT: [✓ if CONTEXT.md exists | - if not]

## Key Decisions Made
- [extract from $STATE.decisions[]]

## Blockers/Concerns
- [extract from $STATE.blockers[]]

## Pending Todos
- [count] pending — /rihal:check-todos to review

## Active Debug Sessions
- [count] active — /rihal:debug to continue
(Only show this section if count > 0)

## What's Next
[Next phase/plan objective from roadmap analysis]
```

</step>

<step name="route">

## 7. Route

Determine next action based on verified counts.

**Step 1: Count plans, summaries, and UAT in current phase**

List files in the current phase directory:

```bash
CUR_DIR=".planning/phases/[current-phase-dir]"
(ls -1 ${CUR_DIR}/*-PLAN.md ${CUR_DIR}/PLAN.md ${CUR_DIR}/SPRINT.md 2>/dev/null || true) | wc -l
(ls -1 ${CUR_DIR}/*-SUMMARY.md ${CUR_DIR}/SUMMARY.md 2>/dev/null || true) | wc -l
(ls -1 ${CUR_DIR}/*-UAT.md ${CUR_DIR}/UAT.md 2>/dev/null || true) | wc -l
```

State: "This phase has {X} plans, {Y} summaries."

**Step 1.5: Check for unaddressed UAT gaps**

```bash
grep -l "status: diagnosed\|status: partial" ${CUR_DIR}/*-UAT.md ${CUR_DIR}/UAT.md 2>/dev/null || true
```

Track:
- `uat_with_gaps`: UAT.md files with status "diagnosed" (gaps need fixing)
- `uat_partial`: UAT.md files with status "partial" (incomplete testing)

**Step 1.6: Cross-phase health check**

Since rihal-tools does not expose `audit-uat --raw`, do a quick scan:

```bash
OUTSTANDING_UAT=$(grep -rl "status: diagnosed\|status: partial\|status: pending\|status: blocked\|status: skipped\|status: human_needed" .planning/phases/*/UAT*.md .planning/phases/*/*-UAT.md 2>/dev/null | wc -l)
```

Track: `outstanding_debt` — count of files with outstanding verification items.

**If outstanding_debt > 0:** Add a warning section to the progress report output (in the `report` step), placed between "## What's Next" and the route suggestion:

```markdown
## Verification Debt ({N} files across prior phases)

| Phase | File | Issue |
|-------|------|-------|
| {phase} | {filename} | {pending_count} pending, {skipped_count} skipped, {blocked_count} blocked |
| {phase} | {filename} | human_needed — {count} items |

Review: `/rihal:audit-uat` — full cross-phase audit
Resume testing: `/rihal:verify-work {phase}` — retest specific phase
```

This is a WARNING, not a blocker — routing proceeds normally.

**Step 2: Route based on counts**

| Condition | Meaning | Action |
|-----------|---------|--------|
| uat_partial > 0 | UAT testing incomplete | Go to **Route E.2** |
| uat_with_gaps > 0 | UAT gaps need fix plans | Go to **Route E** |
| paused_at set | Work was paused | Go to **Route Paused** |
| summaries < plans | Unexecuted plans exist | Go to **Route A** |
| summaries = plans AND plans > 0 | Phase complete | Go to Step 3 |
| plans = 0 | Phase not yet planned | Go to **Route B** |

---

**Route A: Unexecuted plan exists**

Find the first PLAN.md or SPRINT.md without matching SUMMARY.md.
Read its `<objective>` or goal section.

```
---

## ▶ Next Up

**{phase}-{plan}: [Plan Name]** — [objective summary from PLAN.md]

`/clear` then:

`/rihal:execute {phase}`

---

**Also available:**
- `/rihal:sprint-status` — detailed sprint board
- `/rihal:next` — auto-advance (zero friction)
```

---

**Route B: Phase needs planning**

Check if `{phase_num}-CONTEXT.md` or `CONTEXT.md` exists in phase directory.

Check if current phase has UI indicators:

```bash
PHASE_SECTION=$(sed -n "/^## Phase ${CURRENT_PHASE}/,/^## Phase /p" .planning/ROADMAP.md)
PHASE_HAS_UI=$(echo "$PHASE_SECTION" | grep -qiE "UI hint.*yes|UI|interface|frontend|component|layout|page|screen|dashboard" && echo "true" || echo "false")
```

**If CONTEXT.md exists:**

```
---

## ▶ Next Up

**Phase {N}: {Name}** — {Goal from ROADMAP.md}
<sub>✓ Context gathered, ready to plan</sub>

`/clear` then:

`/rihal:plan {phase-number}`

---
```

**If CONTEXT.md does NOT exist AND phase has UI:**

```
---

## ▶ Next Up

**Phase {N}: {Name}** — {Goal from ROADMAP.md}

`/clear` then:

`/rihal:discuss-phase {phase}` — gather context and clarify approach

---

**Also available:**
- `/rihal:ui-phase {phase}` — generate UI design contract (recommended for frontend phases)
- `/rihal:plan {phase}` — skip discussion, plan directly

---
```

**If CONTEXT.md does NOT exist AND phase has no UI:**

```
---

## ▶ Next Up

**Phase {N}: {Name}** — {Goal from ROADMAP.md}

`/clear` then:

`/rihal:discuss-phase {phase}` — gather context and clarify approach

---

**Also available:**
- `/rihal:plan {phase}` — skip discussion, plan directly

---
```

---

**Route E: UAT gaps need fix plans**

UAT.md exists with gaps (diagnosed issues). User needs to plan fixes.

```
---

## ⚠ UAT Gaps Found

**{phase_num}-UAT.md** has {N} gaps requiring fixes.

`/clear` then:

`/rihal:plan {phase} --gaps`

---

**Also available:**
- `/rihal:execute {phase}` — execute phase plans
- `/rihal:verify-work {phase}` — run more UAT testing

---
```

---

**Route E.2: UAT testing incomplete (partial)**

UAT.md exists with `status: partial` — testing session ended before all items resolved.

```
---

## Incomplete UAT Testing

**{phase_num}-UAT.md** has {N} unresolved tests (pending, blocked, or skipped).

`/clear` then:

`/rihal:verify-work {phase}` — resume testing from where you left off

---

**Also available:**
- `/rihal:audit-uat` — full cross-phase UAT audit
- `/rihal:execute {phase}` — execute phase plans

---
```

---

**Route Paused**

State shows `paused_at`:

```
---

## Paused

Work was paused at phase {N}. Context saved.

`/rihal:resume-work` — restore context and continue

---
```

---

**Step 3: Check milestone status (only when phase complete)**

Read ROADMAP.md and identify:
1. Current phase number
2. All phase numbers in the current milestone section

State: "Current phase is {X}. Milestone has {N} phases (highest: {Y})."

**Route based on milestone status:**

| Condition | Meaning | Action |
|-----------|---------|--------|
| current phase < highest phase | More phases remain | Go to **Route C** |
| current phase = highest phase | Milestone complete | Go to **Route D** |

---

**Route C: Phase complete, more phases remain**

Read ROADMAP.md to get the next phase's name and goal. Check if the next phase has UI indicators:

```bash
NEXT_PHASE_SECTION=$(sed -n "/^## Phase $((Z+1))/,/^## Phase /p" .planning/ROADMAP.md)
NEXT_HAS_UI=$(echo "$NEXT_PHASE_SECTION" | grep -qiE "UI hint.*yes|UI|interface|frontend|component|layout|page|screen|dashboard" && echo "true" || echo "false")
```

**If next phase has UI:**

```
---

## ✓ Phase {Z} Complete

## ▶ Next Up

**Phase {Z+1}: {Name}** — {Goal from ROADMAP.md}

`/clear` then:

`/rihal:discuss-phase {Z+1}` — gather context and clarify approach

---

**Also available:**
- `/rihal:ui-phase {Z+1}` — generate UI design contract (recommended for frontend phases)
- `/rihal:plan {Z+1}` — skip discussion, plan directly
- `/rihal:verify-work {Z}` — user acceptance test before continuing

---
```

**If next phase has no UI:**

```
---

## ✓ Phase {Z} Complete

## ▶ Next Up

**Phase {Z+1}: {Name}** — {Goal from ROADMAP.md}

`/clear` then:

`/rihal:discuss-phase {Z+1}` — gather context and clarify approach

---

**Also available:**
- `/rihal:plan {Z+1}` — skip discussion, plan directly
- `/rihal:verify-work {Z}` — user acceptance test before continuing

---
```

---

**Route D: Milestone complete**

```
---

## 🎉 Milestone Complete

All {N} phases finished!

## ▶ Next Up

**Complete Milestone** — archive and prepare for next

`/clear` then:

`/rihal:complete-milestone`

---

**Also available:**
- `/rihal:audit-milestone` — cross-phase audit before archiving
- `/rihal:verify-work` — user acceptance test before completing milestone

---
```

---

**Route F: Between milestones (ROADMAP.md missing, PROJECT.md exists)**

A milestone was completed and archived. Ready to start the next milestone cycle.

Read MILESTONES.md to find the last completed milestone version.

```
---

## ✓ Milestone v{X.Y} Complete

Ready to plan the next milestone.

## ▶ Next Up

**Start Next Milestone** — questioning → research → requirements → roadmap

`/clear` then:

`/rihal:new-milestone`

---
```

</step>

<step name="edge_cases">

## 8. Edge cases

- Phase complete but next phase not planned → offer `/rihal:plan [next]`
- All work complete → offer milestone completion
- Blockers present → highlight before offering to continue
- Handoff file exists (`.rihal/HANDOFF.json` or `.continue-here.md`) → mention it, offer `/rihal:resume-work`
- Sprint is active with stories remaining → offer `/rihal:execute` with SPRINT.md path
- No SPRINT.md yet for current phase → offer `/rihal:sprint-planning --phase {N}`
</step>

</process>

<success_criteria>

- [ ] Rich context provided (recent work, decisions, issues)
- [ ] Current position clear with visual progress
- [ ] What's next clearly explained
- [ ] Smart routing: /rihal:execute if plans exist, /rihal:plan if not, /rihal:discuss-phase if no CONTEXT.md
- [ ] User confirms before any action
- [ ] Seamless handoff to appropriate /rihal: command
- [ ] Paused state surfaced with /rihal:resume-work
- [ ] UAT gaps surfaced with /rihal:plan --gaps or /rihal:verify-work
- [ ] Cross-phase verification debt surfaced as a warning (non-blocking)
- [ ] Between-milestone state surfaced with /rihal:new-milestone
</success_criteria>
