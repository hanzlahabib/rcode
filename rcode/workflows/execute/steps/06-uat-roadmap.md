# execute - step 06: UAT gate, update ROADMAP, auto-copy learnings, update PROJECT.md, completion notification

This step file was split verbatim out of `workflows/execute.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<step name="uat_gate" priority="blocker">
**UAT gate:**

Before marking the phase complete, verify a passing VERIFICATION.md exists for this phase. Without it, the phase advances to `status: executed` (work done, awaiting verification) — not `status: complete`.

```bash
VERIFICATION_FILE=$(ls "${PHASE_DIR}"/*-VERIFICATION.md 2>/dev/null | head -1)

if [ -z "$VERIFICATION_FILE" ]; then
  VERIFICATION_STATUS="missing"
elif grep -qE "^status:[[:space:]]*passed" "$VERIFICATION_FILE" 2>/dev/null; then
  if grep -qE "^falsification:[[:space:]]*(upheld|human-accepted)" "$VERIFICATION_FILE" 2>/dev/null; then
    VERIFICATION_STATUS="pass"
  else
    VERIFICATION_STATUS="unfalsified"
  fi
elif grep -qE "^status:[[:space:]]*(gaps_found|fail)" "$VERIFICATION_FILE" 2>/dev/null; then
  VERIFICATION_STATUS="fail"
else
  VERIFICATION_STATUS="indeterminate"
fi
```

**If `VERIFICATION_STATUS` is `missing` or `indeterminate`:**

1. Mark the phase as `status: executed` (NOT `complete`) via:
   ```bash
   node ".rcode/bin/rcode-tools.cjs" phase set-status "${PHASE_NUMBER}" executed
   ```
2. Print the mandatory UAT checklist:
   ```
   ⚠ Phase {X} EXECUTED but not yet verified.

   The following task completion criteria require human verification before
   the phase can advance to `status: complete`:

   {list each task's <done> sentence from SPRINT.md}

   Recommended next steps:
   /rcode-add-tests {X} — generate unit + E2E tests before UAT
   /rcode-verify-work {X} — perform UAT and produce VERIFICATION.md

   /rcode-next will refuse to advance until the UAT gate passes.
   ```
3. STOP the workflow. Do NOT proceed to `update_roadmap`. Do NOT call `phase complete`.

**If `VERIFICATION_STATUS` is `unfalsified`** (a VERIFICATION.md says `status: passed` but carries no `falsification:` key):

A `passed` with no falsification stamp means the adversarial falsification pass never ran — the verifier self-certified. Per execute-verify-phase-goal.md L112, treat it as unverified: do NOT print the COMPLETE banner.

1. Mark the phase `status: executed` (not `complete`) via `node ".rcode/bin/rcode-tools.cjs" phase set-status "${PHASE_NUMBER}" executed`.
2. Print:
   ```
   ⚠ Phase {X} VERIFIED but not FALSIFIED.

   VERIFICATION.md says `status: passed`, but the falsification pass never
   stamped it (`falsification: upheld`). A pass that was never adversarially
   challenged is the executor grading its own homework.

   Re-run verification so the falsification pass executes, or have a human
   confirm the `<done>` criteria and stamp the file:
     falsification: human-accepted

   /rcode-next will refuse to advance until then.
   ```
3. STOP. Do NOT call `phase complete`.

**If `VERIFICATION_STATUS` is `fail`:**

1. Mark the phase as `status: executed` (so /rcode-plan --gaps can run a closure cycle).
2. Surface the tasks whose `<done>` criteria failed human verification.
3. STOP. Don't mark complete on a failing verification.

**Only when `VERIFICATION_STATUS` is `pass`** — print the closure banner, then proceed to `update_roadmap` below. Read the stamp so the user knows *which kind* of verification cleared the gate:
```bash
FALSIFICATION=$(grep -oE "^falsification:[[:space:]]*[a-z-]+" "$VERIFICATION_FILE" 2>/dev/null | head -1 | sed 's/^falsification:[[:space:]]*//')
```
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► PHASE {NN} COMPLETE ✓  (verified: {FALSIFICATION — "upheld" | "human-accepted"})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
This is the only point in `<process>` where the banner may be emitted — never
print it right after the wave loop finishes, and never before this gate
resolves to `pass`.

The previous behaviour (printing "Next Up: /rcode-verify-work" without state-gating) caused phases to reach `status: complete` without any human-verified UAT.
</step>

<step name="update_roadmap">
**Mark phase complete and update all tracking files:**

```bash
COMPLETION=$(node ".rcode/bin/rcode-tools.cjs" phase complete "${PHASE_NUMBER}")
```

Record execution telemetry (plan count + latest commit hash):
```bash
EXEC_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "")
REC=$(node ".rcode/bin/rcode-tools.cjs" state record-execution \
  --plan "${PHASE_NUMBER}" \
  --tasks "${PLAN_COUNT}" \
  --hash "${EXEC_HASH}" 2>&1) || echo "WARN: record-execution failed: $REC"
```

**Do not swallow this call's output.** It previously ended in
`2>/dev/null || true`, which is how a project reached 35 executed sprints with
`executions: 0` in state.json — the ledger write was failing (or never firing)
and nothing said so. If `REC` is empty or contains an error, report it in the
execution summary rather than continuing silently.

The CLI handles:
- Marking phase checkbox `[x]` with completion date
- Updating Progress table (Status → Complete, date)
- Updating plan count to final
- Advancing STATE.md to next phase
- Updating REQUIREMENTS.md traceability
- Scanning for verification debt (returns `warnings` array)

Extract from result: `next_phase`, `next_phase_name`, `is_last_phase`, `warnings`, `has_warnings`, `open_phases_remaining`, `nudge`.

**If `nudge` is present (#943 — no open phases remain, milestone finished):**
Surface it verbatim so the user is guided forward instead of stranded:
```
✓ Milestone complete — all phases done.
{nudge}
```
Do not auto-advance past a finished milestone; let the user choose
`/rcode-complete-milestone` or `/rcode-new-milestone`.

**If has_warnings is true:**
```
## Phase {X} marked complete with {N} warnings:

{list each warning}

These items are tracked and will appear in `/rcode-progress` and `/rcode-audit-uat`.
```

```bash
node ".rcode/bin/rcode-tools.cjs" commit "docs(phase-{X}): complete phase execution" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md {phase_dir}/*-VERIFICATION.md
```
</step>

<step name="auto_copy_learnings">
**Auto-copy phase learnings to global store (when enabled).**

**Check config gate:**
```bash
GL_ENABLED=$(node ".rcode/bin/rcode-tools.cjs" config-get features.global_learnings --raw 2>/dev/null || echo "false")
```

**If `GL_ENABLED` is not `true`:** Skip this step entirely (feature disabled by default).
${GL_ENABLED === 'true' ? '@.rcode/references/execute-auto-copy-learnings.md' : ''}
</step>

<step name="update_project_md">
**Evolve PROJECT.md to reflect phase completion (prevents planning document drift — #956):**

PROJECT.md tracks validated requirements, decisions, and current state. Without this step,
PROJECT.md falls behind silently over multiple phases.

1. Read `.planning/PROJECT.md`
2. If the file exists and has a `## Validated Requirements` or `## Requirements` section:
   - Move any requirements validated by this phase from Active → Validated
   - Add a brief note: `Validated in Phase {X}: {Name}`
3. If the file has a `## Current State` or similar section:
   - Update it to reflect this phase's completion (e.g., "Phase {X} complete — {one-liner}")
4. Update the `Last updated:` footer to today's date
5. Commit the change:

```bash
node ".rcode/bin/rcode-tools.cjs" commit "docs(phase-{X}): evolve PROJECT.md after phase completion" --files .planning/PROJECT.md
```

**Skip this step if** `.planning/PROJECT.md` does not exist.
</step>

<step name="notify_on_completion">
**Post phase completion to configured webhooks (Slack / Discord / MS Teams).**

Silent no-op if no webhook URLs are in `.rcode/config.yaml`. Failures are reported but never block the workflow.

```bash
WEBHOOK_CONFIGURED=$(node ".rcode/bin/rcode-tools.cjs" config-get slack_webhook_url 2>/dev/null; node ".rcode/bin/rcode-tools.cjs" config-get discord_webhook_url 2>/dev/null; node ".rcode/bin/rcode-tools.cjs" config-get teams_webhook_url 2>/dev/null)
WEBHOOK_CONFIGURED=$([ -n "$WEBHOOK_CONFIGURED" ] && echo true || echo false)
```
${WEBHOOK_CONFIGURED === 'true' ? '@.rcode/references/execute-notify-webhooks.md' : ''}
</step>

Next: Read `.rcode/workflows/execute/steps/07-tests-offer-next.md` before starting it (skip it if its Read-when condition is false).
