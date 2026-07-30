---
sprint: 45.1
status: executed
commit: 5f65002
branch: 45-1-exec
---

# Sprint 45.1 — SUMMARY

## Outcome

Fixed GitHub issues #981-#984 and #993 — the planner's own output-schema documentation
was self-contradicting across three files, and none of them matched what
`server/lib/scanner.js`'s `buildPhaseTree` actually parses or what 32/34 real
`*-SPRINT.md` files actually contain (`<task id="X.Y.Z" type="auto"><title>...</title>`).
All 11 templates in `task-templates.md`, `sprint.md`'s Stories section, and
`planner-playbook.md`'s Plan Structure example now show one consistent
`<task id title>` schema. `planner-playbook.md`'s `<execution_context>` template no
longer points at the 1000+ line orchestrator `execute.md` — it points at
`execute-sprint.md`, the file actually written for the executor subagent. And
`rcode-sprint-planning`'s workflow/SKILL no longer contradict each other or
`sprint-planning.md` about which path is authoritative or what it outputs. Three
commits (one per task, plus one self-caught regression fix), on branch `45-1-exec`.

## Stories

| ID | Title | Result |
|----|-------|--------|
| 45.1.1 | Unify the planner's task-output schema across task-templates.md, sprint.md, and planner-playbook.md | Done. All 11 templates in `task-templates.md` (Standard, TDD, 3 Checkpoint types, Database Migration, API Endpoint, UI Component, Configuration, Documentation, Refactoring) now use `<task id="{sprint-id}.{NN}" ...>` + nested `<title>`, replacing the unsupported `<name>` child tag. `sprint.md`'s Stories section replaced the unparseable markdown table with a real `<tasks><task id title read_first action verify done evidence>` XML example. `planner-playbook.md`'s Plan Structure example replaced the stale PLAN.md/SUMMARY.md-only shape with the actual current SPRINT.md schema (frontmatter + `<tasks><task id title>`). Commit `2894765`. |
| 45.1.2 | Fix planner-playbook.md's execution_context template to reference execute-sprint.md, not execute.md | Done, with a deviation: the fix was already applied inside task 45.1.1's edit, because the sprint's own literal replacement text for the Plan Structure example (task 45.1.1, action item 3) already substituted `@.rcode/workflows/execute-sprint.md` for the old `execute.md` reference. Verified no remaining `@.rcode/workflows/execute.md` references anywhere in `planner-playbook.md`. No separate commit — nothing new to stage. |
| 45.1.3 | Correct the rcode-sprint-planning workflow's self-contradicting "authoritative skill" claim | Done. `sprint-planning.md`'s `<purpose>` block rewritten to state the in-line steps ARE authoritative (54/54 real SPRINT.md files came from this flow) and that the `rcode-sprint-planning` skill is a separate tool producing `sprint-status.yaml`, not a SPRINT.md; the `<delegate_to_skill>` block (which falsely gated on loading that skill) was removed. `SKILL.md`'s Output Format section corrected to describe the real `sprint-status.yaml` output. `rcode-tools.cjs` got two comment-only notes documenting the `entry.plans`/`entry.sprints[]` schema divergence — applied to both `rcode/bin/rcode-tools.cjs` and its synced installed copy `.rcode/bin/rcode-tools.cjs` (repo convention per commit `6a1717c`). Commit `9c32f33`, plus a follow-up regression fix `5f65002` (see Deviations). |

## Verify Results

- Task 45.1.1 automated verify: `! grep -q '<name>' task-templates.md && grep -c 'id="' ≥ 11 && grep -q '<task' sprint.md` — PASS
- Task 45.1.1 acceptance criterion 4: `grep -q 'SUMMARY.md' planner-playbook.md` — PASS
- Task 45.1.2 automated verify: `grep -q execute-sprint.md && grep -c execute.md -eq 0` — PASS
- Task 45.1.3 automated verify: purpose-claim removed, `sprint-status.yaml` present in SKILL.md, `entry.sprints[] (an array)` comment present in rcode-tools.cjs — PASS (re-verified after the regression fix, still PASS)
- Sprint-level `<verification>` block (all 5 checks) — PASS
- `node --check rcode/bin/rcode-tools.cjs` — OK (comment-only edit, no syntax break)
- `npm run test:ci` — 511/543 pass, 32 fail. **All 32 failures confirmed pre-existing**, identical count and test names on the pre-sprint baseline commit (`60bcdeb`) — see "Blockers Encountered". Zero net regressions from this sprint's own changes.

## Deviations from Plan

**[Rule 1 - Bug] `test/workflow-behavioral.test.cjs` regression, self-caught and fixed.**
Found during: mandatory self-verification (`npm run test:ci`) after all 3 tasks were
committed. Issue: task 45.1.3's `<delegate_to_skill>` block removal (correctly eliminating
the false "authoritative skill" claim) also deleted the block's only two lines naming the
skill's flat installed path (`.rcode/skills/rcode-sprint-planning/SKILL.md` and
`/workflow.md`). `test/workflow-behavioral.test.cjs`'s "delegating workflows resolve flat
installed skill paths first" test asserts every delegating workflow file still contains one
of those two exact path strings — this test's intent is unrelated to the authority question
(it's checking path-resolution documentation survives), so removing the whole block silently
broke it. Confirmed as a real regression (not pre-existing) by checking out baseline commit
`60bcdeb` and running the test in isolation: 13/13 pass there, including this test. Fix:
restored both path strings inside the corrected (non-contradictory) `<purpose>` prose —
"The `rcode-sprint-planning` skill (`.rcode/skills/rcode-sprint-planning/SKILL.md`, workflow
at `.rcode/skills/rcode-sprint-planning/workflow.md`) is a SEPARATE tool: ...". Re-ran
`test/workflow-behavioral.test.cjs` standalone: 13/13 pass. Files modified:
`rcode/workflows/sprint-planning.md`. Verification: full `npm run test:ci` re-run afterward
shows 32/32 remaining failures match the pre-sprint baseline exactly (same count, same test
names). Commit `5f65002`.

**Task 45.1.2 produced no separate commit.** The sprint plan's own action text for task
45.1.1 (item 3, the `planner-playbook.md` Plan Structure replacement block) already
contained the corrected `@.rcode/workflows/execute-sprint.md` execution_context reference.
Applying task 45.1.1's literal replacement text therefore already satisfied task 45.1.2's
entire scope before task 45.1.2 started. Re-verified via `grep -c '@.rcode/workflows/execute.md' rcode/references/planner-playbook.md` returning `0` and `grep -q '@.rcode/workflows/execute-sprint.md'` succeeding — task 45.1.2's automated verify passes with zero new diff. No commit created (repo convention: never commit with nothing staged). Not a bug in either task — the plan's own task 45.1.1 action text superseded task 45.1.2's target line before task 45.1.2 ran.

**Total deviations:** 2 (1 self-caught bug fixed, 1 no-op task documented). **Impact:** the
bug was caught and fixed within this same sprint execution before handoff, with a
before/after test re-run proving the fix and proving no other regressions were introduced.

## Blockers Encountered

**32 pre-existing `npm run test:ci` failures, none caused by this sprint.** All 32 trace to
one root cause: `@clack/prompts` (declared in `package.json:67` as `^0.9.1`) is missing from
this worktree's `node_modules/` (`ls node_modules/@clack` → "No such file or directory"),
which `cli/update.js:34` requires at module load. Every test file that imports `cli/update.js`
or exercises install/purge/lock/manifest/slash-hook CLI paths that transitively load it fails
with `MODULE_NOT_FOUND`. Confirmed pre-existing and NOT a regression from this sprint's
changes: checked out the pre-sprint baseline commit `60bcdeb` in this same worktree, ran
`npm run test:ci`, and got the identical summary line — `tests 543 / pass 511 / fail 32` —
with the same failing test names (`test/artifact-schema.test.cjs`, `test/doctor-units.test.cjs`,
`test/install-matrix.test.cjs`, `test/slash-hook-router.test.cjs`, `test/update-units.test.cjs`,
plus the individual `#701`-`#705` install/purge/lock tests). Fixing this (running `pnpm install`
to restore `node_modules/@clack`) is out of this sprint's `files_modified` scope
(`task-templates.md`, `sprint.md`, `planner-playbook.md`, `sprint-planning.md`, `SKILL.md`,
`rcode-tools.cjs`) and touches shared dependency state, so left un-actioned and flagged here.

## Next Steps

- **Environment fix needed, not part of this sprint's scope:** run `pnpm install` in this
  worktree to restore `node_modules/@clack` and clear the 32 pre-existing install/update/manifest
  test failures (root cause confirmed above; this repo's CLAUDE.md requires pnpm for package
  installs).
- `/rcode-verify-phase` or `/rcode-verify-work 45` — this sprint's own `<verification>` block
  passed in full; a live planner run (writing a fresh SPRINT.md from the corrected templates)
  would be the one manual sanity check not automatable from this environment.
- Phase 45's next SPRINT.md (45.2, if planned) can proceed — this plan's `depends_on: []` and
  `wave: 1` mean nothing downstream was blocked by these fixes.

## Verification

- [x] No broken imports or references (`node --check rcode/bin/rcode-tools.cjs` passes)
- [x] All acceptance criteria met per SPRINT.md (all 3 tasks' automated `<verify>` blocks pass)
- [x] `npm run test:ci` — 511/543 pass, 32 fail; all 32 confirmed pre-existing via baseline
      comparison (identical count + names on `60bcdeb`), root-caused to a missing
      `@clack/prompts` dependency, not this sprint's changes. Zero net regressions.
