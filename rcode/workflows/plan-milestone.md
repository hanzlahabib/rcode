<purpose>
Plan all phases in a milestone using parallel dependency-wave execution. Closes #732.
Groups independent phases into waves, spawns rcode-planner agents concurrently per wave, and verifies each SPRINT.md with rcode-sprint-checker before advancing.
</purpose>

<required_reading>
@.rcode/references/output-format.md
@.rcode/references/revision-loop.md
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

## 1. Parse arguments and load context

Parse `$ARGUMENTS`:
- `--milestone <name>` — filter to a named milestone (optional)
- `--dry-run` — show wave plan without spawning agents
- `--skip-research` — skip rcode-phase-researcher for all phases
- `--wave <N>` — start from wave N (resume after partial failure)

```bash
INIT_JSON=$(node ".rcode/bin/rcode-tools.cjs" state read 2>/dev/null || echo '{}')
ROADMAP_PHASES=$(node ".rcode/bin/rcode-tools.cjs" roadmap list-phases 2>/dev/null || echo '[]')
```

## 2. Build dependency wave graph

Read ROADMAP.md. For each planned phase:
1. Extract its `**Dependencies:**` line (if present) — list of phase numbers it depends on.
2. Phases with no dependencies → Wave 1.
3. Phases whose all dependencies are in Wave N → Wave N+1.
4. Repeat until all phases are assigned.

**Display wave plan:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► PLAN MILESTONE: {MILESTONE_NAME}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wave 1 (parallel): Phase {N1}, Phase {N2}
Wave 2 (parallel): Phase {N3}
Wave 3 (serial):   Phase {N4}  ← depends on N3
```

If `--dry-run`: print the plan and exit.

## 3. Execute waves sequentially, phases in parallel

For each wave:

**3a. Spawn rcode-planner agents in parallel (one per phase in wave):**

Use `run_in_background: true` for each Agent dispatch. Wait for all to complete before next wave.

```
◆ Wave {N}: planning {count} phase(s) in parallel...
  - Phase {N1}: {name}
  - Phase {N2}: {name}
```

Each planner agent receives:
- Phase number, name, goal from ROADMAP
- `--skip-research` if flag is set
- Research from RESEARCH.md if it exists

**3b. Verify each SPRINT.md with rcode-sprint-checker:**

After all planners in the wave complete, spawn rcode-sprint-checker for each SPRINT.md (in parallel, same run_in_background pattern). Collect CHECK.md results.

On `FAIL` for any phase:
```
⚠ Phase {N} sprint-checker FAIL — entering revision loop (max 2 iterations)
```
Spawn a revision planner with checker feedback. Max 2 revision rounds per phase.

**3c. Advance to next wave:**

Only advance when all phases in the current wave have a passing CHECK.md.

## 4. Completion summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► MILESTONE PLANNED ✓  {MILESTONE_NAME}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Waves: {N}
Phases planned: {M}
SPRINT.md files created: {M}

Next step: /rcode-execute-milestone
```

## Output Format

Open with wave-plan banner (step 2). Per-phase progress indicators. Closure banner (step 4).

## Examples

**Happy path:** `/rcode-plan-milestone` → plans all pending phases in parallel dependency waves.

**Skip research:** `/rcode-plan-milestone --skip-research` → faster, uses CONTEXT.md if available.

**Resume:** `/rcode-plan-milestone --wave 2` → skip wave 1 (already planned), start from wave 2.

**Dry run:** `/rcode-plan-milestone --dry-run` → print wave assignment, exit.
