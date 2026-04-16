<purpose>
Check project progress, summarize recent work and what's ahead, then route to the next action. Provides situational awareness before continuing work.

For a quick board view use `/rihal:sprint-status`. This gives the full narrative + routing.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="init_context">
**Load project state:**

```bash
STATE=$(node .rihal/bin/rihal-tools.cjs state read 2>/dev/null || echo '{}')
SPRINT=$(node .rihal/bin/rihal-tools.cjs state sprint status 2>/dev/null || echo '{}')
VELOCITY=$(node .rihal/bin/rihal-tools.cjs state sprint velocity 2>/dev/null || echo '{}')
SPRINTS=$(node .rihal/bin/rihal-tools.cjs state sprint list 2>/dev/null || echo '[]')
```

Read `.planning/STATE.md` and `.planning/ROADMAP.md` if they exist.

If no `.planning/` directory AND no `.rihal/state.json`:
```
No project found. Run `/rihal:new-project` to start.
```
Exit.

If `.planning/ROADMAP.md` missing but `.planning/PROJECT.md` exists:
Milestone was completed and archived → Route F (between milestones).
</step>

<step name="load_recent">
**Gather recent work context:**

```bash
# Recent git commits (last 10)
git log --oneline -10 2>/dev/null

# Recent SUMMARY.md files (if any)
find .planning/phases -name "SUMMARY.md" -newer .planning/STATE.md 2>/dev/null | head -3
```

This shows what was recently worked on.
</step>

<step name="build_report">
**Build progress report:**

From state JSON extract:
- Milestone name
- All phases with status (complete / planned)
- Current phase + sprint
- Velocity history

Display:

```
## Rihal Progress

**Milestone:** {milestone_name}
**Phases:** {completed}/{total} complete

| Phase | Status | Sprint |
|-------|--------|--------|
| 01 — {name} | complete | — |
| 02 — {name} | complete | — |
| 03 — {name} | active | 03.1 (5/8 stories, 8/13 pts) |
| 04 — {name} | planned | — |

**Current Sprint:** {sprint_id} — {goal}
  Stories: {done}/{total} | Points: {done_pts}/{total_pts}
  Velocity avg: {avg} pts/sprint ({sprint_count} sprints)

**Recent Work:**
  - {commit_1_subject}
  - {commit_2_subject}
  - {commit_3_subject}
```
</step>

<step name="route">
**Determine next action and display routing:**

**Route A: Sprint has incomplete stories**
Active sprint with stories in todo/in_progress:

```
## Next Up

Sprint {sprint_id} has {remaining} stories remaining ({remaining_pts} pts).

`/rihal:execute .planning/phases/{phase}/SPRINT.md` — continue executing

Also available:
- `/rihal:sprint-status` — detailed sprint board
- `/rihal:next` — auto-advance (zero friction)
```

---

**Route B: Sprint complete, more phases remain**
All stories done in current sprint, next phase exists:

```
## Sprint Complete

Sprint {sprint_id} finished. Velocity: {actual} pts.

Next phase: **{next_phase_name}**

`/rihal:sprint-planning --phase {next_phase}` — plan the next sprint

Also available:
- `/rihal:council {question}` — discuss approach first
```

---

**Route C: All phases complete**

```
## Milestone Complete

All {N} phases finished.

`/rihal:complete-milestone` — archive and prepare next cycle

Also available:
- `/rihal:audit-milestone` — audit completion before archiving
```

---

**Route D: No sprint yet for current phase**
Phase exists but no SPRINT.md:

```
## Phase Ready, No Sprint

Phase {N} — {name} has no sprint yet.

`/rihal:sprint-planning --phase {N}` — create sprint with stories

Also available:
- `/rihal:council should we {question}?` — discuss approach first
```

---

**Route E: Paused**
State shows paused_at:

```
## Paused

Work was paused at phase {N}. Context saved.

`/rihal:resume-work` — restore context and continue
```

---

**Route F: Between milestones**
PROJECT.md exists but no ROADMAP.md (milestone archived):

```
## Between Milestones

Previous milestone archived. Ready for next cycle.

`/rihal:new-milestone` — start next milestone
```
</step>

</process>

<success_criteria>
- [ ] Project state loaded from state.json + STATE.md
- [ ] Progress report shows phases, sprint, velocity, recent work
- [ ] Correct route determined and displayed with actionable command
- [ ] Route matches actual project state (not stale)
</success_criteria>
