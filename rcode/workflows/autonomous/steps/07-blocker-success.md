# autonomous - step 07: Handle blocker, success criteria

This step file was split verbatim out of `workflows/autonomous.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<step name="handle_blocker">

## 6. Handle Blocker

When any phase operation fails or a blocker is detected, present 3 options via AskUserQuestion:

**Prompt:** "Phase {N} ({Name}) encountered an issue: {description}"

**Options:**
1. **"Fix and retry"** — Re-run the failed step (discuss, plan, or execute) for this phase
2. **"Skip this phase"** — Mark phase as skipped, continue to the next incomplete phase
3. **"Stop autonomous mode"** — Display summary of progress so far and exit cleanly

**On "Fix and retry":** Loop back to the failed step. If the same step fails again after retry, re-present these options.

**On "Skip this phase":** Log `Phase {N} ⏭ {Name} — Skipped by user`. Record in state:

```bash
node .rcode/bin/rcode-tools.cjs state add-decision "Skipped phase ${PHASE_NUMBER} in autonomous mode"
```

Proceed to iterate.

**On "Stop autonomous mode":**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► AUTONOMOUS ▸ STOPPED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Completed: {list of completed phases}
 Skipped: {list of skipped phases}
 Remaining: {list of remaining phases}

 Resume with: /rcode-autonomous ${ONLY_PHASE ? "--only " + ONLY_PHASE : "--from " + next_phase}${TO_PHASE ? " --to " + TO_PHASE : ""}
```

Record blocker in state:

```bash
node .rcode/bin/rcode-tools.cjs state add-blocker "Autonomous mode stopped at phase ${PHASE_NUMBER}: ${DESCRIPTION}"
```

</step>

</process>

<success_criteria>
- [ ] All incomplete phases executed in order (smart discuss → ui-phase → plan → execute → ui-review each)
- [ ] Smart discuss proposes grey area answers in tables, user accepts or overrides per area
- [ ] Progress banners displayed between phases
- [ ] Execute invoked with --no-transition (autonomous manages transitions)
- [ ] Post-execution verification reads VERIFICATION.md and routes on status
- [ ] Passed verification → automatic continue to next phase
- [ ] Human-needed verification → user prompted to validate or skip
- [ ] Gaps-found → user offered gap closure, continue, or stop
- [ ] Gap closure limited to 1 retry (prevents infinite loops)
- [ ] Plan and execute failures route to handle_blocker
- [ ] ROADMAP.md re-read after each phase (catches inserted phases)
- [ ] STATE.md checked for blockers before each phase
- [ ] Blockers handled via user choice (retry / skip / stop)
- [ ] Final completion or stop summary displayed
- [ ] After all phases complete, lifecycle step is invoked (not manual suggestion)
- [ ] Lifecycle transition banner displayed before audit
- [ ] Audit invoked via Skill(skill="rcode-audit-milestone")
- [ ] Audit result routing: passed → auto-continue, gaps_found → user decides, tech_debt → user decides
- [ ] Complete-milestone invoked via Skill() with ${milestone_version} arg
- [ ] Cleanup invoked via Skill() — internal confirmation is acceptable
- [ ] Final completion banner displayed after lifecycle
- [ ] Progress bar uses phase number / total milestone phases, with fallback when phase numbers exceed total
- [ ] Frontend phases get UI-SPEC generated before planning (step 3a.5) if not already present
- [ ] Frontend phases get UI review audit after successful execution (step 3d.5) if UI-SPEC exists
- [ ] UI phase and UI review respect workflow.ui_phase and workflow.ui_review config toggles
- [ ] UI review is advisory (non-blocking)
- [ ] `--only N` restricts execution to exactly one phase
- [ ] `--only N` skips lifecycle step
- [ ] `--only N` exits cleanly after single phase completes
- [ ] `--only N` on already-complete phase exits with message
- [ ] `--to N` stops execution after phase N completes
- [ ] `--to N` filters out phases with number > N during discovery
- [ ] `--to N` displays "Stopping after phase N" in startup banner
- [ ] `--to N` on already completed target exits with "already completed" message
- [ ] `--to N` compatible with `--from N`
- [ ] `--to N` skips lifecycle when not all milestone phases complete
- [ ] `--interactive` runs discuss inline (asks questions, waits for user)
- [ ] `--interactive` dispatches plan and execute as background agents
- [ ] `--interactive` enables pipeline parallelism: discuss Phase N+1 while Phase N builds
- [ ] `--interactive` main context only accumulates discuss conversations
- [ ] `--interactive` waits for background agents before post-execution routing
- [ ] `--interactive` compatible with `--only`, `--from`, and `--to` flags
- [ ] No `git push` issued by the workflow (per AGENTS.md)
- [ ] Branch created when on main/master (unless --on-main override)
- [ ] Branch name follows `rcode/autonomous-{version}-{timestamp}` pattern
- [ ] --on-main flag skips branch creation with warning (--allow-main accepted as deprecated alias, with warning)
- [ ] Non-main/master branches used as-is without branch creation
- [ ] PR/merge suggestion displayed at lifecycle completion when branch was created
- [ ] Phase count T re-derived from disk at start of every iteration (compaction guard)
- [ ] Phase count T re-derived from disk before execute_phase banner display
- [ ] Drift warning logged when current phase number exceeds total
- [ ] Progress bar always accurate after LLM context compaction
</success_criteria>

## Next Up

- `/rcode-ship` — push the branch and open a PR after autonomous run completes
- `/rcode-complete-milestone` — mark the milestone done once all phases shipped

Next: end of workflow.
