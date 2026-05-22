<purpose>
Sub-step of execute.md — verify_phase_goal. Spawns rcode-verifier to confirm the phase achieved its GOAL, not just completed tasks. Creates VERIFICATION.md.
</purpose>

<step name="verify_phase_goal">
Verify phase achieved its GOAL, not just completed tasks.

```bash
VERIFIER_SKILLS=$(node ".rcode/bin/rcode-tools.cjs" agent-skills rcode-verifier 2>/dev/null)
```

If init JSON has `response_language` set, prepend `Respond in {response_language}.` to the prompt and require VERIFICATION.md prose (rationale, gap descriptions, human_verification items) to be written in that language. Status keys, file paths, and requirement IDs stay English.

```
Task(
  description="Verify phase {phase_number} goal achievement",
  prompt="${response_language ? `Respond in ${response_language}. Write VERIFICATION.md prose in ${response_language}; keep status keys, file paths, and requirement IDs in English.\n\n` : ''}Verify phase {phase_number} goal achievement.
Phase directory: {phase_dir}
Phase goal: {goal from ROADMAP.md}
Phase requirement IDs: {phase_req_ids}
Check must_haves against actual codebase.
Cross-reference requirement IDs from PLAN frontmatter against REQUIREMENTS.md — every ID MUST be accounted for.
Create VERIFICATION.md.

<files_to_read>
Read these files before verification:
- {phase_dir}/*-SPRINT.md (All plans — understand intent, check must_haves)
- {phase_dir}/*-SUMMARY.md (All summaries — cross-reference claimed vs actual)
- .planning/REQUIREMENTS.md (Requirement traceability)
${CONTEXT_WINDOW >= 500000 ? `- {phase_dir}/*-CONTEXT.md (User decisions — verify they were honored)
- {phase_dir}/*-RESEARCH.md (Known pitfalls — check for traps)
- Prior VERIFICATION.md files from earlier phases — most recent 5 phases only (regression check)
` : ''}
</files_to_read>

${VERIFIER_SKILLS}",
  subagent_type="rcode-verifier",
  model="{verifier_model}"
)
```

Read status (fail-safe: missing or empty file means verifier never produced a result):
```bash
VERIFICATION_FILE=$(ls "$PHASE_DIR"/*-VERIFICATION.md 2>/dev/null | head -1)
if [ -z "$VERIFICATION_FILE" ] || [ ! -s "$VERIFICATION_FILE" ]; then
  VERIFY_STATUS="verifier_failed"
else
  VERIFY_STATUS=$(grep "^status:" "$VERIFICATION_FILE" | head -1 | cut -d: -f2 | tr -d ' ')
  [ -z "$VERIFY_STATUS" ] && VERIFY_STATUS="verifier_failed"
fi
```

| Status | Action |
|--------|--------|
| `passed` | → update_roadmap |
| `human_needed` | Present items for human testing, get approval or feedback |
| `gaps_found` | Present gap summary, offer `/rcode-plan {phase} --gaps ${Rihal_WS}` |
| `verifier_failed` | Abort: VERIFICATION.md missing/empty/unparseable. Do NOT mark phase complete. Print the verifier-failure message below and exit 1. |

**If verifier_failed:**

```
✖ Phase {X}: verifier agent did not produce a usable VERIFICATION.md.

This means the rcode-verifier subagent crashed, returned no output, or wrote
an invalid status header. The phase will NOT be marked complete.

Next steps:
  1. Re-run: /rcode-verify-phase {X}
  2. If it fails again, check rcode-verifier prompt/skills:
       node .rcode/bin/rcode-tools.cjs agent-skills rcode-verifier
  3. As a last resort, manually create VERIFICATION.md and run /rcode-next.

Do NOT run /rcode-next until VERIFICATION.md exists with a valid status.
```

Exit the workflow with non-zero status. Do not fall through to update_roadmap.

**If human_needed:**

**Step A: Persist human verification items as UAT file.**

Create `{phase_dir}/{phase_num}-HUMAN-UAT.md` using UAT template format:

```markdown
---
status: partial
phase: {phase_num}-{phase_name}
source: [{phase_num}-VERIFICATION.md]
started: [now ISO]
updated: [now ISO]
---

## Current Test

[awaiting human testing]

## Tests

{For each human_verification item from VERIFICATION.md:}

### {N}. {item description}
expected: {expected behavior from VERIFICATION.md}
result: [pending]

## Summary

total: {count}
passed: 0
issues: 0
pending: {count}
skipped: 0
blocked: 0

## Gaps
```

Commit the file:
```bash
node ".rcode/bin/rcode-tools.cjs" commit "test({phase_num}): persist human verification items as UAT" --files "{phase_dir}/{phase_num}-HUMAN-UAT.md"
```

**Step B: Present to user:**

```
## ✓ Phase {X}: {Name} — Human Verification Required

All automated checks passed. {N} items need human testing:

{From VERIFICATION.md human_verification section}

Items saved to `{phase_num}-HUMAN-UAT.md` — they will appear in `/rcode-progress` and `/rcode-audit-uat`.

"approved" → continue | Report issues → gap closure
```

**If user says "approved":** Proceed to `update_roadmap`. The HUMAN-UAT.md file persists with `status: partial` and will surface in future progress checks until the user runs `/rcode-verify-work` on it.

**If user reports issues:** Proceed to gap closure as currently implemented.

**If gaps_found:**
```
## ⚠ Phase {X}: {Name} — Gaps Found

**Score:** {N}/{M} must-haves verified
**Report:** {phase_dir}/{phase_num}-VERIFICATION.md

### What's Missing
{Gap summaries from VERIFICATION.md}

---
## ▶ Next Up

`/clear` then:

`/rcode-plan {X} --gaps ${Rihal_WS}`

Also: `cat {phase_dir}/{phase_num}-VERIFICATION.md` — full report
Also: `/rcode-verify-work {X} ${Rihal_WS}` — manual testing first
```

Gap closure cycle: `/rcode-plan {X} --gaps ${Rihal_WS}` reads VERIFICATION.md → creates gap plans with `gap_closure: true` → user runs `/rcode-execute {X} --gaps-only ${Rihal_WS}` → verifier re-runs.
</step>
