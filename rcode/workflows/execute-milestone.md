<purpose>
Execute all phases in the current milestone in dependency order, with verify gates between waves. Closes #738.
Reads the ROADMAP.md to determine phase ordering, executes each phase via /rcode-execute, runs /rcode-verify-phase after each, and surfaces blockers before advancing.
</purpose>

<required_reading>
@.rcode/references/output-format.md
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

## 1. Parse arguments and load context

Parse `$ARGUMENTS`:
- `--milestone <name>` — filter to a named milestone (optional; default: current milestone from state)
- `--dry-run` — show execution plan without spawning agents
- `--skip-verify` — skip the verify gate between phases (fast mode, not recommended)
- `--wave <N>` — start from wave N (resume after partial failure)
- `--phase <N>` — execute only this phase (single-phase mode)

```bash
INIT_JSON=$(node ".rcode/bin/rcode-tools.cjs" state read 2>/dev/null || echo '{}')
CURRENT_MILESTONE=$(echo "$INIT_JSON" | grep -o '"current_milestone":"[^"]*"' | cut -d'"' -f4 || echo '')
MILESTONE_TARGET="${MILESTONE_ARG:-$CURRENT_MILESTONE}"
```

## 2. Load phase dependency order

Read `.planning/ROADMAP.md` and extract phases for the target milestone in order. For each phase, note its status in `state.json`.

```bash
ROADMAP_PHASES=$(node ".rcode/bin/rcode-tools.cjs" roadmap list-phases 2>/dev/null || echo '[]')
```

Filter to phases with status `planned` or `in_progress`. Already `complete` phases are skipped unless `--force` is passed.

**Display execution plan:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► EXECUTE MILESTONE: {MILESTONE_TARGET}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phases to execute:
  Phase {N1}: {name} [planned]
  Phase {N2}: {name} [planned]
  ...

Verify gates: {enabled|disabled}
```

If `--dry-run`: print the plan and exit without executing.

## 3. Execute phases in dependency wave order

For each pending phase (in ROADMAP order):

**3a. Pre-phase gate:**
```bash
READINESS=$(node ".rcode/bin/rcode-tools.cjs" check-implementation-readiness --phase "${PHASE_NUMBER}" 2>/dev/null)
READY=$(echo "$READINESS" | grep -o '"ready":true' | grep -c . || echo 0)
```

If `READY == 0` and `--skip-verify` is NOT set, print blockers and pause:
```
⛔ Phase {N} readiness check failed:
{blockers}

Options:
  1. Fix blockers and re-run /rcode-execute-milestone
  2. Skip this phase (--skip N) and continue
  3. Abort milestone execution
```

**3b. Execute the phase:**
```
◆ Executing Phase {N}: {name}...
```

Invoke `/rcode-execute {PHASE_NUMBER}` via Skill or Agent dispatch.

**3c. Verify gate (unless --skip-verify):**

After each phase execution completes:
```bash
VERIFY_RESULT=$(node ".rcode/bin/rcode-tools.cjs" state read | grep -o '"status":"[^"]*"' | head -1 || echo '"status":"unknown"')
```

Spawn `rcode-verifier` for the phase. On `FAIL` or `PARTIAL`:
```
⚠ Verify gate: Phase {N} — {FAIL|PARTIAL}

Gap count: {N}
Recommendation: Run /rcode-plan {N} --gaps to close before advancing.

Options:
  1. Close gaps now (spawn /rcode-plan --gaps)  [Recommended]
  2. Advance anyway (log gap, continue to next phase)
  3. Abort milestone execution
```

**3d. Record completion:**
```bash
node ".rcode/bin/rcode-tools.cjs" state set-phase "${PHASE_NAME}" 2>/dev/null || true
```

## 4. Milestone completion summary

After all phases complete:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► MILESTONE COMPLETE ✓  {MILESTONE_TARGET}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phases executed:   {N}
Phases skipped:    {M}
Verify gaps found: {K}

Next step: /rcode-complete-milestone
```

## Output Format

Open with banner (see step 2). Closure banner (see step 4).

Per-phase lines:
```
✓ Phase {N}: {name} — complete
⚠ Phase {N}: {name} — partial (gaps logged)
✗ Phase {N}: {name} — failed (blocked)
```

## Examples

**Happy path:** `/rcode-execute-milestone` → executes all planned phases in order with verify gates.

**Single phase:** `/rcode-execute-milestone --phase 7` → equivalent to `/rcode-execute 7` but with the milestone verify gate wired in.

**Resume:** `/rcode-execute-milestone --wave 3` → skip waves 1-2 (already complete), start from wave 3.

**Dry run:** `/rcode-execute-milestone --dry-run` → print execution plan, exit.

## Next Up

- `/rcode-complete-milestone` — mark the milestone done after all phases pass verification
- `/rcode-ship` — push the branch and open a PR
