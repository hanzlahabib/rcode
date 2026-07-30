---
status: issues_found
phase: 45
critical: 0
high: 1
medium: 3
low: 2
generated: 2026-07-29T17:02:36Z
---

# Code Review — Phase 45: Audit Remediation (issues #981–#1001)

Reviewed all 5 sprint plans (45-1..45-5 SPRINT.md), all 5 SUMMARY.md files, and the actual
merged source diff (`git show --stat 60bcdeb..HEAD`) across the 5 `45-N-exec` branches now on
`main`. Ran `npm run test:ci` (593/593 pass, 0 fail) against the current tree. Special attention
was paid to `rcode/workflows/plan.md` and `rcode/workflows/execute.md` per the review brief —
both are confirmed at/under the 1000-line cap (1000 and 998 lines respectively), all `@`-includes
resolve to real files in both the source (`rcode/`) and installed (`.rcode/`) trees, and the
custom XML-like tag structure in both files is balanced (every `<tag>` has a matching `</tag>`,
verified by line-anchored grep).

No critical (breakage/security) findings. One high-severity finding: a claimed-fixed issue
(#987, CLAUDE.md scope-list sync) is **not actually fully fixed** — verifiable today with a
plain diff. The rest are medium/low completeness and consistency gaps that don't break anything
currently but partially undercut what the phase's SUMMARY.md files claim was closed.

## High

### 1. Issue #987 (CLAUDE.md scope-list sync) is incomplete — 2 scopes still missing today

- **File:** `CLAUDE.md:27` (vs. `AGENTS.md:27`)
- **What's wrong:** Sprint 45.3's task 45.3.1 added the 15 scopes it enumerated
  (`init`, `agent-rules`, `cursor`, `i18n`, `phase`, `scaffold`, `campaign`, `ship`,
  `getting-started`, `do-router`, `milestone-health`, `modules`, `project-types`,
  `roadmapper`, `token`) and a human approved that exact diff (checkpoint task, "approved"
  per 45-3-SUMMARY.md). But at the phase-45 baseline (`60bcdeb`), `AGENTS.md` already
  contained two more scopes CLAUDE.md still lacks: **`github-sync`** and **`rcode`**
  (added to `AGENTS.md`/`CONTRIBUTING.md` pre-phase-45 by commit `42c216d`, well before
  `60bcdeb`). Verified with a direct set-diff right now:
  ```
  python3 -c "... a_scopes - c_scopes ..."
  → In AGENTS.md but not CLAUDE.md: ['github-sync', 'rcode']
  ```
  The task's automated `<verify>` block only looped over the 15 scopes it named — it never
  ran the full diff its own acceptance criterion #2 specified
  (`diff <(grep -o ... AGENTS.md) <(grep -o ... CLAUDE.md)`). Had that diff actually been run
  and shown to the human before "approved" was typed, this gap would have been caught.
- **Why it matters:** #987's whole premise was "CLAUDE.md is a third, untested,
  hand-maintained copy of the scope list" — the fix left it a third, *still-untested*,
  *still-drifted* copy, just by a smaller margin (2 instead of 17). Nothing guards this going
  forward: `test/scope-list-parity.test.cjs` and `test/scope-history-parity.test.cjs` only
  check `AGENTS.md` ↔ `CONTRIBUTING.md`, a gap the sprint plan itself explicitly acknowledged
  and left as "out of scope for this chore-only sprint."
- **Recommended fix:** Add `github-sync` and `rcode` to `CLAUDE.md:27`'s scope list now (one
  more approved diff), and — since this is the second time the acceptance criterion's own
  "full diff" check wasn't actually exercised — either add the missing regression test now or
  file it as a tracked follow-up issue rather than leaving it as an unlinked TODO in a
  SUMMARY.md.

## Medium

### 2. `execution-protocol.md`'s own "Hierarchical ID format" section still contradicts the fix directly above it

- **File:** `rcode/references/execution-protocol.md:13-14` vs. `:42-47`
- **What's wrong:** Task 45.5.1 (issue #989) correctly rewrote the SPRINT.md frontmatter
  example (lines 13-14) to `phase: "8"` / `plan_number: 1` with an explicit
  "no leading zeros — issue #652" comment. But the **same file**, 28 lines later, under
  "Hierarchical ID format," still reads:
  ```
  - Phase: `{NN}` 2-digit, zero-padded (e.g., 01, 02, 72)
  ```
  This is the exact class of self-contradiction the sprint's own objective describes
  ("execution-protocol.md's zero-padded ID example vs. issue #652's no-leading-zeros rule")
  — just relocated a few lines down, inside the identical file, still unresolved. A reader
  who scrolls past the corrected frontmatter block hits the old convention again with no
  cross-reference or correction.
- **Why it matters:** The task's own scope note said to "update the schema block's field
  list... to match plan-spawn-planner.md," which it did — but the adjacent, clearly-related
  "Hierarchical ID format" prose block was never re-grepped or touched, so the file still
  actively teaches both conventions.
- **Recommended fix:** Update line 44 to match: `Phase: {N} (no leading zeros — issue #652,
  e.g. 8, 12, 72)`, and spot-check the rest of that block (`Plan within phase`, `Task within
  plan` lines) for the same stale zero-padded framing before considering #989 closed.

### 3. `rcode/workflows/execute-sprint.md`'s phase-45 fix was not propagated to the dogfooded `.rcode/` install, unlike its 10 sibling files

- **File:** `.rcode/workflows/execute-sprint.md` (vs. source `rcode/workflows/execute-sprint.md`)
- **What's wrong:** Task 45.5.5 added cross-reference comments between
  `<hook_revert_detection_gate>` and `<post_step_revert_gate>` in
  `rcode/workflows/execute-sprint.md` (confirmed present in the source tree). The follow-up
  propagation commit `15873b0` ("chore(install): propagate phase 45 fixes into .rcode/")
  mirrored 10 other files this same phase touched (`plan.md`, `execute.md`, `code-review.md`,
  `code-review-fix.md`, `plan-spawn-planner.md`, `sprint-planning.md`, `execution-protocol.md`,
  `git-preflight.md`, `planner-playbook.md`, `state-sync-rule.md`) but **not**
  `execute-sprint.md`. Diffing the two copies right now shows the installed copy is missing
  the new `<!-- See also ... -->` comments entirely (along with a large amount of unrelated,
  pre-existing drift — dependency-check preflight, post-install namespace fallback, git-repo
  preflight, overwrite guard — none of which is phase 45's doing, but confirms this file's
  installed copy has been silently stale for a while and phase 45 had a chance to at least
  land its own piece and didn't).
- **Why it matters:** This repository dogfoods its own tooling — `/rcode-execute` in *this*
  repo reads `.rcode/workflows/execute-sprint.md`, not the source-tree copy. The one concrete
  behavior-adjacent fix in task 45.5.5 (making the two revert gates cross-reference each
  other for future maintainers) is invisible to anyone actually running `/rcode-execute` in
  this repo today.
- **Recommended fix:** Re-run the propagation step for `execute-sprint.md` specifically, or
  note explicitly in a follow-up why it was excluded if that was intentional (e.g. because the
  installed copy has diverged too far to safely overwrite) — right now it reads as an
  oversight, not a decision.

### 4. New conditional-include gates in `plan.md`/`execute.md` use an inconsistent truthiness sentinel

- **Files:** `rcode/workflows/plan.md` (`GAPS_MODE`, `WINDOWS`, `THINKING_PARTNER_ENABLED`)
  and `rcode/workflows/execute.md` (`INTERACTIVE_MODE`, `IS_GAP_CLOSURE_PHASE`, `GL_ENABLED`,
  `WEBHOOK_CONFIGURED`)
- **What's wrong:** Task 45.5.3's own instructions said to mirror the existing, proven
  `${PHASE_GOAL_HAS_UI ? '@.rcode/references/ui-brand.md' : ''}` pattern (`plan.md:49`), where
  `PHASE_GOAL_HAS_UI` is empty-string-or-path (correctly empty/non-empty truthy). Instead, 6
  of the 7 newly-added conditional gates assign a **literal string `"true"` or `"false"`** in
  bash (e.g. `plan.md:134-137`: `GAPS_MODE=true` / `GAPS_MODE=false`;
  `execute.md:829-832`: `GL_ENABLED=$(... || echo "false")`) and then gate the `@`-include with
  the same `${VAR ? '@...' : ''}` ternary syntax. Under a literal JS-style truthiness rule, a
  non-empty string `"false"` is truthy — so if anything ever evaluates these templates
  mechanically rather than via an LLM reading surrounding prose, every one of these 6 gated
  includes would always fire regardless of the actual flag value. The one gate the sprint
  designed correctly, `AUTO_CHAINED_FROM_PLAN` (only ever assigned when true, left unset
  otherwise — `plan.md:871`), does not have this problem.
- **Why it matters:** No code in this repo (`cli/`, `server/`) actually evaluates these
  `${...}` templates as JS — they're prompt pseudocode read by the LLM executing the
  workflow, and adjacent prose ("Skip unless `GAPS_MODE=true`") makes the intended behavior
  clear to a reader. So today's practical risk is low. But it's a real inconsistency the task
  introduced while explicitly claiming to "mirror" a pattern that doesn't have this flaw, and
  it will confuse the next person who copies one of these 6 as the reference example instead
  of `PHASE_GOAL_HAS_UI`/`AUTO_CHAINED_FROM_PLAN`.
- **Recommended fix:** Normalize to one of the two working patterns — either make these 6
  variables empty/non-empty (like `PHASE_GOAL_HAS_UI`) or assign-only-when-true / leave unset
  otherwise (like `AUTO_CHAINED_FROM_PLAN`) — rather than literal `"true"`/`"false"` strings
  feeding a ternary.

## Low

### 5. Wrong issue number in a code comment

- **File:** `cli/uninstall.js:267`
- **What's wrong:** `// Stale pre-rebrand rihal-*.md twins never get removed otherwise (#992)`
  — the `.claude/agents/` scan-gap fix this comment documents is issue **#991** ("rihal-*
  stale agent files on pre-rebrand installs can never be cleaned"). #992 is the unrelated
  majlis-council real-dispatch documentation fix (task 45.3.4), confirmed via
  `gh issue view 991` / `gh issue view 992`.
- **Recommended fix:** Change `(#992)` to `(#991)` at `cli/uninstall.js:267`.

### 6. Residual `.rcode/phases/` references outside phase 45's scope (informational, not a phase-45 regression)

- **Files:** `docs/adr/0001-github-sync-as-cli.md:12,17`, `docs/adr/0002-pivot-to-skill-driven-state.md:16`,
  `rcode/skills/actions/4-implementation/rcode-dev-story/SKILL.md:8,17,69`,
  `rcode/skills/agents/haitham-frontend/SKILL.md:115`,
  `rcode/skills/agents/hanzla-engineer/SKILL.md:135`,
  `rcode/skills/actions/2-plan/rcode-create-story/SKILL.md:54`,
  `rcode/skills/actions/2-plan/rcode-validate-prd/SKILL.md:42`,
  `rcode/skills/actions/2-plan/rcode-create-epics-and-stories/SKILL.md:54`,
  `rcode/skills/actions/3-solutioning/rcode-check-implementation-readiness/SKILL.md:50`
- **What's wrong:** Sprint 45.2 correctly closed the 9 files named in its own scope
  (`AUDIT-schema-drift.md` findings #6-#8, issues #985/#986/#988). These 9 additional files
  still contain the same dead `.rcode/phases/{...}` convention and were never part of any of
  the 21 findings this phase targeted, so they're not a phase-45 regression — but they're the
  same bug class the "schema-drift" audit lens was built to catch, and a future audit pass (or
  this same lens re-run) will likely re-flag them.
- **Recommended fix:** No action required for phase 45 to be considered done; worth a ticket
  for a future schema-drift sweep so this doesn't look like a second incomplete cleanup pass
  later.

## What was verified clean (no findings)

- `plan.md` (1000 lines) / `execute.md` (998 lines): both at/under AGENTS.md's 1000-line cap;
  all `@`-includes (conditional and unconditional) resolve to real files in both `rcode/` and
  `.rcode/`; all custom XML-like tags balanced; `AUTO_CHAINED_FROM_PLAN` wiring correctly
  present in both files; git-preflight.md's widened `BRANCH_OK` regex verified to match both
  `8-1-aria` (execute.md's own suggested form) and pre-existing branch names.
- `execute.md`'s `available_agent_types` — `rcode-ui-auditor` now appears exactly once, with
  the more accurate ("Audits UI against design requirements") description kept.
- `code-review.md` / `code-review-fix.md` — zero remaining `rcode-reviewer`/`rcode-fixer`
  phantom names anywhere in either file (doc blocks and prose), matching the real
  `Task(subagent_type=...)` calls already there.
- `plan-spawn-planner.md` — duplicate `model=` kwarg removed; exactly one `model="{planner_model}"` remains.
- `execute-sprint.md`'s two revert-detection gates now cross-reference each other (source
  tree); `execute.md`'s duplicate `classifyHandoffIfNeeded` copy replaced with a pointer to
  `execute-waves.md`'s copy, `execute-sprint.md`'s independent copy correctly left untouched.
- Requirements Coverage Gate (`plan.md:756`) now skips on empty-array `phase_req_ids`; Wave
  Parallelism check (`plan.md:712-722`) now skips when `plan_count == 1`.
- Sprint 45.1: all 11 templates in `task-templates.md` use `id=` + `<title>` (0 remaining
  `<name>` tags); `sprint.md`'s Stories section and `planner-playbook.md`'s Plan Structure
  example both now show the real `<task id title>` schema; `sprint-planning.md`'s
  `<purpose>` block no longer claims false skill authority.
- Sprint 45.2: all 9 targeted files (`verification-report.md`, `cli/lib/config.cjs`, both
  `state-sync-rule.md` copies — confirmed byte-identical — `hussain-sm`/`hussain-pm`
  `SKILL.md`, 3 github issue templates) correctly point at `.planning/phases/` /
  `.planning/`; `node --check cli/lib/config.cjs` passes.
- Sprint 45.3: `docs/skills-catalog.md` matches the live tree exactly (96 skills / 5 buckets,
  re-verified just now); `findLegacyRihalArtifacts()` and `cli/uninstall.js` both scan
  `.claude/agents/` for `rihal-*` twins (`node --check` passes on both); majlis-council
  `references.md` no longer claims "Real mode (default)" and correctly points to
  `/rcode-council`.
- Sprint 45.4: `docs/commands.md`'s 3 corrected command sections verified against the real
  current behavior; `create-epics-and-stories.md` has exactly 1 "Next Up" section; all 17
  bridge-status comments present in source tree (and correctly absent from the one bridged
  pair, `rcode-sprint-planning/SKILL.md`); `rcode-debug/SKILL.md` at 199 lines (under the
  200-line skill-body cap).
- Full suite: `npm run test:ci` — **593/593 pass, 0 fail** on current `main`.
