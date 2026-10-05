<purpose>

Drive milestone phases autonomously — all remaining phases, a range via `--from N`/`--to N`, or a single phase via `--only N`. For each incomplete phase: discuss → plan → execute using Skill() flat invocations. Pauses only for explicit user decisions (grey area acceptance, blockers, validation requests). Re-reads ROADMAP.md after each phase to catch dynamically inserted phases.

</purpose>

<critical_rules priority="absolute">

These rules apply throughout autonomous execution. Violations broke the
interpos audit (issue #221) — DO NOT regress.

1. **NEVER modify `.rcode/config.yaml`.** Specifically: never write
   `mode: yolo`, never call `rcode-tools config-set mode`, never `sed`
   the file. The user's mode preference is sacred. Autonomous behavior
   is governed by the workflow's own internal flags + the `--auto`
   invocation flag, NOT by mutating persistent config.

2. **NEVER skip the methodology chain on greenfield projects.** Before
   the phase loop runs, the prerequisite check (next step) MUST verify:
   - `.planning/prd.md` exists (else halt → /rcode-create-prd)
   - ROADMAP.md has milestone structure (else halt → /rcode-new-milestone)
   - `.planning/epics.md` exists (else halt → /rcode-create-epics-and-stories)
   See issue #219 + #229.

3. **NEVER write SPRINT.md directly.** Sprint creation MUST go through
   the `rcode-sprint-planning` skill so the capacity gate (#127) fires.
   If autonomous needs a sprint, invoke the skill — don't shortcut.

4. **ALWAYS call `state sync --from-disk` after writing any
   .planning/ artifact.** Otherwise state.json drifts and downstream
   workflows lie. See `_shared/state-sync-rule.md` (#198).

5. **ALWAYS record decisions via `rcode-tools state add-decision`.**
   Never write decision prose to STATE.md. See #224.

</critical_rules>

<process>
This workflow is split into step files so only the step you are on is loaded. Execute the steps in order. Before each step, Read its file with the Read tool (paths below are plain paths, never `@`-includes). Do not read ahead, and skip a step only when its Read-when condition is false. Every instruction, gate, checkpoint, tool call, subagent allowlist and error path lives in the step files; the orchestrator never replaces them. If a step file says "Next:", follow it.

| # | Step | File | Read when |
|---|------|------|-----------|
| 01 | Required reading, prerequisite check, prepare branch | `.rcode/workflows/autonomous/steps/01-reading-prereq-branch.md` | Always, first |
| 02 | Initialize, discover phases | `.rcode/workflows/autonomous/steps/02-init-discover.md` | Always |
| 03 | Execute phase: header and smart discuss (3a) | `.rcode/workflows/autonomous/steps/03-phase-discuss.md` | Per phase (first sub-step) |
| 04 | UI contract, plan, execute, code review, post-execution routing, UI review (3a.5-3d.5) | `.rcode/workflows/autonomous/steps/04-phase-plan-execute.md` | Per phase, after smart discuss |
| 05 | Iterate: refresh phase count, blockers, token report, loop | `.rcode/workflows/autonomous/steps/05-iterate.md` | After each phase |
| 06 | Lifecycle: audit, complete milestone, cleanup, final completion | `.rcode/workflows/autonomous/steps/06-lifecycle.md` | When no incomplete phases remain |
| 07 | Handle blocker, success criteria | `.rcode/workflows/autonomous/steps/07-blocker-success.md` | On a blocker, and at the end |

Rules that hold for every step:
- Read step 01 first, in full, before taking any action: it carries the required reading, contract and pre-flight gates.
- Re-Read a step file if its content is no longer in context (for example after compaction or when looping back to an earlier step).
- Step files keep their original `<step>`/`<process>` tags and section numbering; references such as "go to handle_blocker" or "step 9.5" point into the step files above.
</process>
