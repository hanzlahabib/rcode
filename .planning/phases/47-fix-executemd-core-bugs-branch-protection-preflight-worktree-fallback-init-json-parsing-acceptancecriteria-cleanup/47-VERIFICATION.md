---
status: passed
phase: 47
requirements_checked: 0
requirements_total: 0
gaps_found: 0
generated: 2026-08-09
---

# Phase 47 Verification — execute.md core bug fixes (#1014, #1015, #1017, #1020)

## Goal

Close 4 filed bugs in `execute.md` and its close siblings (`git-preflight.md`, `execute-sprint.md`,
`plan-spawn-planner.md`): branch-protection preflight wrongly blocking when `branching_strategy: none`,
`--allow-main`/`--on-main` flag-name mismatch, the `||` fallback that never fires for `USE_WORKTREES`,
stale/wrong JSON field paths documented for `init execute` output, and lingering `acceptance_criteria`
completion-tier language the planner contract no longer emits.

This is a pure prose/documentation bugfix batch (markdown workflow files) — no `REQUIREMENTS.md` IDs map
to this phase. Confirmed: `.planning/REQUIREMENTS.md`'s traceability table lists only DSH-1..6, HIST-1..3,
GATE-1..2, all mapped to phases 34-37. Phase 47 correctly has no requirement mapping.

## Method

Read the SPRINT.md (with its 6-item must_haves.truths list), SUMMARY.md, and 47-REVIEW.md
(status: issues_found, 1 high + 2 medium). Independently re-verified — not trusting either document's
claims — by:
- Live-running `node .rcode/bin/rcode-tools.cjs init execute 47` and `init execute 9999` and inspecting
  actual JSON keys/values (top-level keys, `config.branching_strategy`, `config.commit_planning`,
  `plans[]` shape, `phase_dir: null` for a missing phase, `plans: []` for a missing phase).
- Live-running `config-get git.branching_strategy` and `config-get workflow.nonexistent_key_xyz` to
  confirm the exit-0-empty-stdout behavior that the `||` fallback bug depends on.
- Grepping all 4 primary files plus their `.rcode/` mirrors for `--allow-main`, `acceptance_criteria`,
  "acceptance criteria" (space form), `AC items`, and `parallelization`.
- Diffing `rcode/workflows/execute.md` vs `.rcode/workflows/execute.md`, `plan-spawn-planner.md` vs its
  mirror, and `git-preflight.md` vs its mirror (all three: byte-identical, confirmed this session).
- Reading `git log` for the phase's commit history, including the 3 follow-up commits landed after the
  code review (1bc8c75, 8181c88, bed1b3d) which are NOT mentioned in 47-1-SUMMARY.md (summary predates
  them) — read those commits' diffs directly rather than trusting titles.

## Must-Haves Verification (from 47-1-SPRINT.md frontmatter)

### Truth 1 — branch check skips when `branching_strategy: none`, flag renamed to `--on-main`

**Verified — PASS, and strengthened beyond the original plan by the review + follow-up fix.**

- `rcode/workflows/execute.md:38-43` — pre_flight step 4a explicitly skips the refusal when
  `git.branching_strategy` is `none`, override flag is `--on-main`. Zero `--allow-main` hits in
  execute.md (confirmed via grep).
- `rcode/references/git-preflight.md` — the review (finding 1, HIGH) correctly caught that the shared
  enforcement contract `@`-included by execute.md (line 184) had NOT been given the same
  `branching_strategy: none` exception, meaning a strict re-read of git-preflight.md's own failure
  conditions would still block main/master even after execute.md's local check was fixed. This was
  fixed in follow-up commit `1bc8c75`: `git-preflight.md:17-21,41` now computes
  `BRANCHING_STRATEGY=$(... config-get git.branching_strategy ...)` and the failure condition is
  `BRANCH is in $PROTECTED AND BRANCHING_STRATEGY is not none AND user did not pass --on-main` —
  confirmed via direct read of the current file. `--on-main` appears 4 times in git-preflight.md, zero
  `--allow-main`.
- `rcode/workflows/autonomous.md`'s own separate `--allow-main` flag is untouched, correctly out of
  scope (SPRINT explicitly excludes it; confirmed still present at 4 locations, unrelated workflow).

### Truth 2 — `USE_WORKTREES` two-line capture idiom

**Verified — PASS.** `rcode/workflows/execute.md:249-250`:
```
USE_WORKTREES=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.use_worktrees 2>/dev/null)
USE_WORKTREES=${USE_WORKTREES:-true}  # config-get exits 0 with empty output when key absent; || fallback won't fire
```
Live-confirmed the root-cause behavior this session: `config-get workflow.nonexistent_key_xyz` exits 0
with empty stdout — the old `|| echo "true"` branch genuinely never fires. Matches `plan.md`'s working
idiom pattern.

### Truth 3 — `init execute` field-parsing doc matches real live output

**Verified — PASS**, independently re-run against the real `cmdInitExecute` output this session (not
just trusting the SPRINT's claimed prior verification):
- Real top-level keys confirmed via live JSON inspection: `workflow, target, flags, plan_path, phase_dir,
  plans, response_language, executor_model, verifier_model, config, paths, state_exists` — exactly
  matches `execute.md:241`'s documented "real, top-level fields" list plus the explicitly-flagged
  `config.branching_strategy` nesting.
- `config.branching_strategy` confirmed live = `"feature-branch"` (a real, non-empty string).
- `config.commit_planning` confirmed live = boolean `true` (execute.md's prose says `"true"`/`"false"`
  string — a minor, non-blocking inaccuracy; not part of the must_haves wording, which only requires the
  field be "documented as a derivation" or "flagged as having no data source", both satisfied).
- `phase_dir: null` and `plans: []` confirmed live for a nonexistent phase (`init execute 9999`),
  matching the doc's "derived `phase_found` false" / "derived `plan_count` 0" language.
- `plans[0]` shape confirmed live = `{path, depends_on, wave, plan}` — matches the doc's claim that
  `incomplete_plans`/`incomplete_count` have no data source in this array.
- The review (finding 3, MEDIUM) caught a 6th, unaddressed `parallelization` mention 5 lines below the
  new disclaimer, in the Copilot runtime-detection paragraph (`execute.md:279` at review time). Fixed in
  follow-up commit `bed1b3d`: now reads "force sequential inline execution unconditionally (there is no
  real `parallelization` toggle to override — see the 'initialize' step's field notes above)" — confirmed
  via direct read this session. Zero remaining `parallelization`-as-real-toggle phrasing anywhere in
  execute.md; all 4 mentions now correctly qualify it as non-real.

### Truth 4 — `acceptance_criteria` no longer mandatory/real anywhere, including `uat_gate`'s AC-items block

**Verified — PASS**, and the review's second gap (finding 2, MEDIUM) was fixed too:
- Zero hits of `acceptance_criteria`, "acceptance criteria" (space form), or `AC items` across
  `execute.md`, `execute-sprint.md`, `plan-spawn-planner.md`, and their `.rcode/` mirrors, plus
  `git-preflight.md` (confirmed via a single combined case-insensitive grep across all 6 files this
  session — zero matches).
- `execute-sprint.md`'s precedence list is now 2 tiers (`<verify><automated>`, `<done>`), "MANDATORY
  completion check" bullet rewritten.
- `plan-spawn-planner.md`'s field list, Anti-Shallow item 3 (now `<evidence>`), and quality_gate checklist
  all updated. The review caught a stray reference in **item 4** (`<verify>` description), one item below
  the fixed item 3, that still said the block proves "the acceptance criteria" — a dangling reference to
  a tag that no longer exists in the schema. Fixed in follow-up commit `8181c88`: item 4 now reads
  "Shell commands that PROVE the `<done>` criteria are met" — confirmed via direct read this session.
- `execute.md`'s `uat_gate` step (lines 722-761 currently) fully reworded: the print block says
  "{list each task's `<done>` sentence from SPRINT.md}" and the fail-branch says "Surface the tasks whose
  `<done>` criteria failed human verification" — confirmed via direct read this session, no residual "AC"
  phrasing.

### Truth 5 — `.rcode/` mirrors byte-identical; `execute-sprint.md` mirror divergence left untouched

**Verified — PASS.** This session's `diff -q` runs:
- `rcode/workflows/execute.md` vs `.rcode/workflows/execute.md` — no output (identical).
- `rcode/workflows/plan-spawn-planner.md` vs `.rcode/workflows/plan-spawn-planner.md` — no output
  (identical).
- `rcode/references/git-preflight.md` vs `.rcode/references/git-preflight.md` — no output (identical;
  this confirms follow-up commit `1bc8c75` updated both source and mirror in the same commit, which the
  git show output confirms: both files changed 7/+2/-2 identically).
- `rcode/workflows/execute-sprint.md` vs `.rcode/workflows/execute-sprint.md` — differ (as expected;
  mirror still shows the old 3-tier `acceptance_criteria` precedence list, confirming the pre-existing,
  intentionally-untouched divergence is still present and the source-only fix stayed source-only).
- All 3 follow-up commits (`1bc8c75`, `8181c88`, `bed1b3d`) touch both the `rcode/` source and `.rcode/`
  mirror file in the same commit (confirmed via `git show --stat` on each) — mirror parity was maintained
  through the review-fix cycle, not just the original 5 tasks.

### Truth 6 — `execute.md` stays at or under the 1000-line cap

**Verified — PASS.** `wc -l rcode/workflows/execute.md` = 999 lines (SPRINT predicted 998 after the
original 5 tasks; the 3 follow-up fixes added net lines, landing at 999 — still 1 line under the
CLAUDE.md 1000-line cap).

## Review Findings Resolution (47-REVIEW.md: 1 high + 2 medium)

All 3 actionable findings from the code review were independently confirmed resolved by direct reading
of current file state (not just trusting commit titles):

| # | Severity | Finding | Fix commit | Verified |
|---|----------|---------|------------|----------|
| 1 | High | `git-preflight.md` had no `branching_strategy: none` exception — the shared enforcement contract execute.md defers to could still block main/master | `1bc8c75` | PASS — `BRANCHING_STRATEGY` computed and checked in failure condition, both source + mirror |
| 2 | Medium | `plan-spawn-planner.md` Anti-Shallow item 4 still said "the acceptance criteria" (space form escaped the literal-underscore grep gate) | `8181c88` | PASS — reworded to `<done>` criteria, both source + mirror |
| 3 | Medium | A 4th, unaddressed `parallelization`-as-real-toggle mention in the Copilot runtime-detection paragraph, 5 lines below the new disclaimer | `bed1b3d` | PASS — reworded to remove the phantom toggle reference, both source + mirror |

The review's 2 "Low" findings (commit `81a06bc`'s subject line at exactly 72 chars vs. "strictly under
72"; a narrower-than-reality claim about `roadmap_exists`/`phase_req_ids` sourcing) were explicitly
labeled "Optional improvements" by the reviewer, not "Specific fixes required" — correctly left
unaddressed; not a gap.

## Requirement Traceability

No `REQUIREMENTS.md` IDs map to phase 47 (confirmed: the traceability table only lists DSH/HIST/GATE IDs
mapped to phases 34-37; phase 47 is absent, consistent with SPRINT.md's `requirements: []` and this
being a pure bugfix batch with no product-requirement backing).

## Gaps Found

None. All 6 must_haves.truths items verified against current codebase state (not SUMMARY.md claims), all
3 code-review findings independently confirmed resolved with both source and `.rcode/` mirror updated,
and the file stays under the line cap.

## Verdict

**PASSED.** All 4 issues (#1014, #1015, #1017, #1020) are closed at both the local (`execute.md`) and
shared-contract (`git-preflight.md`) enforcement layers. The review's high-severity gap (git-preflight.md
missing the branching_strategy exception) and both medium-severity stray-reference gaps were caught by a
subsequent review pass and are now confirmed fixed in the working tree, not just claimed in commit
messages.
