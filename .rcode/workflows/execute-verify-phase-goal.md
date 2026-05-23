<purpose>
Sub-step of execute.md — verify_phase_goal. Spawns rihal-verifier to confirm the phase achieved its GOAL, not just completed tasks. Creates VERIFICATION.md.
</purpose>

<step name="verify_phase_goal">
Verify phase achieved its GOAL, not just completed tasks.

```bash
VERIFIER_SKILLS=$(node ".rcode/bin/rihal-tools.cjs" agent-skills rihal-verifier 2>/dev/null)
```

```
Task(
  description="Verify phase {phase_number} goal achievement",
  prompt="Verify phase {phase_number} goal achievement.
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
  subagent_type="rihal-verifier",
  model="sonnet",
  model="{verifier_model}"
)
```

Read status:
```bash
grep "^status:" "$PHASE_DIR"/*-VERIFICATION.md | cut -d: -f2 | tr -d ' '
```

| Status | Action |
|--------|--------|
| `passed` | → update_roadmap |
| `human_needed` | Present items for human testing, get approval or feedback |
| `gaps_found` | Present gap summary, offer `/rihal-plan {phase} --gaps ${Rihal_WS}` |

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
node ".rcode/bin/rihal-tools.cjs" commit "test({phase_num}): persist human verification items as UAT" --files "{phase_dir}/{phase_num}-HUMAN-UAT.md"
```

**Step B: Present to user:**

```
## ✓ Phase {X}: {Name} — Human Verification Required

All automated checks passed. {N} items need human testing:

{From VERIFICATION.md human_verification section}

Items saved to `{phase_num}-HUMAN-UAT.md` — they will appear in `/rihal-progress` and `/rihal-audit-uat`.

"approved" → continue | Report issues → gap closure
```

**If user says "approved":** Proceed to `update_roadmap`. The HUMAN-UAT.md file persists with `status: partial` and will surface in future progress checks until the user runs `/rihal-verify-work` on it.

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

`/rihal-plan {X} --gaps ${Rihal_WS}`

Also: `cat {phase_dir}/{phase_num}-VERIFICATION.md` — full report
Also: `/rihal-verify-work {X} ${Rihal_WS}` — manual testing first
```

Gap closure cycle: `/rihal-plan {X} --gaps ${Rihal_WS}` reads VERIFICATION.md → creates gap plans with `gap_closure: true` → user runs `/rihal-execute {X} --gaps-only ${Rihal_WS}` → verifier re-runs.
</step>
