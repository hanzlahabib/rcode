---
status: issues_found
phase: 47
critical: 0
high: 1
medium: 2
low: 2
generated: 2026-08-09T07:37:54Z
---

# Phase 47 Review — execute.md core bug fixes (#1014, #1015, #1017, #1020)

## Scope reviewed

Commits `9a8c928`..`81a06bc` on `fix-execute-core`, touching:
- `rcode/workflows/execute.md`
- `rcode/workflows/execute-sprint.md`
- `rcode/workflows/plan-spawn-planner.md`
- `.rcode/workflows/execute.md` (mirror)
- `.rcode/workflows/plan-spawn-planner.md` (mirror)

Cross-checked against ground truth in `rcode/bin/rcode-tools.cjs` (`cmdInitExecute` ~L863-974, `cmdInit` ~L377-599, `cmdPhasePlanIndex` ~L5261-5313, `cmdPlanValidateEvidence` ~L5104), `rcode/bin/lib/config.cjs` (`cmdGet`/`parseNestedYaml`/`KEY_ALIASES`), and `.rcode/config.yaml`.

## Pattern check

The 4 targeted fixes are each individually correct and verified against live tool behavior:
- `--allow-main` → `--on-main` rename in `execute.md:38-43` matches `git-preflight.md`'s actual bash parsing (4 occurrences, all `--on-main`; confirmed no `--allow-main` remains anywhere except the explicitly out-of-scope `autonomous.md`, which owns its own separate flag).
- `git.branching_strategy` as the config-get key (`execute.md:38-40`) is correct — live-tested: `config-get git.branching_strategy` → `feature-branch`; `config-get branching_strategy` (bare) → empty, matching `parseNestedYaml`'s one-level-indentation nesting in `lib/config.cjs`.
- `USE_WORKTREES` two-line capture-then-`${VAR:-default}` idiom (`execute.md:249-250`) correctly fixes the dead `|| echo "true"` pattern and matches `plan.md`'s working idiom.
- The `init execute` field-list rewrite (`execute.md:241-242`) matches `cmdInitExecute`'s real return object exactly: top-level keys are `workflow, target, flags, plan_path, phase_dir, plans, response_language, executor_model, verifier_model, config, paths, state_exists` — confirmed by direct read of `rcode-tools.cjs:953-973`. None of `commit_docs, parallelization, branch_name, phase_found, phase_number, phase_name, phase_slug, incomplete_plans, plan_count, incomplete_count, roadmap_exists, phase_req_ids` exist there.
- `acceptance_criteria` cleanup is thorough at the literal-string level: zero hits of `acceptance_criteria` remain in `execute.md`, `execute-sprint.md`, or `plan-spawn-planner.md` (source or mirror), and the `uat_gate` step's "AC items" phrasing (a second, unflagged instance of the same bug) was also caught and fixed.
- Mirror parity: `.rcode/workflows/execute.md` and `.rcode/workflows/plan-spawn-planner.md` are byte-identical to their `rcode/` sources (`diff -q` confirmed, empty output). `.rcode/workflows/execute-sprint.md`'s pre-existing, unrelated divergence (still carries the old 3-tier `acceptance_criteria` precedence list) was correctly left untouched, per explicit scope.
- Line cap: `rcode/workflows/execute.md` is 998 lines, under the 1000-line CLAUDE.md cap, matching the plan's own line-budget arithmetic.

Despite that, two edits in this same set left stray instances of the exact bug classes they were supposed to eliminate, and the fourth "close sibling" the phase objective explicitly named (`git-preflight.md`) received zero changes despite being the file the plan's own SPRINT.md calls "the actual enforcement contract" for branch protection.

## Risk assessment

### High

1. **`git-preflight.md`'s protected-branch check has no `branching_strategy: none` exception, so issue #1014 is not fully closed at the enforcement layer it depends on.**
   `rcode/workflows/execute.md:184` `@`-includes `rcode/references/git-preflight.md` as `<required_reading>`, and `git-preflight.md` itself declares (line 7) that it gates `/rcode-execute` among other code-modifying workflows. Its failure condition at `rcode/references/git-preflight.md:38` is unconditional: `` `BRANCH` is in `$PROTECTED` AND user did not pass `--on-main` `` — there is no `git.branching_strategy` awareness anywhere in the file (confirmed via full read; grep for `branching_strategy` in `git-preflight.md` returns nothing).

   Meanwhile `execute.md`'s own local branch check at `execute.md:38-43` (fixed by 47.1.1) now correctly skips the refusal when `branching_strategy` is `none`. But 47.1's own `47-1-SPRINT.md` (line 29) explicitly calls `git-preflight.md` "the actual enforcement contract" for this check — and that contract still unconditionally blocks main/master regardless of `branching_strategy`. No other workflow that includes `git-preflight.md` (`dev-story.md`, `quick.md`, `code-review-fix.md`) has its own local override logic the way `execute.md` does, meaning `execute.md` now has two branch-protection mechanisms in the same file with no documented precedence between them.

   Net effect: a user with `git.branching_strategy: none` who is on `main` and runs `/rcode-execute` will pass the local `pre_flight` step 4a check (now correctly skipped), but an agent that also follows `git-preflight.md`'s required-reading instructions (as its own doc instructs, "before /rcode-execute") will still see `BRANCH` in `$PROTECTED` and refuse without `--on-main` — reproducing the exact symptom #1014 reports.

   **Fix:** either (a) add a documented `git.branching_strategy: none` exception to `git-preflight.md`'s failure conditions (`git-preflight.md:33-41`) so the shared contract itself is config-aware, or (b) add an explicit note in `execute.md` stating that `pre_flight` step 4a supersedes `git-preflight.md`'s protected-branch check for this workflow and why. Silence on precedence between two live-enforced mechanisms is the bug.

### Medium

2. **Stray "acceptance criteria" prose survives in `plan-spawn-planner.md`'s own Anti-Shallow Execution Rules list, one item below the one that was fixed.**
   `rcode/workflows/plan-spawn-planner.md:266` (mirrored at `.rcode/workflows/plan-spawn-planner.md:266`), Anti-Shallow Execution Rules item 4 (`<verify>`): *"Shell commands that PROVE the acceptance criteria are met."* Item 3, immediately above it, was correctly rewritten from `<acceptance_criteria>` to `<evidence>` in this same commit (`25a2eb9`) — but item 4's description still references "the acceptance criteria" as the thing `<verify>` proves, which is now a dangling concept (no `<acceptance_criteria>` tag exists in the schema). It escaped the task's own `! grep -q 'acceptance_criteria'` verify gate only because the phrase uses a space instead of an underscore. Compare to the parallel edit in `execute.md:532` from the same commit, which correctly reworded the equivalent sentence to reference `<done>` criteria instead.

   **Fix:** reword to match the sibling edit, e.g. *"Shell commands that PROVE the task's `<done>` criteria are met."*

3. **A fourth, unaddressed `parallelization`-as-real-toggle reference sits 5 lines below the field's own new "not a real field" disclaimer, in the same region task 47.1.3 edited.**
   `rcode/workflows/execute.md:279` (mirrored at `.rcode/workflows/execute.md:279`), in the Copilot runtime-detection paragraph: *"force sequential inline execution regardless of the `parallelization` setting — Copilot's subagent completion signals are unreliable."* This directly follows `execute.md:274`'s new text (added by this same commit, `b535c79`): *"`parallelization` is not a real field in `init execute`'s output ... don't treat it as a working toggle until a real source is wired in."* Task 47.1.3's five edits (Parse-JSON line, pre_flight step 5, phase_found/plan_count/parallelization gating block, handle_branching, validate_phase) didn't cover this sixth mention, five lines further down in the same "initialize" step.

   **Fix:** reword to drop the false premise, e.g. *"force sequential inline execution unconditionally — Copilot's subagent completion signals are unreliable."*

### Low

4. **Commit `81a06bc`'s subject line is exactly 72 characters, not strictly under 72.**
   `chore(workflows): sync execute.md, plan-spawn-planner.md mirrors (#1020)` is 72 chars. `AGENTS.md` (Commit Rules) requires "under 72 chars" (strictly `<72`), while `47-1-SPRINT.md`'s own success criterion restates this more loosely as "≤72 chars" — the commit satisfies the plan's own (looser) restatement but not the actual repo rule it was restating. Trivial, but worth trimming a word (e.g. drop "workflows" scope duplication: `mirrors execute.md, plan-spawn-planner.md (#1020)`).

5. **`execute.md:242`'s comparison "`roadmap_exists`/`phase_req_ids` are returned only by the separate `init sprint-plan` command" is narrower than reality.**
   `roadmap_exists` (`rcode-tools.cjs:466`) and `phase_req_ids` (`rcode-tools.cjs:599`) are set unconditionally inside the generic `cmdInit(workflowName, ...)` function (`rcode-tools.cjs:377`), which backs every `init <name>` subcommand that isn't `execute`, `plan`, `discuss`, or `chain` (see dispatcher at `rcode-tools.cjs:6632-6643`) — not uniquely `init sprint-plan`. The claim is not factually wrong for its narrow purpose (contrasting with `init execute`, which really does lack these fields), but could mislead a future maintainer into thinking `sprint-plan` is the sole source. Not worth a fix on its own; flag for the next pass through this paragraph if it's touched again.

## Test coverage

N/A — this phase is markdown workflow-instruction prose with no test suite; verification is grep/diff/wc-based per the plan's own `<verify>` blocks. All of the plan's own automated verify gates pass as written; findings 2 and 3 above are gaps in what those gates checked for (space-separated "acceptance criteria" and the 6th `parallelization` mention weren't grepped for), not failures of the gates that did run.

## Maintainability notes

- The `<pre_flight>` vs `<required_reading>` split (custom branch-protection prose early in the file, shared `git-preflight.md` contract loaded later) is itself a pre-existing structural pattern, not introduced by this phase — but this phase is the first to make the local copy config-aware without touching or cross-referencing the shared contract it was modeled on, which is what creates finding 1.
- The five-edit "field notes" paragraph at `execute.md:241-242` is dense (by design, per the plan's line-budget constraint) — correct, but a future editor adding a 6th caveat should watch the 1000-line cap (currently 998, 2 lines of headroom).

## Specific fixes required

1. `rcode/references/git-preflight.md:33-41` or `rcode/workflows/execute.md:38-43` — reconcile the two branch-protection mechanisms; document precedence or add the `branching_strategy: none` exception to the shared contract itself.
2. `rcode/workflows/plan-spawn-planner.md:266` and `.rcode/workflows/plan-spawn-planner.md:266` — reword away from "the acceptance criteria" to `<done>`-based phrasing.
3. `rcode/workflows/execute.md:279` and `.rcode/workflows/execute.md:279` — reword away from "the `parallelization` setting" to match the file's own new disclaimer 5 lines above.

## Optional improvements

4. Trim commit `81a06bc`'s subject to strictly under 72 chars (cosmetic, already merged — not worth an amend on its own).
5. Narrow the `init sprint-plan`-only phrasing at `execute.md:242` next time this paragraph is touched.
