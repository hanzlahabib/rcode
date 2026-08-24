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
- {phase_dir}/*-SUMMARY.md (All summaries — these are CLAIMS made by the agent
  that did the work, not evidence. Every 'done' in a SUMMARY must be re-proven
  against the codebase. A must-have supported only by a SUMMARY line is
  UNVERIFIED, and a phase whose SUMMARY was written by the same sprint that
  built it has been self-certified — say so in VERIFICATION.md.)
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
| `passed` | → **falsification pass (below), then** update_roadmap |
| `human_needed` | Present items for human testing, get approval or feedback |
| `gaps_found` | Present gap summary, offer `/rcode-plan {phase} --gaps ${RCODE_WS}` |
| `verifier_failed` | Abort: VERIFICATION.md missing/empty/unparseable. Do NOT mark phase complete. Print the verifier-failure message below and exit 1. |

### Falsification pass — mandatory when status is `passed`

A verifier that set out to confirm the phase will confirm it. Before any
`passed` is allowed to reach `update_roadmap`, spawn a SECOND agent whose only
job is to break the result. It gets no summaries and no verification report —
it starts from the goal and the codebase, so it cannot inherit the first
agent's conclusions.

```
Task(
  description="Falsify phase {phase_number} verification",
  prompt="${response_language ? `Respond in ${response_language}.\n\n` : ''}A previous agent concluded phase {phase_number} PASSED. Your job is to prove it wrong.

Phase goal: {goal from ROADMAP.md}
Phase directory: {phase_dir}

Do NOT read any *-SUMMARY.md or *-VERIFICATION.md — they contain the conclusion you are testing.
Read {phase_dir}/*-SPRINT.md for the must-haves, then work from the codebase itself.

Attack in this order, and report the first thing that holds:
1. REACHABILITY — for each module this phase delivered, list its importers. If every
   importer is a test file, the feature does not run in production. Then read what
   production actually calls for this behaviour: does it call the delivered module, or
   re-implement it inline? Two implementations side by side is a failure.
2. GUARD SHAPE — for each test or check this phase added, find one input it should
   catch and does not. Guards that enumerate a location (a glob, one filename, one
   role, one directory) instead of deriving from a property are the target. If you can
   construct a violation the guard misses, the guard is decorative.
3. RUNTIME TRUTH — where the phase claims a database, auth, or permission property,
   verify it against the running system, not the migration text. Owner roles, FORCE
   flags, session variables, and env-dependent config lie in source and tell the truth
   at runtime.
4. CLAIM WITHOUT EVIDENCE — any must-have you cannot trace to a file:line.

Return REFUTED with the specific finding and its file:line, or UPHELD if every
attack failed. Default to REFUTED when you are uncertain — a false UPHELD is far
more expensive than a false REFUTED.",
  subagent_type="rcode-verifier",
  model="{verifier_model}"
)
```

**If the falsifier returns REFUTED:** rewrite VERIFICATION.md `status:` to
`gaps_found`, append the finding to its gaps section attributed to the
falsification pass, and follow the `gaps_found` row above. Do NOT mark the phase
complete. The first verifier being wrong is the expected outcome sometimes —
that is what this pass is for.

**If UPHELD:** record `falsification: upheld` in VERIFICATION.md frontmatter and
proceed to update_roadmap. A `passed` with no `falsification:` key means the pass
never ran, and downstream should treat it as unverified.

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

`/rcode-plan {X} --gaps ${RCODE_WS}`

Also: `cat {phase_dir}/{phase_num}-VERIFICATION.md` — full report
Also: `/rcode-verify-work {X} ${RCODE_WS}` — manual testing first
```

Gap closure cycle: `/rcode-plan {X} --gaps ${RCODE_WS}` reads VERIFICATION.md → creates gap plans with `gap_closure: true` → user runs `/rcode-execute {X} --gaps-only ${RCODE_WS}` → verifier re-runs.
</step>

## Next Up

- `/rcode-ship` — ship if VERIFICATION.md is green
- `/rcode-debug` — debug if goal verification failed
