# execute - step 07: Generate tests offer, offer next, context efficiency, failure handling, resumption

This step file was split verbatim out of `workflows/execute.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<step name="generate_tests">
**Offer test generation for the completed phase.**

After verification passes and the roadmap is updated, check whether tests were already written as part of the phase plans:

```bash
TEST_FILES=$(find "${PHASE_DIR}" -name "*test*" -o -name "*spec*" 2>/dev/null | wc -l)
```

If `TEST_FILES` is 0 — no test artifacts were produced during execution. Present the test generation offer:

```
## ✓ Phase {X}: {Name} — Add Tests?

No test files were generated during this phase.
Run /rcode-add-tests to generate unit + E2E tests from the SUMMARY:

/rcode-add-tests {X}

Skip if tests are out of scope for this phase (infra, config, docs-only).
```

If `TEST_FILES` is > 0 — tests were written inline. Skip this step silently.

**This step is advisory only — it never blocks phase completion.**
</step>

<step name="offer_next">

**Exception:** If `gaps_found`, the `verify_phase_goal` step already presents the gap-closure path (`/rcode-plan {X} --gaps`). No additional routing needed — skip auto-advance.

**No-transition check (spawned by auto-advance chain):**

Parse `--no-transition` flag from $ARGUMENTS.

**If `--no-transition` flag present:**

Execute-phase was spawned by plan's auto-advance. Do NOT run transition.md.
After verification passes and roadmap is updated, return completion status to parent:

```
## PHASE COMPLETE

Phase: ${PHASE_NUMBER} - ${PHASE_NAME}
Plans: ${completed_count}/${total_count}
Verification: {Passed | Gaps Found}

[Include aggregate_results output]
```

STOP. Do not proceed to auto-advance or transition.

**If `--no-transition` flag is NOT present:**

**Auto-advance detection:**

1. Parse `--auto` flag from $ARGUMENTS
2. Read both the chain flag and user preference (chain flag already synced in init step):
   ```bash
   AUTO_CHAIN=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
   AUTO_CFG=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
   ```

**If `--auto` flag present OR `AUTO_CHAIN` is true OR `AUTO_CFG` is true (AND verification passed with no gaps):**

```
╔══════════════════════════════════════════╗
║  AUTO-ADVANCING → TRANSITION             ║
║  Phase {X} verified, continuing chain    ║
╚══════════════════════════════════════════╝
```

Execute the transition workflow inline (do NOT use Task — orchestrator context is ~10-15%, transition needs phase completion data already in context):

Read and follow `.rcode/workflows/transition.md`, passing through the `--auto` flag so it propagates to the next phase invocation.

**If none of `--auto`, `AUTO_CHAIN`, or `AUTO_CFG` is true:**

**STOP. Do not auto-advance. Do not execute transition. Do not plan next phase. Present options to the user and wait.**

**IMPORTANT: There is NO `/rcode-transition` command. Never suggest it. The transition workflow is internal only.**

```
## ✓ Phase {X}: {Name} Complete

/rcode-add-tests {X} — generate unit + E2E tests for this phase
/rcode-progress — see updated roadmap
/rcode-discuss-phase {next} — discuss next phase before planning
/rcode-plan {next} — plan next phase
/rcode-execute {next} — execute next phase
```

**Next step — paste this to verify:**
> /rcode-verify {X}

Only suggest the commands listed above. Do not invent or hallucinate command names.
</step>

</process>

<context_efficiency>
Orchestrator: ~10-15% context for 200k windows, can use more for 1M+ windows.
Subagents: fresh context each (200k-1M depending on model). No polling (Task blocks). No context bleed.

For 1M+ context models, consider:
- Passing richer context (code snippets, dependency outputs) directly to executors instead of just file paths
- Running small phases (≤3 plans, no dependencies) inline without subagent spawning overhead
- Relaxing /clear recommendations — context rot onset is much further out with 5x window
</context_efficiency>

<failure_handling>
- See the classifyHandoffIfNeeded workaround in execute-waves.md (already @-included above).
- **Agent fails mid-plan:** Missing SUMMARY.md → report, ask user how to proceed
- **Dependency chain breaks:** Wave 1 fails → Wave 2 dependents likely fail → user chooses attempt or skip
- **All agents in wave fail:** Systemic issue → stop, report for investigation
- **Checkpoint unresolvable:** "Skip this plan?" or "Abort phase execution?" → record partial progress in STATE.md
</failure_handling>

<resumption>
Re-run `/rcode-execute {phase}` → discover_plans finds completed SUMMARYs → skips them → resumes from first incomplete plan → continues wave execution.

STATE.md tracks: last completed plan, current wave, pending checkpoints.
</resumption>

## Next Up

- `/rcode-verify-phase` — verify the phase goal is achieved after execution completes
- `/rcode-ship` — push the branch and open a PR once verification passes
- `/rcode-debug` — investigate root cause if any plan fails during execution

Next: end of workflow.
