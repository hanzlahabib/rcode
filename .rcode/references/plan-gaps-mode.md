# plan.md — `--gaps` Mode (Handle `--gaps` Mode)

Extracted from `plan.md` step 3.6. Only loaded when `GAPS_MODE=true` — see the conditional include at that point in `plan.md`.

**Skip unless:** `GAPS_MODE=true`.

**Purpose:** Read `NNN-VERIFICATION.md`, extract failing/partial gaps, count existing plan files, and prepare a `gap_list` payload to feed the planner. On completion, control flow continues at step 8 (skipping CONTEXT.md gating, research, and validation-strategy creation).

**Step 1: Locate VERIFICATION.md**

```bash
PHASE_DIR=$(node ".rcode/bin/rcode-tools.cjs" roadmap get-phase "${PHASE}" --pick dir 2>/dev/null || echo "")
# Fallback if --pick dir not supported. TODO(#118): expose roadmap --pick dir cleanly.
if [[ -z "$PHASE_DIR" ]]; then
  PHASE_DIR=$(ls -d .planning/phases/${padded_phase}-* 2>/dev/null | head -1)
fi

VERIFICATION_FILE=$(ls "${PHASE_DIR}"/*-VERIFICATION.md 2>/dev/null | head -1)
```

**If `VERIFICATION_FILE` is empty:**
```
Error: No VERIFICATION.md found for Phase {X}. Gap-closure planning requires the phase to have run through the verifier first.

Try:
  /rcode-execute {X} ${RCODE_WS}      # run or re-run execution + verification
```
Exit workflow.

**Step 2: Extract gaps from VERIFICATION.md**

Parse the file for gap entries with `status: gap_found` or `status: partial`. Inspect these sections:
- `## Automated Gap` (or `## Automated Gaps`)
- `## Human Verification Required`
- Any findings block that includes a `status:` field set to `gap_found` or `partial`

Collect into `GAP_LIST` (an ordered list where each entry has: id, title, expected, actual, status, source_section, severity if present).

If `GAP_LIST` is empty, display:
```
Phase {X} VERIFICATION.md contains no gap_found or partial items — nothing to close.
Report: {VERIFICATION_FILE}
```
Exit workflow.

**Step 3: Determine next plan number**

```bash
EXISTING_PLAN_COUNT=$(ls "${PHASE_DIR}"/*-SPRINT.md 2>/dev/null | wc -l | tr -d ' ')
# Issue #652 — no leading zeros in planning artifacts. Phase 8 not 08, plan 2 not 02.
NEXT_PLAN_NUMBER=$((EXISTING_PLAN_COUNT + 1))
PADDED_PHASE="${PHASE}"
GAP_PLAN_FILENAME="${PADDED_PHASE}-${NEXT_PLAN_NUMBER}-SPRINT.md"
GAP_PLAN_PATH="${PHASE_DIR}/${GAP_PLAN_FILENAME}"
```

If `EXISTING_PLAN_COUNT == 0`, there is no prior execution to reference. Display a warning but proceed — the planner can still close verification gaps.

**Step 4: Gather prior plans for planner context**

```bash
EXISTING_PLAN_FILES=$(ls "${PHASE_DIR}"/*-SPRINT.md 2>/dev/null | tr '\n' ' ')
EXISTING_SUMMARY_FILES=$(ls "${PHASE_DIR}"/*-SUMMARY.md 2>/dev/null | tr '\n' ' ')
```

**Step 5: Display banner**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► GAP-CLOSURE PLANNING — Phase {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Verification report: {VERIFICATION_FILE}
Gaps to close:       {count(GAP_LIST)}
Existing plans:      {EXISTING_PLAN_COUNT}
New plan file:       {GAP_PLAN_FILENAME}
```

**Step 6: Skip ahead**

Control flow jumps directly to step 8 (Spawn rcode-planner). Steps 4 (CONTEXT.md), 5 (Research), and 5.5 (Validation) are ALL skipped when `GAPS_MODE=true`.

Step 8 will consume these variables when filling the planner prompt:
- `GAP_LIST` — serialized list of gaps (id, title, expected, actual, status)
- `GAP_PLAN_PATH` — exact output path the planner must write
- `EXISTING_PLAN_FILES` / `EXISTING_SUMMARY_FILES` — prior phase context
- `VERIFICATION_FILE` — authoritative source-of-truth

After the planner returns, the existing plan-checker / revision loop (step 10 onward) runs unchanged — gap plans are verified just like normal plans.
