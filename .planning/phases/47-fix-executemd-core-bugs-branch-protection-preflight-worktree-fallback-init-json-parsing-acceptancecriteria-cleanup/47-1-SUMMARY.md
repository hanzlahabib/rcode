# Execution Summary

**Phase:** 47 — Fix execute.md core bugs: branch-protection preflight, worktree fallback, init-JSON parsing, acceptance_criteria cleanup
**Sprint:** 47.1
**Completed:** 2026-08-09
**Executor:** rcode-executor (sequential, no worktree isolation)

## What Was Built

Closed 4 filed bugs in `rcode/workflows/execute.md` and its close siblings (`rcode/references/git-preflight.md`, `rcode/workflows/execute-sprint.md`, `rcode/workflows/plan-spawn-planner.md`), then propagated the `execute.md` and `plan-spawn-planner.md` fixes into the `.rcode/` dogfooded mirrors:

1. **#1014 — Branch-protection preflight.** `execute.md`'s pre_flight branch check now skips the main/master refusal entirely when `git.branching_strategy` is configured as `none`, and its override flag was renamed from the never-enforced `--allow-main` to `--on-main`, matching `git-preflight.md`'s real bash parsing (which already used `--on-main` in three places).
2. **#1015 — USE_WORKTREES fallback.** Replaced the dead `$(... || echo "true")` pattern (never fires, because `config-get` exits 0 with empty stdout when a key is absent) with the working two-line capture-then-`${VAR:-default}` idiom already used correctly in `plan.md`.
3. **#1017 — init-execute JSON field docs.** Rewrote the "Parse JSON for" field list and four downstream references (pre_flight step 5, the `phase_found`/`plan_count`/`parallelization` gating block, `handle_branching`, `validate_phase`) to match the real `cmdInitExecute` return shape: only `executor_model`, `verifier_model`, `phase_dir`, `plans`, `state_exists`, `response_language` are real top-level fields; `branching_strategy` lives under `config.branching_strategy`; `commit_docs`/`parallelization`/`branch_name`/`phase_name`/`incomplete_plans`/`incomplete_count`/`roadmap_exists`/`phase_req_ids` either don't exist or come from a different command; `phase_found`, `phase_number`, `phase_slug`, `plan_count` are documented as derived values instead of literal fields.
4. **#1020 — acceptance_criteria cleanup.** Removed `<acceptance_criteria>` as a mandatory/real completion tier from `execute-sprint.md`'s task-completion-precedence list (now 2 tiers, not 3) and its MANDATORY-check bullet; from `plan-spawn-planner.md`'s field list, Anti-Shallow Execution Rules item 3, and quality_gate checklist (all now reference `<evidence>`); and from `execute.md`'s `run_verify_commands` step and its `uat_gate` step's "AC items" print block + fail-branch line (a second, unflagged instance of the same missing-data-source bug, phrased as "AC" rather than the literal string `acceptance_criteria`).
5. **Mirror propagation.** Copied the finished `rcode/workflows/execute.md` and `rcode/workflows/plan-spawn-planner.md` into `.rcode/workflows/`, re-verified byte-identical. `git-preflight.md` needed no change (it was already correct). `.rcode/workflows/execute-sprint.md`'s pre-existing, unrelated divergence from its `rcode/` source was left untouched per the plan's explicit scope.

`rcode/workflows/execute.md` finished at 998 lines (down from a 996-line baseline plus 2 net lines across all edits), 2 lines under the CLAUDE.md 1000-line cap.

## Stories Completed

| ID | Title | Points | Status |
|----|-------|--------|--------|
| 47.1.1 | Fix branch-protection preflight to skip when branching_strategy is none, and rename --allow-main to --on-main | - | Complete |
| 47.1.2 | Fix the USE_WORKTREES config-get fallback that never fires | - | Complete |
| 47.1.3 | Fix execute.md's documented init-execute JSON fields to match the real live output | - | Complete |
| 47.1.4 | Remove acceptance_criteria as a mandatory/real completion tier from execute-sprint.md, plan-spawn-planner.md, and execute.md (including the uat_gate step's AC-items block) | - | Complete |
| 47.1.5 | Propagate execute.md and plan-spawn-planner.md fixes into the .rcode/ dogfooded mirrors; verify git-preflight.md mirror needs no change | - | Complete |

## Files Modified

| File | Change |
|------|--------|
| `rcode/workflows/execute.md` | Branch-check skip-when-none + `--on-main` rename (#1014); USE_WORKTREES two-line capture idiom (#1015); init-execute JSON field-parsing doc corrections across 5 spots (#1017); `<acceptance_criteria>` reference removed from `run_verify_commands`, `uat_gate` "AC items" block + fail-branch line rewritten to use `<done>` (#1020) |
| `rcode/workflows/execute-sprint.md` | Task-completion-precedence tier list reduced to the 2 real tiers, MANDATORY check bullet rewritten (#1020) |
| `rcode/workflows/plan-spawn-planner.md` | MANDATORY field list, Anti-Shallow Execution Rules item 3, and quality_gate checklist item switched from `<acceptance_criteria>` to `<evidence>` (#1020) |
| `.rcode/workflows/execute.md` | Mirrored copy of all `execute.md` fixes above, re-verified byte-identical to source |
| `.rcode/workflows/plan-spawn-planner.md` | Mirrored copy of the `plan-spawn-planner.md` fixes above, re-verified byte-identical to source |

## Deviations from Plan

One deviation from the plan's prescribed `<action>` text, required to satisfy the task's own `<verify><automated>` block and `<done>` criterion:

Task 47.1.4's plan-supplied replacement text for three spots (`execute-sprint.md`'s precedence-list footnote, `plan-spawn-planner.md`'s quality_gate line, and `execute.md`'s `run_verify_commands` sentence) explained the removal of the old tag by literally naming it — e.g. "has no `<acceptance_criteria>` tag". That left the literal string `acceptance_criteria` present in all three files, which directly conflicts with the task's own `<verify><automated>` block (`! grep -q 'acceptance_criteria'` across all three files) and its `<done>` field ("acceptance_criteria no longer appears anywhere"). Per the completion-precedence rule this same task installs into `execute-sprint.md` — `<verify><automated>` is the highest authority — the three sentences were reworded to preserve meaning ("has no such tag" / "not a prose checklist tag") without the literal substring. No other deviations; all other edits landed exactly as specified in the plan's `<action>` blocks, verified against re-grepped live line numbers rather than the plan's cited (and slightly drifted) line numbers.

## Blockers Encountered

None. `node .rcode/bin/rcode-tools.cjs roadmap update-plan-progress 47 47.1 completed` (the exact 3-arg form referenced in the run's success criteria) returned `{"updated": false, "error": "plan 47.1 not found in phase 47"}` because ROADMAP.md's Phase 47 "Plans:" block was still the `_TBD_` placeholder (no plan-id row/checklist item existed yet for the 3-arg matcher to find). Used the tool's 1-arg auto-detect form instead (`roadmap update-plan-progress 47`), which is designed for exactly this case: it scans the phase directory for `*-SPRINT.md`/`*-SUMMARY.md` files and populates the placeholder `Plans:` block and `Status:` line from what's actually on disk. Ran it twice — once before this SUMMARY.md existed (populated `- 47-1 — in progress`, Status → In Progress) and once after (flips to `- 47-1 — SUMMARY shipped`, Status → Complete).

## Next Steps

- `/rcode-verify-phase 47` — verify the phase goal is achieved
- `/rcode-ship` — push the branch and open a PR once verification passes (not done here — no push without explicit authorization)

## Verification

- [x] `grep -q -- '--on-main' rcode/workflows/execute.md` and no remaining `--allow-main` in execute.md
- [x] `USE_WORKTREES=${USE_WORKTREES:-true}` two-line idiom present, dead `|| echo "true"` form removed
- [x] `config.branching_strategy` and `plans.length` documented as the real field locations
- [x] No `acceptance_criteria` string anywhere in execute.md, execute-sprint.md, plan-spawn-planner.md; no `AC items` phrasing in execute.md
- [x] `rcode/workflows/execute.md` is 998 lines — at/under the 1000-line cap
- [x] `.rcode/workflows/execute.md` and `.rcode/workflows/plan-spawn-planner.md` byte-identical to their `rcode/` sources; `.rcode/workflows/execute-sprint.md`'s pre-existing divergence confirmed untouched
- [x] 5 commits, one per task, Conventional Commits format, issue numbers in parens, no AI attribution
