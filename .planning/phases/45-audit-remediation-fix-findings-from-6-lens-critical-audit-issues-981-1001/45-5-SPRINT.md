---
phase: 45-audit-remediation-fix-findings-from-6-lens-critical-audit-issues-981-1001
plan_number: 5
wave: 1
depends_on: []
autonomous: false
sequential: true
files_modified:
  - rcode/references/git-preflight.md
  - rcode/references/execution-protocol.md
  - rcode/workflows/execute.md
  - rcode/workflows/code-review.md
  - rcode/workflows/code-review-fix.md
  - rcode/workflows/plan.md
  - rcode/references/revision-loop.md
  - rcode/references/gate-prompts.md
  - rcode/workflows/execute-sprint.md
  - rcode/workflows/plan-spawn-planner.md
  - rcode/workflows/execute-waves.md
requirements: []
must_haves:
  truths:
    - git-preflight.md's BRANCH_OK regex accepts the branch-name form execute.md itself tells users to create (<phase>-<plan>-<slug>, e.g. 8-1-aria), or execute.md's suggested branch name is changed to match the existing regex — the two no longer contradict each other
    - execution-protocol.md's SPRINT.md frontmatter example uses unpadded phase/plan numbers ("8" not "08"), matching issue #652's no-leading-zeros rule already enforced elsewhere in plan.md
    - plan.md's required_reading no longer unconditionally includes revision-loop.md or gate-prompts.md, both of which describe a different revision process/gate template than what plan.md actually implements
    - plan.md and execute.md are both at or under 1000 lines (AGENTS.md's own file-size cap) after rare-mode sections are extracted into conditionally-@-included sibling files, mirroring the existing PHASE_GOAL_HAS_UI pattern
    - execute.md's available_agent_types block lists rcode-ui-auditor exactly once (not twice with different descriptions); code-review.md and code-review-fix.md's available_agent_types blocks use the real agent ids (rcode-code-reviewer, rcode-code-fixer), matching the real Task(subagent_type=...) calls already in the same files
    - plan.md's Requirements Coverage Gate skip condition also skips when phase_req_ids is an empty array, not just null/TBD
    - plan.md's Wave Parallelism File-Overlap Check (12.5) is skipped when there is exactly one plan in the wave (plan_count == 1), the one case where file-overlap is structurally impossible
  artifacts:
    - none new — this is a size-reduction and correctness refactor of existing files, not a feature addition
  key_links:
    - server/lib/scanner.js and the real 44-1-SPRINT.md frontmatter (no zero-padding, e.g. "44"/"1") are the ground truth execution-protocol.md's corrected example must match
    - all 6 stories in this sprint touch plan.md and/or execute.md — they are sequenced (not parallel-autonomous) within this single sprint to avoid clobbering each other's line-number-dependent edits; task order matters and must be followed as written
---

<objective>
Fix GitHub issues #989, #997, #998, #999, #1000, #1001 — six workflow-complexity findings from
AUDIT-workflow-complexity.md and AUDIT-token-cost.md that all concentrate on `plan.md` and/or
`execute.md`: two files that both breach AGENTS.md's own 1000-line cap (1111 and 1095 lines), two
unconditionally-@-included reference files that actively contradict what `execute.md` does
(`git-preflight.md`'s branch regex vs. `execute.md`'s own suggested branch name;
`execution-protocol.md`'s zero-padded ID example vs. issue #652's no-leading-zeros rule), a
duplicate/phantom-name drift in three `<available_agent_types>` doc blocks, a 526-line
double-read in `--auto` plan-to-execute chains, a handful of small hygiene bugs (duplicate revert
gates, a duplicate `model=` kwarg, triplicated bug-workaround text), and two concrete, low-risk
cost-model gaps (the Requirements Coverage Gate not skipping on an empty-array `phase_req_ids`,
and the Wave Parallelism check running even when `plan_count == 1` makes overlap structurally
impossible).

**All 6 stories touch `plan.md` and/or `execute.md`.** They are executed sequentially within this
single sprint (not as parallel-autonomous tasks) — task order below is deliberate: small, disjoint
reference-file fixes first, then the largest structural refactor, then the two cost-model tweaks
that build on top of the now-reduced files. Re-grep every literal snippet cited before editing —
line numbers will shift as earlier tasks in this list land.

This is a repo-maintenance/bugfix phase — no numbered requirement IDs apply (`requirements: []`).
</objective>

<execution_context>
@.rcode/workflows/execute-sprint.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/audits/AUDIT-workflow-complexity.md
@.planning/audits/AUDIT-token-cost.md
</context>

<tasks>

<task id="45.5.1" type="auto">
<title>Fix git-preflight.md branch-regex and execution-protocol.md zero-padding contradictions</title>
<read_first>
- rcode/references/git-preflight.md lines 20-23 (`BRANCH_OK` regex requires a `feat/`, `fix/`, ..., `issue-`, or `task-` prefix)
- rcode/workflows/execute.md line 40 (suggests `git switch -c <phase>-<plan>-<slug>`, e.g. `git switch -c 8-1-aria` — matches none of git-preflight.md's allowed patterns)
- rcode/references/execution-protocol.md lines 11-15 (`phase: "01"`, `plan: "02"` — zero-padded example)
- rcode/workflows/plan.md line 276 (`# Issue #652 — no leading zeros in planning artifacts. Phase 8 not 08, plan 2 not 02.`)
- rcode/workflows/plan-spawn-planner.md lines 53-62 (the actual current frontmatter fields the planner emits: phase, plan_number, gap_closure, wave, depends_on, files_modified, autonomous — no `id`, no `milestone`, no zero-padding)
</read_first>
<files>rcode/references/git-preflight.md, rcode/references/execution-protocol.md</files>
<action>
Re-grep both literal snippets before editing.

1. `rcode/references/git-preflight.md:22-23` — extend `BRANCH_OK`'s regex to also accept the `<phase>-<plan>-<slug>` form `execute.md` itself suggests (digits, hyphen, digit, hyphen, slug), so the two files agree:
   ```bash
   # Allowed: feat/foo-bar, fix/123-baz, issue-123-name, task-123-slug, 8-1-aria (phase-plan-slug)
   BRANCH_OK=$(echo "$BRANCH" | grep -qE '^((feat|fix|docs|chore|refactor|test|perf|style|build|ci)/[a-z0-9][a-z0-9-]*|(issue|task)-[0-9]+-[a-z0-9-]+|[0-9]+-[0-9]+-[a-z0-9-]+)$' && echo yes || echo no)
   ```
   Prefer widening the regex over changing `execute.md`'s suggested branch name — the phase-plan-slug form is the convention actually used across real branches in this repo's own history (verify with `git log --oneline --all | grep -oE '^[a-z0-9]+ ' | head -1` style spot-check, or simply confirm via `git branch --list` that `NN-N-slug`-shaped branch names already exist in this repo).

2. `rcode/references/execution-protocol.md:14-15` — change the zero-padded example to match issue #652 and the real planner output:
   ```
   phase: "8"                  # phase ID (no leading zeros — issue #652)
   plan: "1"                   # plan ID within phase (no leading zeros — issue #652)
   ```
   Also update the schema block's field list (originally lines ~11-20) to match what `plan-spawn-planner.md:53-62` says the planner actually emits today (`phase`, `plan_number`, `wave`, `depends_on`, `files_modified`, `autonomous`, `requirements`, `must_haves` — drop any field shown in the stale example that isn't part of the real current frontmatter, e.g. a standalone `id:`/`milestone:` field if the real schema doesn't use them at top level).
</action>
<acceptance_criteria>
- `grep -qE '\[0-9\]\+-\[0-9\]\+-\[a-z0-9-\]\+' rcode/references/git-preflight.md` (widened regex present) — or equivalent manual confirmation the phase-plan-slug form now matches
- `! grep -q 'phase: "01"' rcode/references/execution-protocol.md`
- `! grep -q 'plan: "02"' rcode/references/execution-protocol.md`
</acceptance_criteria>
<verify>
<automated>
! grep -q 'phase: "01"' rcode/references/execution-protocol.md && \
! grep -q 'plan: "02"' rcode/references/execution-protocol.md && \
echo PASS
</automated>
</verify>
<done>git-preflight.md's branch regex accepts the branch name execute.md itself suggests creating; execution-protocol.md's SPRINT.md schema example uses unpadded IDs, matching issue #652 and plan-spawn-planner.md's real frontmatter fields.</done>
<evidence>AUDIT-workflow-complexity.md finding 5: "execute.md's own pre-flight step suggests, verbatim: git switch -c <phase>-<plan>-<slug>... But git-preflight.md... defines BRANCH_OK via a regex that requires a feat/, fix/... prefix... 8-1-aria matches none of those patterns" and "execution-protocol.md... documents... phase: '01', plan: '02'... directly contradicts... plan.md:276... 'no leading zeros in planning artifacts. Phase 8 not 08, plan 2 not 02.'" Confirmed via direct read this session (git-preflight.md:22-23, execute.md:40, execution-protocol.md:14-15, plan.md:276).</evidence>
</task>

<task id="45.5.2" type="auto">
<title>Dedupe execute.md's available_agent_types entry; fix phantom agent names in code-review.md/code-review-fix.md</title>
<read_first>
- rcode/workflows/execute.md lines 193-209 (`<available_agent_types>` block: `rcode-ui-auditor` listed twice at lines 207-208 with two different descriptions)
- rcode/workflows/code-review.md lines 9-11 (`<available_agent_types>` block says `- rcode-reviewer: ...` — no such agent file exists; real file is `rcode-code-reviewer`)
- rcode/workflows/code-review-fix.md lines 8-11 (block says `- rcode-fixer: ...` and `- rcode-reviewer: ...` — real files are `rcode-code-fixer` and `rcode-code-reviewer`)
- rcode/workflows/code-review.md line 391 and code-review-fix.md lines 216,298,332 (the REAL `Task(subagent_type=...)` calls already use the correct ids — this task only fixes the doc blocks, not the working spawn calls)
</read_first>
<files>rcode/workflows/execute.md, rcode/workflows/code-review.md, rcode/workflows/code-review-fix.md</files>
<action>
Re-grep each literal snippet before editing.

1. `rcode/workflows/execute.md:207-208` — remove the duplicate `rcode-ui-auditor` entry, keeping exactly one line. Check both descriptions ("Reviews UI implementation quality" vs "Audits UI against design requirements") against `rcode/agents/rcode-ui-auditor.md`'s actual role text to decide which description is more accurate, and keep that one.

2. `rcode/workflows/code-review.md:10` — change `- rcode-reviewer: Reviews source files for bugs and quality issues` to `- rcode-code-reviewer: Reviews source files for bugs and quality issues` (matching the real file `rcode/agents/rcode-code-reviewer.md` and the real spawn call at line 391).

3. `rcode/workflows/code-review-fix.md:12-13` — change `- rcode-fixer: ...` to `- rcode-code-fixer: ...` and `- rcode-reviewer: ...` to `- rcode-code-reviewer: ...`, matching the real files and the real spawn calls at lines 216, 298, 332.

4. Also fix the same stale short-name prose elsewhere in the same 2 files if present (`code-review.md:2,388`, `code-review-fix.md:2,205,296` per the audit — re-grep for the literal strings `rcode-reviewer` and `rcode-fixer` in both files and correct every remaining prose occurrence to `rcode-code-reviewer`/`rcode-code-fixer`). Do NOT touch `diagnose-issues.md` or `lens-audit.md` — those are out of scope for this task (separate files, not part of this sprint's files_modified).
</action>
<acceptance_criteria>
- `[ "$(grep -c 'rcode-ui-auditor' rcode/workflows/execute.md)" -eq 1 ]`
- `! grep -q 'rcode-reviewer' rcode/workflows/code-review.md`
- `! grep -qE 'rcode-fixer|rcode-reviewer' rcode/workflows/code-review-fix.md`
</acceptance_criteria>
<verify>
<automated>
[ "$(grep -c 'rcode-ui-auditor' rcode/workflows/execute.md)" -eq 1 ] && \
! grep -q 'rcode-reviewer' rcode/workflows/code-review.md && \
! grep -qE 'rcode-fixer|rcode-reviewer' rcode/workflows/code-review-fix.md && \
echo PASS
</automated>
</verify>
<done>execute.md lists rcode-ui-auditor exactly once; code-review.md and code-review-fix.md's doc blocks and prose use the real agent ids (rcode-code-reviewer, rcode-code-fixer) everywhere, matching the working Task(subagent_type=...) calls already in the same files.</done>
<evidence>AUDIT-scope-consistency.md finding 2: "Internal duplicate entry, rcode/workflows/execute.md:207-208... Same agent name listed twice" and "Phantom/stale agent names... rcode-fixer — referenced, does not exist (real file: rcode-code-fixer)... rcode-reviewer — referenced, does not exist (real file: rcode-code-reviewer)... the real Task(subagent_type=...) calls in these same files are correct." Confirmed via direct read this session (execute.md:207-208, code-review.md:10,391, code-review-fix.md:12-13).</evidence>
</task>

<task id="45.5.3" type="auto">
<title>Remove orphaned unconditional includes and extract rare-mode sections to bring plan.md/execute.md under 1000 lines</title>
<read_first>
- rcode/workflows/plan.md lines 43-56 (required_reading, including `@.rcode/references/revision-loop.md` and `@.rcode/references/gate-prompts.md`)
- rcode/references/revision-loop.md (all 38 lines — a generic council-review process that doesn't match plan.md's actual Step 12 revision loop)
- rcode/references/gate-prompts.md (212 lines — Safety/Decision/Irreversible-Action gate templates for destructive git ops plan.md never performs)
- rcode/workflows/plan.md lines 49 (`${PHASE_GOAL_HAS_UI ? '@.rcode/references/ui-brand.md' : ''}` — the existing proven conditional-include pattern to mirror)
- rcode/workflows/plan.md — rare-mode sections: `--gaps` mode (~lines 133-142, 229-315), `--from-stub` mode (~lines 67-75, 144-170), `<windows_troubleshooting>` block (~lines 1067-1089), Phase Split Recommendation (~lines 595-626), milestone-health nudge (~lines 909-925), thinking-partner tradeoff block (~lines 681-698)
- rcode/workflows/execute.md — rare-mode sections: interactive mode (~lines 333-380), `close_parent_artifacts` (~lines 738-786), `notify_on_completion` webhooks (~lines 944-965), `auto_copy_learnings` (~lines 899-920, "disabled by default"), `generate_tests` offer (~lines 967-992), Copilot runtime carve-outs (~lines 162-178, 270-277)
(Re-grep every line range above before editing — they will have shifted after tasks 45.5.1/45.5.2 and will keep shifting as this task itself edits both files; re-locate each section by its heading text or a unique literal string, not by the line number alone.)
</read_first>
<files>rcode/workflows/plan.md, rcode/workflows/execute.md</files>
<action>
1. Remove `@.rcode/references/revision-loop.md` and `@.rcode/references/gate-prompts.md` from `plan.md`'s required_reading block entirely (not gate them — per the audit, "no flag makes them relevant" to plan.md; they describe a different process than what plan.md's own Step 12 implements, and plan.md performs no destructive git operations). This alone removes ~250 lines of unconditionally-loaded, inapplicable context from every `/rcode-plan` run. Do not delete the reference files themselves (`revision-loop.md`/`gate-prompts.md`) — they may still be relevant to a different workflow (e.g. `/rcode-council`); only remove plan.md's `@`-include of them.

2. For each rare-mode section listed in `<read_first>` for `plan.md` and `execute.md`, extract its body into a new sibling reference file under `rcode/references/` (e.g. `rcode/references/plan-gaps-mode.md`, `rcode/references/plan-from-stub-mode.md`, `rcode/references/plan-windows-troubleshooting.md`, `rcode/references/execute-interactive-mode.md`, `rcode/references/execute-notify-webhooks.md`, etc. — choose names that clearly signal the gated condition), and replace the inline section with a conditional `@`-include mirroring the existing `${PHASE_GOAL_HAS_UI ? '@.rcode/references/ui-brand.md' : ''}` pattern at `plan.md:49`, gated on the same condition the section already documents (e.g. `${GAPS_MODE ? '@.rcode/references/plan-gaps-mode.md' : ''}`, `${WINDOWS ? '@.rcode/references/plan-windows-troubleshooting.md' : ''}`). Do this incrementally, re-checking `wc -l rcode/workflows/plan.md rcode/workflows/execute.md` after each extraction, stopping once both files are at or under 1000 lines — you do not need to extract every single listed section if fewer extractions already clear the cap; prioritize the largest sections first (`--gaps` mode ~110 lines, `<windows_troubleshooting>` ~23 lines, interactive mode ~48 lines, `close_parent_artifacts` ~49 lines) to reach the target with the fewest file splits.

3. Do not change any load-bearing logic — this task moves text into conditionally-included sibling files; it does not alter what any mode does when it IS active. Verify each extracted section's conditional trigger variable (`GAPS_MODE`, `WINDOWS`, etc.) already exists in the surrounding script logic before gating on it — if a condition variable doesn't already exist, derive it the same way the section's own prose currently describes activation (e.g. "only when --interactive flag is passed").
</action>
<acceptance_criteria>
- `[ "$(wc -l < rcode/workflows/plan.md)" -le 1000 ]`
- `[ "$(wc -l < rcode/workflows/execute.md)" -le 1000 ]`
- `! grep -q '@.rcode/references/revision-loop.md' rcode/workflows/plan.md`
- `! grep -q '@.rcode/references/gate-prompts.md' rcode/workflows/plan.md`
- Every newly-created reference file under `rcode/references/` from this task is referenced by at least one `${CONDITION ? '@...' : ''}` line in `plan.md` or `execute.md` (no orphaned new files)
</acceptance_criteria>
<verify>
<automated>
[ "$(wc -l < rcode/workflows/plan.md)" -le 1000 ] && \
[ "$(wc -l < rcode/workflows/execute.md)" -le 1000 ] && \
! grep -q '@.rcode/references/revision-loop.md' rcode/workflows/plan.md && \
! grep -q '@.rcode/references/gate-prompts.md' rcode/workflows/plan.md && \
echo PASS
</automated>
</verify>
<done>plan.md and execute.md are both at or under AGENTS.md's 1000-line cap; the two orphaned unconditional includes are removed from plan.md's required_reading; every extracted rare-mode section is still reachable via a conditional @-include, and no mode's active behavior changed.</done>
<evidence>AUDIT-workflow-complexity.md findings 1-2: "plan.md:50-51 unconditionally @-includes revision-loop.md and gate-prompts.md... 250 lines loaded into every single /rcode-plan invocation... for content that isn't applied" and "The codebase already has the pattern for this — plan.md:49: ${PHASE_GOAL_HAS_UI ? '@.rcode/references/ui-brand.md' : ''}... applied to exactly one reference file... despite both files containing multiple inline sections gated on a flag/condition... Subtotal: ~245 lines of plan.md's 1111 + ~192 lines of execute.md's 1095... Both would clear AGENTS.md's own limit without cutting a single line of logic." Confirmed via `wc -l` this session: plan.md 1111 lines, execute.md 1095 lines, both over the 1000-line cap (AGENTS.md's own rule).</evidence>
</task>

<task id="45.5.4" type="auto">
<title>Dedupe required_reading across the --auto plan-to-execute chain</title>
<read_first>
- rcode/workflows/plan.md required_reading block (post-task-45.5.3, re-locate by heading — includes `auto-init-guard.md`, `output-format.md`, `karpathy-guidelines.md`)
- rcode/workflows/execute.md required_reading block (post-task-45.5.3, re-locate by heading — independently lists the same 3 files again)
- rcode/workflows/plan.md line ~965-967 (`Skill(skill="rcode-execute", args="${PHASE} --auto --no-transition ${RCODE_WS}")` — chosen over `Task()` specifically to stay in the same context, not spawn a fresh one)
</read_first>
<files>rcode/workflows/plan.md, rcode/workflows/execute.md</files>
<action>
Re-grep the required_reading blocks in both files (line numbers will have shifted after task 45.5.3's extractions).

Add a guard comment + conditional skip to `execute.md`'s required_reading block for the 3 files `plan.md` already loads (`auto-init-guard.md`, `output-format.md`, `karpathy-guidelines.md`), so a `--auto`-chained invocation (where `execute.md` runs inline in `plan.md`'s already-accumulated context via `Skill()`, not `Task()`) doesn't re-read 526 lines it already has:

```
<!-- If invoked via plan.md's --auto chain (Skill(), same context — not a fresh Task()),
     auto-init-guard.md / output-format.md / karpathy-guidelines.md are already loaded
     from plan.md's own required_reading. Only re-read them here on a direct, non-chained
     /rcode-execute invocation. See AUDIT-workflow-complexity.md finding 3. -->
${AUTO_CHAINED_FROM_PLAN ? '' : '@.rcode/references/auto-init-guard.md'}
${AUTO_CHAINED_FROM_PLAN ? '' : '@.rcode/references/output-format.md'}
${AUTO_CHAINED_FROM_PLAN ? '' : '@.rcode/references/karpathy-guidelines.md'}
```
Set `AUTO_CHAINED_FROM_PLAN=true` at the point in `plan.md` where it invokes `Skill(skill="rcode-execute", ...)` for the `--auto` chain (so the variable is in-context when `execute.md`'s required_reading block evaluates), and confirm it defaults to unset/false for a direct `/rcode-execute` invocation (the common, non-chained case, where all 3 files must still load normally).
</action>
<acceptance_criteria>
- `grep -q 'AUTO_CHAINED_FROM_PLAN' rcode/workflows/execute.md`
- `grep -q 'AUTO_CHAINED_FROM_PLAN' rcode/workflows/plan.md`
</acceptance_criteria>
<verify>
<automated>
grep -q 'AUTO_CHAINED_FROM_PLAN' rcode/workflows/execute.md && \
grep -q 'AUTO_CHAINED_FROM_PLAN' rcode/workflows/plan.md && \
echo PASS
</automated>
</verify>
<done>A --auto-chained plan.md → execute.md run (same context, via Skill()) no longer re-reads auto-init-guard.md/output-format.md/karpathy-guidelines.md a second time; a direct /rcode-execute invocation still loads all 3 normally.</done>
<evidence>AUDIT-workflow-complexity.md finding 3: "plan.md required_reading... includes auto-init-guard.md (117 lines), output-format.md (398 lines), and karpathy-guidelines.md (11 lines). execute.md required_reading... independently lists the same three files again... Since Skill() here is explicitly chosen over Task() to keep everything in one context... an --auto-chained plan→execute run reads [these] twice... 526 lines read twice." Confirmed via direct read this session (plan.md:965-967 Skill() call, execute.md:1039 same "stay in this context" rationale for its own downstream transition).</evidence>
</task>

<task id="45.5.5" type="auto">
<title>Minor hygiene bundle: dupe revert gates, kwarg bug, triplicated text</title>
<read_first>
- rcode/workflows/execute-sprint.md lines 378-437 (`<hook_revert_detection_gate>` and `<post_step_revert_gate>` — two independently-implemented gates catching overlapping but not identical failure modes)
- rcode/workflows/plan-spawn-planner.md lines 351-357 (`Task(...)` pseudocode with `model="{model}"` and `model="{planner_model}"` passed twice)
- rcode/workflows/execute.md line ~1078, rcode/workflows/execute-waves.md line ~435, rcode/workflows/execute-sprint.md line ~167 (the `classifyHandoffIfNeeded is not defined` runtime-bug workaround, written out independently 3 times — execute-waves.md is @-included directly into execute.md, so those two copies land in the SAME assembled orchestrator context)
</read_first>
<files>rcode/workflows/execute-sprint.md, rcode/workflows/plan-spawn-planner.md, rcode/workflows/execute.md, rcode/workflows/execute-waves.md</files>
<action>
1. `rcode/workflows/execute-sprint.md:378-437` — do NOT merge the two revert-detection gates (the audit's own conclusion: "they are not obviously redundant — the hook-revert gate catches 'reverted to exactly the prior state,' the post-step gate catches 'modified but shrunk'"). Instead, add a one-line cross-reference comment at the top of each gate pointing to the other, so a future maintainer understands they're related-but-distinct on first read: e.g. above `<hook_revert_detection_gate>`, add `<!-- See also <post_step_revert_gate> below — catches a different revert shape (shrunk, not identical) -->`, and the mirrored comment above `<post_step_revert_gate>`.

2. `rcode/workflows/plan-spawn-planner.md:354-355` — remove the duplicate `model=` kwarg. Keep exactly one `model=` argument in the `Task(...)` call; use `model="{planner_model}"` (the more specific name) and delete the `model="{model}"` line.

3. `rcode/workflows/execute.md` and `rcode/workflows/execute-waves.md` — since `execute-waves.md` is `@`-included directly into `execute.md` (confirmed at `execute.md:438`), the `classifyHandoffIfNeeded` workaround text appears twice in the SAME assembled context. Remove the copy in `execute.md`'s own `<failure_handling>` section and replace it with a one-line pointer: `See the classifyHandoffIfNeeded workaround in execute-waves.md (already @-included above).` Do NOT touch the copy in `execute-sprint.md` — that file runs in a separate subagent context that doesn't inherit `execute.md`'s text, so its copy is independently necessary.
</action>
<acceptance_criteria>
- `grep -c 'model=' rcode/workflows/plan-spawn-planner.md` for the specific `Task(...)` block shows exactly 1 `model=` line (spot-check the block manually if grep -c counts other unrelated `model=` occurrences elsewhere in the file)
- `grep -q 'See also' rcode/workflows/execute-sprint.md` (cross-reference comments present)
- `[ "$(grep -c 'classifyHandoffIfNeeded' rcode/workflows/execute.md)" -le 1 ]` (execute.md's own inline copy replaced with a pointer, or removed — count should drop from its pre-task value)
</acceptance_criteria>
<verify>
<automated>
grep -q 'See also' rcode/workflows/execute-sprint.md && \
[ "$(grep -c 'classifyHandoffIfNeeded' rcode/workflows/execute.md)" -le 1 ] && \
echo PASS
</automated>
</verify>
<done>The two revert-detection gates in execute-sprint.md cross-reference each other; plan-spawn-planner.md's Task() call has exactly one model= kwarg; execute.md no longer duplicates the classifyHandoffIfNeeded workaround text that execute-waves.md already provides in the same assembled context.</done>
<evidence>AUDIT-workflow-complexity.md finding 6 (dual revert gates), finding 10 (duplicate model= kwarg at plan-spawn-planner.md:351-357), and finding 8 ("execute-waves.md is @-included directly into execute.md at execute.md:438 — so the first two copies... appear twice within the SAME assembled orchestrator context... the execute.md / execute-waves.md duplication has no such excuse"). Confirmed via direct grep this session (execute-sprint.md:378,392,394,437; plan-spawn-planner.md:354-355; classifyHandoffIfNeeded present in all 3 files at the cited locations).</evidence>
</task>

<task id="45.5.6" type="auto">
<title>Cost-model bundle: phase_req_ids empty-array skip fix + wave-overlap gate skip on plan_count==1</title>
<read_first>
- rcode/workflows/plan.md line ~852 (Requirements Coverage Gate: `**Skip if:** \`phase_req_ids\` is null or TBD (no requirements mapped to this phase).`)
- .planning/phases/44-github-sync-path-drift-dead-rcodephases-layout-in-cli-stale-docs-sprintmd-filename-convention-issue-980/44-1-SPRINT.md (frontmatter: `requirements: []` — a real example of the empty-array case this gate fails to skip on)
- rcode/workflows/plan.md lines ~803-846 (`## 12.5. Wave Parallelism File-Overlap Check` — runs unconditionally, even when there is exactly one plan in exactly one wave)
</read_first>
<files>rcode/workflows/plan.md</files>
<action>
Re-grep both literal snippets before editing (line numbers will have shifted after tasks 45.5.1/45.5.3/45.5.4).

1. Requirements Coverage Gate — change the skip condition from:
   ```
   **Skip if:** `phase_req_ids` is null or TBD (no requirements mapped to this phase).
   ```
   to:
   ```
   **Skip if:** `phase_req_ids` is null, `TBD`, or an empty array/list (no requirements mapped to this phase).
   ```
   And update the actual bash/logic condition immediately below this line (the one that currently only checks for `null`/`"TBD"`) to also treat an empty array as a skip case — e.g. add a length check (`[ ${#PHASE_REQ_IDS[@]} -eq 0 ]` or the equivalent for however `phase_req_ids` is represented in this workflow's pseudocode) alongside the existing null/TBD check.

2. Wave Parallelism File-Overlap Check (12.5) — add a precondition at the top of the section: before running `node ".rcode/bin/rcode-tools.cjs" plan check-wave-overlaps "${PHASE_NUMBER}"`, check whether the current wave has more than one plan (`plan_count` for this phase/wave > 1). If `plan_count == 1` (or the wave contains only one plan), skip the check entirely and display `Wave parallelism: skipped (single plan, overlap structurally impossible).` — do not remove the check for phases with 2+ plans in the same wave; it remains fully necessary there (per the audit's own finding 7: this is the one gate in the file that's NOT redundant with anything else).
</action>
<acceptance_criteria>
- `grep -q 'empty array' rcode/workflows/plan.md` (skip-condition wording updated) — or equivalent updated phrasing near the Requirements Coverage Gate section
- `grep -q 'plan_count' rcode/workflows/plan.md` near the Wave Parallelism section (precondition added) — spot-check manually that this specific `plan_count` reference is inside/near "## 12.5" and not an unrelated occurrence elsewhere in the file
</acceptance_criteria>
<verify>
<automated>
grep -q 'empty array' rcode/workflows/plan.md && echo PASS
</automated>
</verify>
<done>The Requirements Coverage Gate skips on phase_req_ids being null, TBD, OR an empty array (closing the gap that let this gate run pointlessly on every requirement-free maintenance phase, including this very phase 45); the Wave Parallelism check skips when plan_count == 1, the one case where a file-overlap conflict is structurally impossible, while remaining fully active for 2+-plan waves.</done>
<evidence>AUDIT-token-cost.md finding 10: "Phase 44's 44-CHECK.md:39-41 states phase_req_ids: [] (an empty array)... The skip condition as written only checks for null or the literal string 'TBD' — an empty array is neither, so this gate's grep-and-compare logic... executes for no purpose." And finding 9: "For Phase 44 there was exactly one SPRINT.md... in exactly one wave — no second plan exists to overlap with, so both checks are guaranteed to report 'no collisions'... before they even run... neither step checks [plan_count] before doing the... work." Confirmed via direct read this session (plan.md:852 skip condition, plan.md:803-846 the 12.5 section) — this phase 45's own 5 sprints, each with requirements: [], is itself a live instance of the exact case this fix targets.</evidence>
</task>

</tasks>

<verification>
- `wc -l rcode/workflows/plan.md rcode/workflows/execute.md` both report ≤ 1000
- `node --check` is not applicable (these are markdown workflow files, not executable JS) — instead confirm no broken `@`-include paths: `grep -oE '@\.rcode/[a-zA-Z0-9_/.-]+\.md' rcode/workflows/plan.md rcode/workflows/execute.md | sed 's/^[^:]*://' | sed 's/^@\.rcode/rcode/' | sort -u | xargs -I{} test -f {} || echo "BROKEN INCLUDE PATH FOUND"` reports nothing
- `[ "$(grep -c 'rcode-ui-auditor' rcode/workflows/execute.md)" -eq 1 ]`
- `! grep -qE 'rcode-fixer|rcode-reviewer' rcode/workflows/code-review-fix.md`
- `grep -q 'AUTO_CHAINED_FROM_PLAN' rcode/workflows/execute.md`
- `grep -q 'empty array' rcode/workflows/plan.md`
</verification>

<success_criteria>
- plan.md and execute.md both comply with AGENTS.md's 1000-line file-size cap
- git-preflight.md and execution-protocol.md no longer actively contradict execute.md's own instructions
- The available_agent_types doc blocks in execute.md/code-review.md/code-review-fix.md match real agent ids with no internal duplicates
- A --auto-chained plan→execute run doesn't re-read the same 526 lines twice
- The Requirements Coverage Gate and Wave Parallelism check both skip in the two concrete no-op cases identified by the audit, while remaining fully active everywhere else
</success_criteria>

<output>
Create `.planning/phases/45-audit-remediation-fix-findings-from-6-lens-critical-audit-issues-981-1001/45-5-SUMMARY.md`
</output>

## Files Touched

**Creates:**
- New `rcode/references/*.md` sibling files extracted from plan.md/execute.md's rare-mode sections in task 45.5.3 (exact filenames chosen at execution time based on which sections are extracted — see task 45.5.3's action for naming guidance; e.g. `plan-gaps-mode.md`, `plan-from-stub-mode.md`, `plan-windows-troubleshooting.md`, `execute-interactive-mode.md`)

**Modifies:**
- `rcode/references/git-preflight.md` — branch-name regex widened
- `rcode/references/execution-protocol.md` — zero-padded example corrected, frontmatter field list updated
- `rcode/workflows/execute.md` — available_agent_types dedup, rare-mode extraction, classifyHandoffIfNeeded dedup, --auto chain read-guard
- `rcode/workflows/code-review.md` — phantom agent name corrected
- `rcode/workflows/code-review-fix.md` — 2 phantom agent names corrected
- `rcode/workflows/plan.md` — orphaned includes removed, rare-mode extraction, --auto chain read-guard, Requirements Coverage Gate skip fix, Wave Parallelism plan_count==1 skip
- `rcode/workflows/execute-sprint.md` — cross-reference comments between the 2 revert gates
- `rcode/workflows/plan-spawn-planner.md` — duplicate model= kwarg removed
- `rcode/workflows/execute-waves.md` — no direct edit expected (source of truth for the classifyHandoffIfNeeded text execute.md now points to); listed in files_modified in case a cross-reference comment is added here too

**Tests:**
<!-- none — no existing test asserts on these workflow markdown files' line counts or internal doc consistency -->
