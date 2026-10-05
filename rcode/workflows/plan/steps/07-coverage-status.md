# plan - step 07: Requirements coverage gate, STATE.md planning record, milestone-health nudge, final status

This step file was split verbatim out of `workflows/plan.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

## 13. Requirements Coverage Gate

After plans pass the checker (or checker is skipped), verify that all phase requirements are covered by at least one plan.

**If `phase_req_ids` is empty, the gate does NOT silently skip — it reports why.**
An empty array has two very different causes and they must not look the same:

1. This phase genuinely maps to no requirements. Fine, say so and continue.
2. REQUIREMENTS.md HAS a traceability table and nothing parsed out of it. That is
   a broken gate reporting as a passing one.

Distinguish them before proceeding:

```bash
if [ -f .planning/REQUIREMENTS.md ] && grep -qE '\b[A-Z][A-Z0-9]{1,15}-[0-9]+\b' .planning/REQUIREMENTS.md; then
  echo "⚠ Requirements coverage gate SKIPPED but REQUIREMENTS.md contains requirement IDs."
  echo "  phase_req_ids came back empty — the phase→requirement mapping in ROADMAP.md"
  echo "  is missing or unparseable, so nothing is verifying coverage for this phase."
  echo "  Fix the phase's **Requirements:** line in ROADMAP.md, then re-run."
fi
```

Surface that warning to the user; do not bury it. Confirmed live: a project's
requirement IDs were all domain-prefixed (`FOUND-01`, `RENT-04`), the extractor
only matched `REQ-*`, and this gate skipped itself on every phase while
appearing to pass.

Then proceed to step 14 when the array really is empty.

**Step 1: Extract requirement IDs claimed by plans**
```bash
# Collect all requirement IDs from plan frontmatter
PLAN_REQS=$(grep -h "requirements_addressed\|requirements:" ${PHASE_DIR}/*-SPRINT.md 2>/dev/null | tr -d '[]' | tr ',' '\n' | sed 's/^[[:space:]]*//' | sort -u)
```

**Step 2: Compare against phase requirements from ROADMAP**

For each REQ-ID in `phase_req_ids`:
- If REQ-ID appears in `PLAN_REQS` → covered ✓
- If REQ-ID does NOT appear in any plan → uncovered ✗

**Step 3: Check CONTEXT.md features against plan objectives**

Read CONTEXT.md `<decisions>` section. Extract feature/capability names. Check each against plan `<objective>` blocks. Features not mentioned in any plan objective → potentially dropped.

**Step 4: Report**

If all requirements covered and no dropped features:
```
✓ Requirements coverage: {N}/{N} REQ-IDs covered by plans
```
→ Proceed to step 14.

If gaps found:
```
## ⚠ Requirements Coverage Gap

{M} of {N} phase requirements are not assigned to any plan:

| REQ-ID | Description | Plans |
|--------|-------------|-------|
| {id} | {from REQUIREMENTS.md} | None |

{K} CONTEXT.md features not found in plan objectives:
- {feature_name} — described in CONTEXT.md but no plan covers it

Options:
1. Re-plan to include missing requirements (recommended)
2. Move uncovered requirements to next phase
3. Proceed anyway — accept coverage gaps
```

If `TEXT_MODE` is true, present as a plain-text numbered list (options already shown in the block above). Otherwise use AskUserQuestion to present the options.

## 13b. Record Planning Completion in STATE.md

After plans pass all gates, record that planning is complete so STATE.md reflects the new phase status:

```bash
node ".rcode/bin/rcode-tools.cjs" state planned-phase --phase "${PHASE_NUMBER}" --name "${PHASE_NAME}" --plans "${PLAN_COUNT}"
```

This updates STATUS to "Ready to execute", sets the correct plan count, and timestamps Last Activity.

**Final planning commit.** Steps 9.4 and 12 already checkpointed each SPRINT.md
revision, but CONTEXT.md is sometimes edited during planning (e.g. a
"Pre-planning findings" section recording a corrected diagnosis or a chosen
fix-option) and never gets its own checkpoint. Catch it here, plus anything
else left uncommitted in the phase directory, so `planned-phase` in STATE.md
is never true while real planning artifacts sit uncommitted underneath it:

```bash
if [ "${commit_docs}" = "true" ] && [ -n "$(git status --porcelain -- "${PHASE_DIR}")" ]; then
  git add "${PHASE_DIR}"
  git commit -m "docs(phase-${PHASE_NUMBER}): planning complete — ${PLAN_COUNT} plan(s) ready to execute"
fi
```

## 13c. Milestone-health nudge (#942)

After recording completion, check whether the milestone has accumulated too many
open phases — so planning the Nth phase of a sprawling milestone guides the user
toward closing it instead of silently growing the roadmap:

```bash
HEALTH=$(node ".rcode/bin/rcode-tools.cjs" milestone-health 2>/dev/null)
REC=$(echo "$HEALTH" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).recommendation||'')}catch{console.log('')}})")
OPEN=$(echo "$HEALTH" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).open_phases||0)}catch{console.log(0)}})")
```

- If `REC` is `should-close` (≥12 open): surface a hard nudge recommending
  `/rcode-complete-milestone` then `/rcode-new-milestone`.
- If `REC` is `consider-closing` (8–11 open): softer nudge.
- If `healthy`: say nothing.

## 14. Present Final Status

Route to `<offer_next>` OR `auto_advance` depending on flags/config.

Next: Read `.rcode/workflows/plan/steps/08-auto-advance.md` before starting it (skip it if its Read-when condition is false).
