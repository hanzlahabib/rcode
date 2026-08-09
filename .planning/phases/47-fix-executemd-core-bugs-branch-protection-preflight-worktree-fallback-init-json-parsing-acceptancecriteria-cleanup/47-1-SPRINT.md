---
phase: 47-fix-executemd-core-bugs-branch-protection-preflight-worktree-fallback-init-json-parsing-acceptancecriteria-cleanup
sprint: 47.1
type: execute
wave: 1
depends_on: []
files_modified:
  - rcode/workflows/execute.md
  - rcode/workflows/execute-sprint.md
  - rcode/workflows/plan-spawn-planner.md
  - .rcode/workflows/execute.md
  - .rcode/workflows/plan-spawn-planner.md
autonomous: true
requirements: []
must_haves:
  truths:
    - execute.md's pre_flight branch check skips the main/master refusal entirely when the `git.branching_strategy` config is `none`, and its override flag is spelled `--on-main` (matching git-preflight.md's actual bash parsing), not `--allow-main`
    - execute.md's USE_WORKTREES capture uses the two-line capture-then-`${VAR:-default}` idiom (matching plan.md lines 100/246/488) instead of the never-firing `|| echo "true"` pattern
    - execute.md's "Parse JSON for" field list (initialize step) matches the real, live `init execute` output — every field is either confirmed real with its actual location (e.g. `config.branching_strategy`), documented as a derivation (e.g. `phase_found` from `phase_dir !== null`), or explicitly flagged as having no data source (e.g. `parallelization`)
    - `acceptance_criteria` is no longer described as mandatory, enforced, or a real completion tier anywhere in execute.md, execute-sprint.md, or plan-spawn-planner.md — `<done>` + `<verify><automated>` (execution-time) and `<evidence>` (planning-time grounding) are the only tags referenced as real; this includes execute.md's `uat_gate` step, which previously instructed pulling "{list AC items from SPRINT.md}" — the same gap as the literal `acceptance_criteria` tag, just phrased as "AC" instead
    - `.rcode/workflows/execute.md` and `.rcode/workflows/plan-spawn-planner.md` mirrors are byte-identical to their `rcode/` source again after the fixes land; `.rcode/workflows/execute-sprint.md`'s pre-existing divergence from `rcode/workflows/execute-sprint.md` is left untouched
    - rcode/workflows/execute.md stays at or under the CLAUDE.md 1000-line cap after all fixes land
  artifacts:
    - rcode/workflows/execute.md — pre_flight branch check (skip-when-none + `--on-main`), USE_WORKTREES capture idiom, initialize-step field-parsing notes, the line-530 acceptance_criteria reference, and the uat_gate step's "AC items" print block + fail-branch line all fixed
    - rcode/workflows/execute-sprint.md — task-completion-precedence tier list (2 real tiers, not 3) and the MANDATORY completion-check bullet fixed
    - rcode/workflows/plan-spawn-planner.md — MANDATORY field list, Anti-Shallow Execution Rules item 3, and the quality_gate checklist item fixed to reference `<evidence>` not `<acceptance_criteria>`
    - .rcode/workflows/execute.md, .rcode/workflows/plan-spawn-planner.md — mirrors of the above, re-verified byte-identical to source
  key_links:
    - rcode/references/git-preflight.md is the actual enforcement contract (`@`-included at execute.md line 184) — its bash logic already checks for `--on-main` in three places; execute.md line 41's prose was the only place still saying `--allow-main`, so this is a one-file, one-line correction, not a two-file rename
    - rcode/workflows/plan.md lines 100, 246, 488 are the working reference idiom for the `config-get ... || echo default` bug class — execute.md's USE_WORKTREES line is the last surviving instance of the broken pattern in this phase's scope
    - `cmdInitExecute` in rcode/bin/rcode-tools.cjs (~line 863, return object at ~lines 953-973) is the ground truth for `init execute`'s real JSON shape — verified live this session against phase 45 and against a nonexistent phase number
    - `cmdPlanValidateEvidence` in rcode/bin/rcode-tools.cjs (~line 5104) is the only programmatic completion-tag check that exists today — it validates `<evidence>`, never `<acceptance_criteria>`, confirming the consumer-side fix direction
    - execute.md's `uat_gate` step (~line 719-770) is a second, independently-discovered instance of the acceptance_criteria/#1020 bug class: its UAT-checklist print block instructs pulling "{list AC items from SPRINT.md}" and its fail-branch says "Surface the failed AC items" — real SPRINT.md tasks never carry an AC field, only `<done>` + `<evidence>`, so both lines have no data source; fixed as part of task 47.1.4 (same file, same issue, same commit as the line-530 edit)
---

<objective>
Close 4 filed bugs in `rcode/workflows/execute.md` and its close siblings (`rcode/references/git-preflight.md`, `rcode/workflows/execute-sprint.md`, `rcode/workflows/plan-spawn-planner.md`): the branch-protection preflight check wrongly blocks execution even when `git.branching_strategy` is configured as `none`, and separately tells the user to pass a flag (`--allow-main`) that doesn't match what git-preflight.md's real enforcement logic checks for (`--on-main`); the `USE_WORKTREES` variable's `|| echo "true"` fallback never fires because `config-get` exits 0 with empty stdout on an absent key; execute.md documents parsing JSON fields from `init execute`'s output (`parallelization`, `phase_found`, `phase_number`, `phase_name`, `phase_slug`, `plan_count`, `incomplete_count`, `roadmap_exists`, `phase_req_ids`, `branch_name`, `commit_docs`) that do not exist at the documented location — verified live this session against the real `cmdInitExecute` implementation; and `execute-sprint.md`, `execute.md`, and `plan-spawn-planner.md` still treat a tag called `<acceptance_criteria>` as mandatory or as a real completion-precedence tier, when the real, currently-followed plan schema (`planner-playbook.md`, `sprint.md`) never emits that tag — it uses `<done>` and `<evidence>` instead, and the only programmatic check (`cmdPlanValidateEvidence`) validates `<evidence>`. This last bug class also shows up a second time, unflagged, in execute.md's `uat_gate` step, which instructs pulling "{list AC items from SPRINT.md}" — same missing-data-source problem, just spelled "AC" instead of the literal string `acceptance_criteria`. Fixes #1014, #1015, #1017, #1020.

Because 3 of these 4 fixes land in the same file (`rcode/workflows/execute.md`, currently 996 lines against this repo's CLAUDE.md 1000-line cap) in different, non-overlapping regions, the 5 tasks below run sequentially within this single plan rather than as parallel plans — a single executor works through them in written order, each producing its own commit referencing its issue number, with a final task propagating the combined result to the `.rcode/` dogfooded mirrors. The prose added by tasks 47.1.1-47.1.4 is deliberately kept line-tight (see the running line-count notes inside tasks 47.1.3 and 47.1.4) so the file provably lands at 998 lines — 2 lines under the 1000-line cap — rather than requiring the executor to trim on the fly.

Out of scope: the plan-research-validation.md portion of issue #1015 (handled by a sibling plan/agent), `rcode/workflows/autonomous.md`'s separate `--allow-main` flag (a different workflow's own flag definition, not part of these 4 issues), and any change to `.rcode/workflows/execute-sprint.md` (confirmed pre-existing, unrelated divergence from its `rcode/` source — must not be touched).
</objective>

<execution_context>
@.rcode/workflows/execute-sprint.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
</context>

<tasks>

<task id="47.1.1" type="auto">
<title>Fix branch-protection preflight to skip when branching_strategy is none, and rename --allow-main to --on-main</title>
<read_first>
- rcode/workflows/execute.md lines 35-51 (pre_flight step 4 "Branch check", especially sub-item "a. Not on main/master without consent" at lines 38-42 — re-grep exact current line numbers before editing, they may have shifted)
- rcode/references/git-preflight.md lines 33-41 ("Failure conditions"), lines 62-69 (override-flag list in the failure banner), and lines 99-107 ("Override flag semantics" table) — confirms `--on-main` is the canonical flag name enforced by this file's actual bash parsing logic (`BRANCH is in $PROTECTED AND user did not pass --on-main`)
- rcode/config.yaml and .rcode/config.yaml — confirm the config key is `git.branching_strategy` (nested under `git:`), read via `config-get git.branching_strategy` (verified live this session: `config-get branching_strategy` alone returns nothing; `config-get git.branching_strategy` returns the real value, e.g. `feature-branch`)
</read_first>
<files>rcode/workflows/execute.md</files>
<action>
In `rcode/workflows/execute.md`, inside `<pre_flight>` step 4 "Branch check", find sub-item `a.` — the exact current text (verified this session) is:

```
   a. **Not on main/master without consent**: if `git branch --show-current`
      returns `main` or `master`, refuse to execute. Suggest:
      `git switch -c <phase>-<plan>-<slug>` (e.g. `git switch -c 8-1-aria`).
      User can override only by passing `--allow-main` to /rcode-execute and
      explicitly typing the override on this turn.
```

Replace it with:

```
   a. **Not on main/master without consent** (skip entirely when `git.branching_strategy`
      config is `none` — check via `node .rcode/bin/rcode-tools.cjs config-get
      git.branching_strategy`): if `git branch --show-current` returns `main` or
      `master`, refuse to execute. Suggest: `git switch -c <phase>-<plan>-<slug>`
      (e.g. `git switch -c 8-1-aria`). User can override only by passing `--on-main`
      to /rcode-execute and explicitly typing the override on this turn.
```

This does two things in one edit: (1) makes the main/master refusal conditional — skip it
entirely when the configured `git.branching_strategy` is `none`, since committing directly to
main/master is the deliberately configured workflow in that case; (2) renames the override flag
from `--allow-main` to `--on-main`, matching the actual enforcement logic in
`rcode/references/git-preflight.md` (the file `@`-included at execute.md line 184, whose bash
parsing and failure banner already use `--on-main` in three places — `--allow-main` never existed
in git-preflight.md's real checks; it was execute.md's prose alone that had drifted).

Do not touch sub-item `b.` (working-tree-clean check) or anything else in `<pre_flight>`. Do not
touch `rcode/workflows/autonomous.md`'s own `--allow-main` flag — that is a separate workflow's
own flag definition and out of scope for this issue.

Line budget: this edit is net +1 line (5 lines → 6 lines) against the file's 996-line baseline,
bringing the running total to 997 after this task.

**Commit:** after verifying, run:
`git add rcode/workflows/execute.md && git commit -m "fix(execute): honor branching_strategy none, fix --on-main flag (#1014)" -m "Skip the main/master refusal entirely when git.branching_strategy is none, and rename the override flag from --allow-main to --on-main to match git-preflight.md's real enforcement logic."`
</action>
<verify>
<automated>
grep -q -- '--on-main' rcode/workflows/execute.md && \
! grep -q -- '--allow-main' rcode/workflows/execute.md && \
grep -q "git.branching_strategy" rcode/workflows/execute.md && \
grep -q -- '--on-main' rcode/references/git-preflight.md && \
echo PASS
</automated>
</verify>
<done>execute.md's pre_flight branch check explicitly skips the main/master refusal when `git.branching_strategy` is `none`, and its override-flag prose says `--on-main` (matching git-preflight.md's real enforcement), with zero remaining `--allow-main` references in execute.md.</done>
<evidence>Issue #1014, confirmed via direct read this session: execute.md lines 38-42 unconditionally refuse on main/master with no `branching_strategy` check anywhere in that block, and line 41 says `--allow-main` while `rcode/references/git-preflight.md` lines 38, 64, and 104 all define the real flag as `--on-main` (grep-verified this session: `grep -n "allow-main|on-main" rcode/references/git-preflight.md` → 4 hits, all `--on-main`; the same grep against execute.md → 1 hit, `--allow-main`, before this fix).</evidence>
</task>

<task id="47.1.2" type="auto">
<title>Fix the USE_WORKTREES config-get fallback that never fires</title>
<read_first>
- rcode/workflows/execute.md around line 248 (the `USE_WORKTREES=$(... || echo "true")` line, inside the "initialize" step's "Read worktree config" block — re-grep before editing, line number may have shifted after task 47.1.1's edit)
- rcode/workflows/plan.md lines 99-101, 244-247, 487-489 (the three existing working instances of the capture-then-`:-`-default idiom, e.g. `CONTEXT_WINDOW=$(...); CONTEXT_WINDOW=${CONTEXT_WINDOW:-200000}  # config-get exits 0 with empty output when key absent; || fallback won't fire`)
</read_first>
<files>rcode/workflows/execute.md</files>
<action>
In `rcode/workflows/execute.md`, inside the "initialize" step's "Read worktree config:" bash block, find the exact current line (verified this session):

```bash
USE_WORKTREES=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.use_worktrees 2>/dev/null || echo "true")
```

Replace it with the two-line capture-then-default idiom, copied exactly from `rcode/workflows/plan.md`'s working pattern (e.g. its `CONTEXT_WINDOW` line at ~line 100):

```bash
USE_WORKTREES=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.use_worktrees 2>/dev/null)
USE_WORKTREES=${USE_WORKTREES:-true}  # config-get exits 0 with empty output when key absent; || fallback won't fire
```

`config-get` exits 0 with empty stdout when the key is absent from config.yaml, so the old
`|| echo "true"` branch never triggered (the command substitution itself succeeded, just with
empty output) — `USE_WORKTREES` silently became an empty string instead of `"true"`. The two-line
capture-then-`${VAR:-default}` form is the same idiom plan.md already uses correctly in three
places, including the identical explanatory comment. Do not touch the `CONTEXT_WINDOW` block
immediately below this one — out of scope for this issue (a sibling agent handles the related
plan-research-validation.md instance of this bug class separately).

Line budget: this edit is net +1 line (1 line → 2 lines), bringing the running total to 998 after
this task.

**Commit:** after verifying, run:
`git add rcode/workflows/execute.md && git commit -m "fix(execute): fix USE_WORKTREES fallback that never fires (#1015)"`
</action>
<verify>
<automated>
grep -q 'USE_WORKTREES=${USE_WORKTREES:-true}' rcode/workflows/execute.md && \
! grep -q 'config-get workflow.use_worktrees 2>/dev/null || echo "true"' rcode/workflows/execute.md && \
echo PASS
</automated>
</verify>
<done>execute.md's USE_WORKTREES capture uses the two-line capture-then-`${VAR:-default}` idiom matching plan.md's working pattern, so the `true` default actually applies when `workflow.use_worktrees` is unset in config.yaml.</done>
<evidence>Issue #1015 (execute.md portion). Confirmed via direct read this session: execute.md line 248 uses `$(... || echo "true")`, and `config-get`'s real behavior (grep-verified against `cfg.cmdGet` in rcode/bin/lib/config.cjs and live-tested this session: `config-get workflow.use_worktrees` on an unset key prints nothing and exits 0) means the `||` branch is dead code. plan.md lines 100, 246, and 488 all use the working two-line form with an identical explanatory comment, confirmed via direct read this session.</evidence>
</task>

<task id="47.1.3" type="auto">
<title>Fix execute.md's documented init-execute JSON fields to match the real live output</title>
<read_first>
- rcode/workflows/execute.md lines 236-289 (the "initialize" step: JSON field-parsing line, phase_found/plan_count/state_exists gating, and the parallelization sentence — re-grep exact line numbers before editing, they will have shifted after tasks 47.1.1 and 47.1.2)
- rcode/workflows/execute.md line 52 (pre_flight step 5 "Worktree config" — mentions parallelization)
- rcode/workflows/execute.md lines 350-361 (handle_branching step — uses branch_name)
- rcode/workflows/execute.md lines 363-366 (validate_phase step — uses phase_dir/plan_count/incomplete_count)
- rcode/bin/rcode-tools.cjs lines 863-974 (`cmdInitExecute` — the real implementation; its return object, ~lines 953-973, has exactly: workflow, target, flags, plan_path, phase_dir, plans, response_language, executor_model, verifier_model, config, paths, state_exists — no commit_docs/parallelization/branch_name/phase_found/phase_number/phase_name/phase_slug/incomplete_plans/plan_count/incomplete_count/roadmap_exists/phase_req_ids anywhere)
- rcode/bin/rcode-tools.cjs lines 5261-5313 (`cmdPhasePlanIndex` — confirms `parallelization` is absent from this command's output too: phase, phase_dir, plans[], waves, incomplete, has_checkpoints)
</read_first>
<files>rcode/workflows/execute.md</files>
<action>
Make five edits in `rcode/workflows/execute.md`, all in the "initialize" step and its neighbors. Re-grep each anchor before editing since line numbers will have shifted from tasks 47.1.1 and 47.1.2.

**Edit 1 — the field-parsing line.** Replace this exact current line:
```
Parse JSON for: `executor_model`, `verifier_model`, `commit_docs`, `parallelization`, `branching_strategy`, `branch_name`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `plans`, `incomplete_plans`, `plan_count`, `incomplete_count`, `state_exists`, `roadmap_exists`, `phase_req_ids`, `response_language`.
```
with these two lines (deliberately written as two dense paragraphs with no blank line between them, to stay line-tight — see the line-budget note at the end of this task):
```
Parse JSON for these real, top-level fields: `executor_model`, `verifier_model`, `phase_dir`, `plans`, `state_exists`, `response_language`. Fields commonly assumed to exist but that are NOT top-level (verified live this session against `init execute`'s real output, `cmdInitExecute` in rcode-tools.cjs): `branching_strategy` is nested under `config.branching_strategy`; `commit_docs` doesn't exist (closest real value is `config.commit_planning`, a `"true"`/`"false"` string); `parallelization` has no source anywhere (not top-level, not under `config`, not in `phase-plan-index`'s output either); `branch_name` isn't returned (the `handle_branching` step below now computes it from config instead); `phase_name` isn't derivable either (`phase_dir`'s basename is a slug, not the human-readable name — read ROADMAP.md if a step needs it); `incomplete_plans`/`incomplete_count` don't exist (`plans[]` items only carry `{path, depends_on, wave, plan}`, no completion field); `roadmap_exists`/`phase_req_ids` are returned only by the separate `init sprint-plan` command, not `init execute`.
Derivable, not literal: `phase_found` as `phase_dir !== null`; `phase_number` as the `target` field (the raw phase argument as passed, e.g. `"45"`); `phase_slug` from `phase_dir`'s basename (the part after the first `-`); `plan_count` as `plans.length`. Downstream `${PHASE_NUMBER}`/`${PLAN_COUNT}` references later in this workflow (snapshot tag, review prompts, `phase complete`, etc.) resolve from `target`/`plans.length` per these derivations; `${PHASE_NAME}` and `${INCOMPLETE_COUNT}` have no source here — read `PHASE_NAME` from ROADMAP.md if a later step needs it, and treat `INCOMPLETE_COUNT` as unknown until `phase-plan-index` runs in `discover_and_group_plans` (which does return a real per-plan `has_summary` completion signal).
```

**Edit 2 — pre_flight step 5 (line ~52).** Replace this exact current 2-line text:
```
5. **Worktree config**: read `workflow.use_worktrees` — if true + parallelization
   is true + no file overlaps, plans in a wave run parallel via worktrees
```
with this single line:
```
5. **Worktree config**: read `workflow.use_worktrees` — if true + no file overlaps, plans in a wave run parallel via worktrees. (`parallelization` is not a real field in `init execute`'s output — see the "initialize" step below; don't gate on it.)
```

**Edit 3 — phase_found/plan_count/parallelization gating.** Replace this exact current text:
```
**If `phase_found` is false:** Error — phase directory not found. Run `/rcode-status` to inspect state or `/rcode-plan {N}` to create the phase.
**If `plan_count` is 0:** Error — no plans found in phase. Run `/rcode-plan {N}` to generate plans or `/rcode-help` for the command surface.
**If `state_exists` is false but `.planning/` exists:** Offer reconstruct or continue.

When `parallelization` is false, plans within a wave execute sequentially.
```
with:
```
**If `phase_dir` is `null` (derived `phase_found` false):** Error — phase directory not found. Run `/rcode-status` to inspect state or `/rcode-plan {N}` to create the phase.
**If `plans.length` is 0 (derived `plan_count` 0):** Error — no plans found in phase. Run `/rcode-plan {N}` to generate plans or `/rcode-help` for the command surface.
**If `state_exists` is false but `.planning/` exists:** Offer reconstruct or continue.

`parallelization` is not a real field in `init execute`'s output (see the "initialize" step's field notes above) — this line currently documents behavior with no data source; don't treat it as a working toggle until a real source is wired in.
```

**Edit 4 — handle_branching step (line ~355).** Replace this exact current text:
```
**"phase" or "milestone":** Use pre-computed `branch_name` from init:
```bash
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
```
```
with:
```
**"phase" or "milestone":** `init execute` does not return `branch_name` (see the "initialize" step's field notes above) — compute `BRANCH_NAME` from `workflow.branch_pattern` config (default `<phase>-<plan>-<slug>`) before running:
```bash
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
```
```

**Edit 5 — validate_phase step (lines ~364-366).** Replace this exact current text:
```
From init JSON: `phase_dir`, `plan_count`, `incomplete_count`.

Report: "Found {plan_count} plans in {phase_dir} ({incomplete_count} incomplete)"
```
with:
```
From init JSON: `phase_dir` (real); `plan_count` derives as `plans.length`; `incomplete_count` has no source at this point (see the "initialize" step's field notes) — treat as unknown until `phase-plan-index` runs.

Report: "Found {plan_count} plans in {phase_dir} ({incomplete_count} incomplete)"
```

**Line budget (running total, provable by construction, not by post-hoc trimming):** baseline
996 lines. After task 47.1.1 (+1): 997. After task 47.1.2 (+1): 998. This task's five edits net to
0 lines overall: Edit 1 is +1 (1 line → 2 lines, using the no-blank-line-between-paragraphs form
above — do not add a blank line between the two paragraphs, that would cost an extra line), Edit 2
is -1 (2 lines → 1 line), and Edits 3, 4, and 5 are each net 0 (same line count in, same line count
out). Task total: +1 -1 +0 +0 +0 = 0. Running total after this task: 998 lines — 2 lines under the
1000-line cap, before task 47.1.4's line-neutral edits land. Confirm with `wc -l` after applying;
if your actual wording drifted from the diffs above and the count differs, compact the two Edit 1
paragraphs further (they can absorb more trimming) rather than touching Edits 2-5's structure.

**Commit:** after verifying, run:
`git add rcode/workflows/execute.md && git commit -m "fix(execute): correct init-execute JSON field docs (#1017)"`
</action>
<verify>
<automated>
grep -q 'config.branching_strategy' rcode/workflows/execute.md && \
grep -q 'config.commit_planning' rcode/workflows/execute.md && \
grep -q 'phase_dir !== null' rcode/workflows/execute.md && \
grep -q 'plans.length' rcode/workflows/execute.md && \
grep -q 'not a real field' rcode/workflows/execute.md && \
grep -q 'branch_pattern' rcode/workflows/execute.md && \
[ "$(wc -l < rcode/workflows/execute.md)" -le 1000 ] && \
echo PASS
</automated>
</verify>
<done>execute.md's "initialize" step documents only the real top-level `init execute` fields, gives the correct nested/derived location for every field that is real-but-misplaced or derivable, and explicitly flags every field with no data source (parallelization, branch_name, phase_name, incomplete_plans/incomplete_count, roadmap_exists, phase_req_ids, commit_docs-as-named) instead of silently leaving broken parsing instructions; the file stays at or under 1000 lines.</done>
<evidence>Issue #1017 (execute.md portion). Live-verified this session via `node .rcode/bin/rcode-tools.cjs init execute 45` piped through a Node JSON inspector: the real top-level keys are exactly `workflow, target, flags, plan_path, phase_dir, plans, response_language, executor_model, verifier_model, config, paths, state_exists`; `config.branching_strategy` is present (`"feature-branch"`); `config.commit_planning` is present; none of `commit_docs, parallelization, branch_name, phase_found, phase_number, phase_name, phase_slug, incomplete_plans, plan_count, incomplete_count, roadmap_exists, phase_req_ids` exist anywhere in the output, confirmed by `Object.keys()` on the full parsed JSON and its `config` sub-object. `cmdPhasePlanIndex` (rcode-tools.cjs lines 5261-5313) confirmed separately to also lack a `parallelization` field.</evidence>
</task>

<task id="47.1.4" type="auto">
<title>Remove acceptance_criteria as a mandatory/real completion tier from execute-sprint.md, plan-spawn-planner.md, and execute.md (including the uat_gate step's AC-items block)</title>
<read_first>
- rcode/workflows/execute-sprint.md lines 196-206 (the "Task completion precedence" 3-tier list and the "MANDATORY acceptance_criteria check" bullet immediately below it)
- rcode/workflows/plan-spawn-planner.md line 117 (downstream-consumer field list), lines 245-260 (Anti-Shallow Execution Rules numbered list, item 3 = `<acceptance_criteria>`), line 328 (quality_gate checklist item)
- rcode/workflows/execute.md line 530 (the "run_verify_commands" step's `<acceptance_criteria>` reference — re-grep exact line number before editing, it will have shifted after tasks 47.1.1-47.1.3)
- rcode/workflows/execute.md around line 748 (the `uat_gate` step's UAT-checklist print block, whose current text — verified this session — is "The following acceptance criteria require human verification before / the phase can advance to `status: complete`:" followed by a blank line and `{list AC items from SPRINT.md}`), and around line 764 (the same step's `fail`-branch bullet "2. Surface the failed AC items.") — real SPRINT.md tasks carry `<done>` + `<evidence>` only, never an AC field, so both lines have no data source; re-grep exact current line numbers before editing, they will have shifted after tasks 47.1.1-47.1.3 (net +2 lines above this point in the file)
- rcode/references/planner-playbook.md lines 25-34 ("Task Anatomy" — the real, currently-followed schema: `<files>`, `<action>`, `<verify>`, `<done>`, `<evidence>` — no `<acceptance_criteria>` tag anywhere)
- rcode/templates/sprint.md lines 17-28 (the real `<task>` block template — same five fields, no `<acceptance_criteria>`)
</read_first>
<files>rcode/workflows/execute-sprint.md
rcode/workflows/plan-spawn-planner.md
rcode/workflows/execute.md</files>
<action>
**In `rcode/workflows/execute-sprint.md`**, replace this exact current text (indentation preserved — 5 spaces before `1.`/`2.`/`3.`, 3 spaces before the bullet lines):
```
   - **Task completion precedence (when signals conflict):**
     1. `<verify><automated>` — machine-executable shell commands. **Highest authority.** If these pass, the task is done. If these fail, the task is NOT done — regardless of what `<acceptance_criteria>` says.
     2. `<done>` — single observable sentence. Use as the human-readable confirmation once automated checks pass.
     3. `<acceptance_criteria>` — prose checklist. **Lowest authority.** Use as a guide during implementation, but automated results override prose judgments.
     - If `<verify><automated>` is absent: fall back to `<done>`, then `<acceptance_criteria>`.
   - **MANDATORY acceptance_criteria check:** After completing each task, if it has `<acceptance_criteria>`, verify EVERY criterion before moving to the next task. Use grep, file reads, or CLI commands to confirm each criterion. If any criterion fails, fix the implementation before proceeding. Do not skip criteria or mark them as "will verify later".
```
with:
```
   - **Task completion precedence (when signals conflict):**
     1. `<verify><automated>` — machine-executable shell commands. **Highest authority.** If these pass, the task is done. If these fail, the task is NOT done — regardless of what `<done>` says.
     2. `<done>` — single observable sentence. Use as the human-readable confirmation once automated checks pass.
     - If `<verify><automated>` is absent: fall back to `<done>` alone. `<evidence>` (grep hits, line ranges, or a creates-justification recorded by the planner per issue #649) is supporting grounding, not a completion signal to re-check here — the real plan schema (planner-playbook.md, sprint.md) has no `<acceptance_criteria>` tag.
   - **MANDATORY completion check:** After completing each task, confirm `<verify><automated>` passes (or, if absent, that the task's `<done>` sentence is observably true). Use grep, file reads, or CLI commands to confirm. If any check fails, fix the implementation before proceeding. Do not skip this or mark it as "will verify later".
```

**In `rcode/workflows/plan-spawn-planner.md`**, make three edits:

1. Replace this exact current line (117):
```
- Tasks in XML format with read_first, files, acceptance_criteria, verify (with `<automated>` child), and done fields (MANDATORY on every task)
```
with:
```
- Tasks in XML format with read_first, files, evidence, verify (with `<automated>` child), and done fields (MANDATORY on every task)
```

2. Replace this exact current block (Anti-Shallow Execution Rules item 3):
```
3. **`<acceptance_criteria>`** — Verifiable conditions that prove the task was done correctly. Rules:
   - Every criterion must be checkable with grep, file read, test command, or CLI output
   - NEVER use subjective language ("looks correct", "properly configured", "consistent with")
   - ALWAYS include exact strings, patterns, values, or command outputs that must be present
   - Examples:
     - Code: `auth.py contains def verify_token(` / `test_auth.py exits 0`
     - Config: `.env.example contains DATABASE_URL=` / `Dockerfile contains HEALTHCHECK`
     - Docs: `README.md contains '## Installation'` / `API.md lists all endpoints`
     - Infra: `deploy.yml has rollback step` / `docker-compose.yml has healthcheck for db`
```
with:
```
3. **`<evidence>`** — REQUIRED (issue #649). Must show codebase grounding proving the task is real, not theoretical. At minimum one of:
   - `grep:` a literal grep/Glob pattern + count of matches that justified this task (e.g. `` `rg '\.alert' apps/web/src` → 13 hits across 9 files ``)
   - `lines:` exact `path:line-line` ranges of code being modified
   - `creates:` the file paths being created from scratch (with one-line justification why no existing file fits)
   A task without `<evidence>` is theoretical and MUST NOT be written. (Matches `rcode/references/planner-playbook.md`'s "Task Anatomy" section — single source of truth for this rule.)
```

3. Replace this exact current quality_gate line (328):
```
- [ ] Every task has `<acceptance_criteria>` with grep-verifiable conditions
```
with:
```
- [ ] Every task has `<evidence>` with grep/lines/creates codebase grounding per issue #649 — NOT `<acceptance_criteria>` (that tag is not part of the real plan schema)
```

**In `rcode/workflows/execute.md`**, make two edits:

1. Replace this exact current line (~530, in the `run_verify_commands` step):
```
After all executor agents finish, extract and run any `<verify>` blocks defined in plan tasks. These are the machine-executable counterpart to `<acceptance_criteria>` prose.
```
with:
```
After all executor agents finish, extract and run any `<verify>` blocks defined in plan tasks. These are the machine-executable proof that a task's `<done>` criteria are met — the plan schema has no `<acceptance_criteria>` tag; `<verify><automated>` plus `<evidence>` grounding are what the planner and executor actually emit and enforce.
```

2. In the `uat_gate` step (~line 748, re-grep exact current line numbers first), replace this exact current 4-line block:
```
   The following acceptance criteria require human verification before
   the phase can advance to `status: complete`:

   {list AC items from SPRINT.md}
```
with:
```
   The following task completion criteria require human verification before
   the phase can advance to `status: complete`:

   {list each task's <done> sentence from SPRINT.md}
```

Then, a few lines below in the same step's `fail` branch, replace this exact current line:
```
2. Surface the failed AC items.
```
with:
```
2. Surface the tasks whose `<done>` criteria failed human verification.
```

This uat_gate edit is the same issue (#1020) and the same file (execute.md) as edit 1 above —
real SPRINT.md tasks carry `<done>` + `<evidence>`, never an "AC" (acceptance criteria) field, so
the old instructions had no data source to pull from; they just used the literal string "AC"
instead of "acceptance_criteria", which is why they weren't caught by this plan's earlier
`acceptance_criteria`-string grep gates.

Line budget: both execute.md edits in this task are line-count-neutral (1 line → 1 line for edit
1; 4 lines → 4 lines and 1 line → 1 line for edit 2), so execute.md's running total stays at 998
lines after this task — unchanged from the end of task 47.1.3, and 2 lines under the 1000-line cap.

**Commit:** after verifying, run:
`git add rcode/workflows/execute-sprint.md rcode/workflows/plan-spawn-planner.md rcode/workflows/execute.md && git commit -m "fix(execute): drop acceptance_criteria, use done+evidence (#1020)" -m "Remove acceptance_criteria as a mandatory/real completion tier from execute-sprint.md's precedence list, plan-spawn-planner.md's field list and Anti-Shallow rules, and execute.md's verify-commands and uat_gate steps; the real plan schema only emits <done> and <evidence>."`
</action>
<verify>
<automated>
! grep -q 'acceptance_criteria' rcode/workflows/execute-sprint.md && \
! grep -q 'acceptance_criteria' rcode/workflows/plan-spawn-planner.md && \
! grep -q 'acceptance_criteria' rcode/workflows/execute.md && \
! grep -q 'AC items' rcode/workflows/execute.md && \
grep -q '<evidence>' rcode/workflows/plan-spawn-planner.md && \
grep -q 'MANDATORY completion check' rcode/workflows/execute-sprint.md && \
[ "$(wc -l < rcode/workflows/execute.md)" -le 1000 ] && \
echo PASS
</automated>
</verify>
<done>`acceptance_criteria` no longer appears anywhere in execute-sprint.md, plan-spawn-planner.md, or execute.md — including execute.md's `uat_gate` step, whose "AC items" print block and fail-branch bullet were a second, unflagged instance of the same gap (issue #1020, phrased without the literal string `acceptance_criteria`); each file's completion-tier/mandatory-field/UAT language now references `<done>`, `<verify><automated>`, and `<evidence>` — the tags the real plan schema (planner-playbook.md, sprint.md, cmdPlanValidateEvidence) actually emits and enforces.</done>
<evidence>Issue #1020, confirmed via direct read + grep this session: `rcode/references/planner-playbook.md` lines 25-34 and `rcode/templates/sprint.md` lines 17-28 both define the real task schema as `<read_first>`, `<files>`, `<action>`, `<verify><automated>`, `<done>`, `<evidence>` — no `<acceptance_criteria>` tag. `cmdPlanValidateEvidence` (rcode-tools.cjs line 5104) is the only programmatic completion-tag check and it validates `<evidence>`, never `<acceptance_criteria>`. Grep this session found `acceptance_criteria` at execute-sprint.md lines 201/203/204/205 (4 hits), plan-spawn-planner.md lines 117/260/328 (3 hits), and execute.md line 530 (1 hit) — 8 hits total across 3 files, all removed by this task. The `uat_gate` step's print block (verified this session at execute.md lines 744-758, "The following acceptance criteria require human verification..." / "{list AC items from SPRINT.md}") and its fail-branch (line 764, "Surface the failed AC items.") are a second, independently-discovered instance of the same missing-data-source problem — confirmed via direct read this session at rcode/workflows/execute.md lines 719-770, and fixed here rather than as a separate task since it's the same file, same issue, same commit as the line-530 edit above.</evidence>
</task>

<task id="47.1.5" type="auto">
<title>Propagate execute.md and plan-spawn-planner.md fixes into the .rcode/ dogfooded mirrors; verify git-preflight.md mirror needs no change</title>
<read_first>
- .rcode/workflows/execute.md (full file — confirmed byte-identical to rcode/workflows/execute.md before tasks 47.1.1-47.1.4 in this same plan)
- .rcode/workflows/plan-spawn-planner.md (full file — confirmed byte-identical to rcode/workflows/plan-spawn-planner.md before task 47.1.4)
- .rcode/references/git-preflight.md (confirmed byte-identical to rcode/references/git-preflight.md; no edit lands on the source in this plan, so nothing to propagate here — verify only)
- .rcode/workflows/execute-sprint.md (confirmed to ALREADY DIVERGE from rcode/workflows/execute-sprint.md before this plan — pre-existing, unrelated divergence; DO NOT mirror task 47.1.4's execute-sprint.md changes here)
</read_first>
<files>.rcode/workflows/execute.md
.rcode/workflows/plan-spawn-planner.md</files>
<action>
First, re-verify at execution time (do not assume the planning-time observation still holds):
```bash
diff rcode/workflows/execute.md .rcode/workflows/execute.md
diff rcode/workflows/plan-spawn-planner.md .rcode/workflows/plan-spawn-planner.md
diff rcode/references/git-preflight.md .rcode/references/git-preflight.md
```

Expect:
- The first diff shows exactly the combined changes from tasks 47.1.1, 47.1.2, 47.1.3, and 47.1.4's two execute.md edits (the branch-check skip-when-none + `--on-main` rename, the USE_WORKTREES two-line idiom, the five "initialize" step field-parsing edits, the line-530 acceptance_criteria rewording, and the uat_gate step's AC-items rewording) — present in `rcode/workflows/execute.md`, absent from `.rcode/workflows/execute.md`.
- The second diff shows exactly task 47.1.4's three plan-spawn-planner.md edits (the field list at line 117, the Anti-Shallow Execution Rules item 3, and the quality_gate checklist line) — present in `rcode/workflows/plan-spawn-planner.md`, absent from `.rcode/workflows/plan-spawn-planner.md`.
- The third diff (git-preflight.md) shows NO output — this file was not edited by any task in this plan (it was already correct), so its mirror needs no change; just confirm it stays identical.

If either of the first two diffs shows any OTHER difference beyond the expected task-scoped changes, STOP and report the unexpected divergence instead of applying this task's edit — do not blindly overwrite unrelated content. If the third diff (git-preflight.md) is non-empty, STOP and report — that would mean an out-of-plan change touched one of these files.

If the diffs match expectations, apply the identical edits to the two mirror files:

1. Apply task 47.1.1's branch-check edit (skip-when-none + `--on-main` rename) to `.rcode/workflows/execute.md`.
2. Apply task 47.1.2's USE_WORKTREES two-line idiom to `.rcode/workflows/execute.md`.
3. Apply task 47.1.3's five field-parsing edits to `.rcode/workflows/execute.md`.
4. Apply task 47.1.4's two execute.md edits (line-530 rewording and uat_gate AC-items rewording) to `.rcode/workflows/execute.md`.
5. Apply task 47.1.4's three plan-spawn-planner.md edits to `.rcode/workflows/plan-spawn-planner.md`.

Do NOT touch `.rcode/workflows/execute-sprint.md` — its pre-existing divergence from
`rcode/workflows/execute-sprint.md` is unrelated to this phase and must be left as-is; task
47.1.4's execute-sprint.md changes stay source-only per this phase's explicit scope.

After editing, re-run all three `diff` commands above and confirm the first two now produce no
output (exit 0 — byte-identical again) and the third still produces no output.

**Commit:** after verifying, run:
`git add .rcode/workflows/execute.md .rcode/workflows/plan-spawn-planner.md && git commit -m "chore(workflows): sync execute.md, plan-spawn-planner.md mirrors (#1020)" -m "Propagates fixes for #1014, #1015, #1017, #1020 from rcode/workflows/ into the .rcode/ dogfooded mirrors."`
</action>
<verify>
<automated>
diff -q rcode/workflows/execute.md .rcode/workflows/execute.md && \
diff -q rcode/workflows/plan-spawn-planner.md .rcode/workflows/plan-spawn-planner.md && \
diff -q rcode/references/git-preflight.md .rcode/references/git-preflight.md && \
! diff -q rcode/workflows/execute-sprint.md .rcode/workflows/execute-sprint.md >/dev/null 2>&1 && \
echo PASS
</automated>
</verify>
<done>`.rcode/workflows/execute.md` and `.rcode/workflows/plan-spawn-planner.md` are byte-identical to their `rcode/` sources again, both carrying all 4 issues' fixes; `.rcode/references/git-preflight.md` remains byte-identical (no change needed — it was already correct); `.rcode/workflows/execute-sprint.md`'s pre-existing divergence from its source is confirmed still present and untouched.</done>
<evidence>Pre-verified ground truth (this planning session): `diff -q rcode/workflows/execute.md .rcode/workflows/execute.md`, `diff -q rcode/references/git-preflight.md .rcode/references/git-preflight.md`, and `diff -q rcode/workflows/plan-spawn-planner.md .rcode/workflows/plan-spawn-planner.md` all produced no output (byte-identical) before this plan's tasks ran; `diff -q rcode/workflows/execute-sprint.md .rcode/workflows/execute-sprint.md` produced "Files ... differ" (pre-existing divergence), confirmed this session.</evidence>
</task>

</tasks>

<verification>
- `grep -q -- '--on-main' rcode/workflows/execute.md` and `! grep -q -- '--allow-main' rcode/workflows/execute.md`
- `grep -q 'USE_WORKTREES=${USE_WORKTREES:-true}' rcode/workflows/execute.md`
- `grep -q 'config.branching_strategy' rcode/workflows/execute.md` and `grep -q 'plans.length' rcode/workflows/execute.md`
- `! grep -q 'acceptance_criteria' rcode/workflows/execute.md rcode/workflows/execute-sprint.md rcode/workflows/plan-spawn-planner.md` and `! grep -q 'AC items' rcode/workflows/execute.md`
- `[ "$(wc -l < rcode/workflows/execute.md)" -le 1000 ]` (expected: 998)
- `diff -q rcode/workflows/execute.md .rcode/workflows/execute.md` and `diff -q rcode/workflows/plan-spawn-planner.md .rcode/workflows/plan-spawn-planner.md` both exit 0
- `git log --oneline -5` shows 5 commits, 4 referencing #1014/#1015/#1017/#1020 individually plus 1 mirror-propagation commit
</verification>

<success_criteria>
- Each of the 4 issues (#1014, #1015, #1017, #1020) has its own commit
- execute.md's documented JSON parsing matches the real `init execute` output verified live this session — every field is real-with-location, derivable, or explicitly flagged as absent
- `--on-main`/`--allow-main` naming is consistent between execute.md and git-preflight.md's actual bash parsing (both say `--on-main`)
- `acceptance_criteria` is no longer described as mandatory/enforced anywhere in execute.md, execute-sprint.md, or plan-spawn-planner.md — including execute.md's `uat_gate` step's "AC items" phrasing
- `.rcode/workflows/execute.md` and `.rcode/workflows/plan-spawn-planner.md` mirror their `rcode/` sources again; `.rcode/workflows/execute-sprint.md`'s pre-existing divergence is untouched
- `rcode/workflows/execute.md` stays at or under 1000 lines (CLAUDE.md cap) — expected final count 998
- All 5 commit subject lines are ≤72 chars and follow Conventional Commits format
</success_criteria>

<output>
Create `.planning/phases/47-fix-executemd-core-bugs-branch-protection-preflight-worktree-fallback-init-json-parsing-acceptancecriteria-cleanup/47-1-SUMMARY.md`
</output>

## Files Touched

**Creates:**
<!-- none -->

**Modifies:**
- `rcode/workflows/execute.md` — branch-protection skip-when-none + `--on-main` flag rename (#1014); USE_WORKTREES two-line capture idiom (#1015); init-execute JSON field-parsing doc corrections across 5 spots (#1017); `<acceptance_criteria>` reference removed from run_verify_commands, and the uat_gate step's "AC items" print block + fail-branch line rewritten to use `<done>` (#1020)
- `rcode/workflows/execute-sprint.md` — task-completion-precedence tier list reduced to the 2 real tiers, MANDATORY check bullet rewritten (#1020)
- `rcode/workflows/plan-spawn-planner.md` — MANDATORY field list, Anti-Shallow Execution Rules item 3, and quality_gate checklist item all switched from `<acceptance_criteria>` to `<evidence>` (#1020)
- `.rcode/workflows/execute.md` — mirrored copy of all execute.md fixes above, re-verified byte-identical to source
- `.rcode/workflows/plan-spawn-planner.md` — mirrored copy of the plan-spawn-planner.md fixes above, re-verified byte-identical to source

**Tests:**
<!-- none — this is a markdown workflow-prose fix with no test file; acceptance is grep/diff/wc-verified per task -->
</content>
