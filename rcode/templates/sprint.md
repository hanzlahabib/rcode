# Sprint {sprint_id} — {sprint_goal}

<!-- P2: Omit Dependencies and Risks sections if empty. Omit Retrospective until sprint is complete. -->

**Phase:** {phase_number} — {phase_name}
**Status:** {status}
**Velocity target:** {velocity_target} points
**Started:** {started_at}

## Sprint Goal

{sprint_goal}

## Stories

<!-- One <task> block per story. id= and <title> are REQUIRED (scanner.js's primary parse path) -->
<tasks>
<task id="{sprint_id}.{NN}" type="auto">
<title>{story title}</title>
<read_first>{files + line ranges the executor must read before writing}</read_first>
<files>{exact paths this task creates/modifies}</files>
<action>{specific implementation instructions}</action>
<verify>
  <automated>{command < 60 sec}</automated>
</verify>
<done>{measurable acceptance criteria}</done>
<evidence>{grep/lines/creates evidence per issue #649}</evidence>
</task>
</tasks>

## Capacity

- **Velocity target:** {velocity_target} points
- **Total committed:** {total_points} points
- **Buffer:** {buffer_points} points ({buffer_pct}%)

<!-- Omit if no cross-story dependencies exist -->
## Dependencies

| Story | Depends on | Status |
|-------|-----------|--------|

<!-- Omit if no risks identified -->
## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|

## Files Touched

<!-- Planner must populate before handoff to executor. Used by wave-overlap checker and merge reviewers. -->

**Creates:**
<!-- - `exact/path/new-file.ts` — one-line responsibility -->

**Modifies:**
<!-- - `exact/path/existing.ts` — what changes -->

**Tests:**
<!-- - `tests/exact/path/test.ts` — tests for -->

**Aggregator files (append-only — never replace):**
<!-- - `packages/shared/src/index.ts` — adds export for X -->

## Sprint Review

<!-- Fill at sprint completion only — omit this section until then -->
- Stories completed: {done_count}/{total_count}
- Velocity actual: {velocity_actual} points
- Carryover: {carryover}

## Retrospective

<!-- Fill at sprint completion only — omit this section until then -->
### What went well
-
### What didn't
-
### Action items
-
