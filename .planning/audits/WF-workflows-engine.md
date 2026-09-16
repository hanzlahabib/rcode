# Workflow Engine Audit — `workflows-engine` Lens

**Auditor lens:** workflows-engine  
**Files audited:** `rcode/workflows/execute.md` (1110 lines), `rcode/workflows/plan.md` (1347 lines), `rcode/workflows/council.md` (692 lines), `rcode/workflows/do.md` (553 lines), `rcode/workflows/autonomous.md` (1010 lines), `rcode/workflows/discuss-phase.md` (983 lines), `rcode/workflows/execute-waves.md` (~350 lines)  
**Total workflow files:** 131  
**Date:** 2026-09-16

---

## Verdict

The rcode workflow engine is **solid but leaky**: the core plan→execute→verify pipeline is well-guarded and has real defensive logic (pre-flight checks, gate steps, anti-pattern detection), but the composition layer — how workflows hand off state to each other and how the LLM is supposed to evaluate conditional `@`-includes — has three systemic failure modes that silently degrade every execution. Custom workflow authoring has zero scaffolding and no documented contract, making the system opaque to anyone trying to extend it. The engine works reliably for users who stay on the golden path; it fails unpredictably for users who deviate, chain, or author.

---

## The User's Actual Experience

A typical user runs `/rcode-plan 3`, which invokes `rcode/workflows/plan.md`.

**Step 1 — Auto-init guard** fires: `rcode/references/auto-init-guard.md` is loaded unconditionally from the `<required_reading>` block at `plan.md:43-54`. This reference check is solid.

**Step 2 — Init call**: the workflow runs `node ".rcode/bin/rcode-tools.cjs" init sprint-plan "$PHASE"` (`plan.md:171`). This is well-designed: one CLI call returns all context fields the orchestrator needs rather than N separate shell invocations.

**Step 3 — Context gate** (`plan.md:314-366`): if no `CONTEXT.md` exists, the LLM asks the user whether to run `discuss-phase` first. But the `discuss-phase` option causes the workflow to **exit and tell the user to run a second command** (`plan.md:362-365`) — there is no automatic hand-off. The user must copy-paste the suggested command. This is documented but friction-heavy.

**Step 4 — Research** (`rcode/workflows/plan-research-validation.md:5`): research is a separate `@`-included file at `plan.md:375`. The step is numbered `5` in the included file but `plan.md` skips visibly from `## 4.5` to `## 6` with no `## 5` header (`plan.md:367-378`). The missing step number is disorienting when reading the source, though it doesn't break execution.

**Step 5 — Planner spawn** (`plan.md:496` → `rcode/workflows/plan-spawn-planner.md`): a Task subagent (`rcode-planner`) is spawned. This is the main work unit. The planner writes SPRINT.md files to the phase directory.

**Step 6 — Sprint-checker spawn** (`plan.md:571`): after the planner returns, `rcode-sprint-checker` reviews plan quality. There is a 3-iteration revision loop with explicit escalation to the user (`plan.md:573`).

**Step 7 — Auto-chain to execute** (`plan.md:1214-1216`): if `--auto` is passed, the workflow sets `AUTO_CHAINED_FROM_PLAN=true` in its running context, then calls `Skill(skill="rcode-execute")`. Execute.md's `<required_reading>` block uses `${AUTO_CHAINED_FROM_PLAN ? '' : '@.rcode/references/auto-init-guard.md'}` (`execute.md:278-283`) to skip already-loaded references.

**In execute.md**: the `three_options` step (`execute.md:128-209`) normally asks the user A/B/C/D. In `--auto` mode it skips to autonomous run. It then calls `@rcode/workflows/execute-waves.md` (`execute.md:504`) to spawn executor agents per wave.

**The user never sees** the intermediate steps — they see a banner, then agent spawning indicators, then either "PHASE COMPLETE" or a gate failure with a suggested fix command.

---

## Leaks

**1.** 🔴 **Conditional `@`-injection is fake** — never evaluated  
`execute.md:278-279,283,444,813,945,979` and `plan.md:49,53,861,1322` use JavaScript template-literal syntax inside Markdown:
```
${AUTO_CHAINED_FROM_PLAN ? '' : '@.rcode/references/auto-init-guard.md'}
${INTERACTIVE_MODE === 'true' ? '@.rcode/references/execute-interactive-mode.md' : ''}
```
These are **plain text strings** in the LLM's context. There is no template-rendering step. The LLM reads the condition literally and must infer whether to load the file. In practice: if the LLM is pattern-matching on "load this file if condition X", it will sometimes load the file unconditionally, sometimes skip it, and sometimes do neither and hallucinate the content. The `AUTO_CHAINED_FROM_PLAN` conditional (`execute.md:278`) is especially critical because it's supposed to skip 3 reference files when chained from plan. Its failure means duplicated reference loading on every chained run, inflating context by ~1500 tokens per `@`-skipped file. There is no mechanism in the rcode runtime to evaluate these — they are documentation of intent, not code.  
*User cost*: context inflation, occasional hallucinated reference content, unpredictable behavior when the LLM gets the conditional wrong.

**2.** 🔴 **`PARALLELIZATION` variable used but never initialized**  
`execute-waves.md:6,42,48,284` references `PARALLELIZATION=true/false` as the gate for parallel vs sequential execution within a wave. This variable is **never set anywhere in execute.md or execute-waves.md**. The note at `execute.md:370` even documents: "`parallelization` is not a real field in `init execute`'s output". What actually gates parallelism is `USE_WORKTREES` (set at `execute.md:344-348`), but `execute-waves.md` uses `PARALLELIZATION` in its prose. The LLM may use `USE_WORKTREES` correctly or invent a `PARALLELIZATION` value — this is undefined behavior.  
*User cost*: plans that should run in parallel run sequentially or vice versa; no error surfaced.

**3.** 🔴 **`@.rcode/agents-rules/orchestrator/contract.md` path is relative to installed copy, not source**  
`execute.md:7` and `plan.md:77` reference `@.rcode/agents-rules/orchestrator/contract.md`. This path resolves only against the *installed* `.rcode/` directory, not the `rcode/` source tree. The file exists at `.rcode/agents-rules/orchestrator/contract.md` but does NOT exist at `rcode/agents-rules/orchestrator/contract.md`. Any tool or agent reading the source workflow file directly (e.g., during development, IDE context, or a non-Claude-Code runtime) will get a broken `@`-include with no error — the LLM silently proceeds without the orchestrator contract.  
*User cost*: execute and plan workflows run without the orchestrator role contract on any non-installed execution; Raees persona is never adopted, no-inline-implementation rule never fires.

**4.** 🟡 **Step numbering gap in plan.md creates false orientation**  
`plan.md` goes: `## 4. Load CONTEXT.md` (line 314) → `## 4.5. Effort-Tier Pre-Plan Gate` (line 367) → `## 6. Check Existing Plans` (line 378). **Step 5 is entirely absent from plan.md's visible headings** — it lives inside the `@`-included `plan-research-validation.md`. A user reading plan.md source to understand the flow, or an LLM doing step counting to orient itself mid-run, sees a jump from 4.5 to 6 with no 5. This causes the LLM to mis-anchor its own progress, particularly when resuming a paused plan run.  
*User cost*: confused progress reporting ("completing step 5" when step 5 is invisible), harder debugging.

**5.** 🟡 **`discuss-phase` → `plan` handoff requires manual copy-paste**  
When `plan.md` step 4 (`plan.md:355-365`) determines that `CONTEXT.md` is missing and the user chooses "Run discuss-phase first", the workflow **exits** and prints the command to copy-paste. There is no Skill() dispatch, no state save, no resume token. If the user forgets to re-run `plan` after `discuss-phase`, the context is captured but never consumed. The comment at `plan.md:357` says "AskUserQuestion does not work correctly in nested subcontexts" — this is a valid constraint, but the exit-and-print approach is silent about the required follow-up.  
*User cost*: lost work when user runs `discuss-phase`, closes the window, and never returns to rerun `plan`.

**6.** 🟡 **Autonomous workflow's `PHASE_DIR` derivation is fragile**  
`autonomous.md:325-327` derives `PHASE_DIR` as `.planning/phases/${PHASE_SLUG}` where `PHASE_SLUG` is `<zero-padded-phase-number>-<phase-slug>`. The padding logic ("PADDED_PHASE") is described in prose but the actual bash to compute it is never shown — it's expected to be inherited from prior steps. If any prior step in the same run uses a different padding convention (e.g., `3` vs `03`), the `CONTEXT.md` existence check at `autonomous.md:325` silently evaluates against the wrong path, causing autonomous to re-discuss phases that already have context.  
*User cost*: redundant `discuss-phase` runs in autonomous mode, user must answer questions they already answered.

**7.** 🟢 **No `scaffold-workflow` command exists**  
`rcode/workflows/scaffold-skill.md` exists and scaffolds compliant SKILL.md files with a 5-component compliance test. There is **no equivalent for workflows**. A user wanting to add a custom workflow must: find an existing workflow to copy, understand the undocumented `<purpose>`, `<required_reading>`, `<step>`, `<process>` XML schema by example, manually wire up `rcode-tools.cjs` calls, and hope their `@`-includes resolve. The schema is never documented in one place.  
*User cost*: high barrier to custom workflow authoring; community extensions are rare; bugs in custom workflows are hard to diagnose.

---

## Strengthenings

**1. Evaluate or document `@`-injection conditionals (M, `execute.md`, `plan.md`)**  
The `${VAR === 'true' ? '@...' : ''}` pattern either needs a real evaluation mechanism or must be replaced with prose instructions that the LLM can reliably follow. The simplest fix: replace each conditional `@`-include with a clearly-formatted instruction block that the LLM can act on deterministically:
```markdown
<!-- LOAD IF AUTO_CHAINED_FROM_PLAN is not set: @.rcode/references/auto-init-guard.md -->
```
or introduce a preprocessing step in the installer that renders these templates before the LLM ever sees them. Until this is resolved, every chained plan→execute run is loading 3 extra reference files on every invocation.

**2. Initialize `PARALLELIZATION` explicitly (S, `execute-waves.md:1-10`)**  
Add at the top of `execute-waves.md`:
```bash
PARALLELIZATION=$([[ "$USE_WORKTREES" != "false" ]] && echo true || echo false)
```
This closes the undefined-variable gap and makes the prose match the actual runtime behavior. The user sees correct parallel/sequential reporting.

**3. Add `scaffold-workflow` command (M, new `rcode/workflows/scaffold-workflow.md`)**  
Mirror `scaffold-skill` for workflows: prompt for name, purpose, steps, and required readings; output a compliant workflow stub with the XML structure pre-filled. Include the undocumented schema (purpose, required_reading, step, process, success_criteria) as an inline template. A compliance test for workflow files (similar to `test/compliance.test.cjs`) would prevent regressions. Lowers the authoring barrier from "read 10 workflows by example" to "fill in a template".

**4. Persist the `discuss-phase` → `plan` handoff via state (M, `plan.md:355-365`, `rcode-tools.cjs`)**  
Instead of exit-and-print, write a `.planning/phases/<N>/.pending-plan.json` file with `{ needs_plan: true, phase: N }` before exiting, and add a check in `plan.md`'s init step that detects and surfaces it: "Context was captured. Run /rcode-plan {N} to continue." Even better, route through `do.md`'s `--auto` dispatch so the handoff is automatic. Users should never have to remember to re-run a command after a prerequisite step.

**5. Fix step numbering gap in `plan.md` (S, `plan.md:367-378`)**  
Add `## 5. Research (see plan-research-validation.md)` as a placeholder heading at line 375 with a one-line description before the `@`-include. This costs 3 lines and eliminates the disorienting 4.5→6 jump. The LLM's step-count anchoring becomes reliable.

---

## Kill Your Darlings

**The `${VAR === 'true' ? '@...' : ''}` pattern should be deleted entirely** from all workflows. It is present in 12 locations across `execute.md` and `plan.md` and provides a false sense of conditional loading that the LLM cannot reliably evaluate. Replace each with either: (a) an unconditional `@`-include (for references that are almost always needed), or (b) a clearly-labeled prose instruction block. The pattern adds ~200 lines of misleading pseudo-code across the two largest workflows while solving nothing — the LLM will load the files or not based on its own inference, not on these strings.

**`execute.md` lines 278-284's `required_reading` block should be simplified** from 7 conditionally-loaded references to 4 always-loaded ones. The `auto-init-guard.md`, `output-format.md`, and `karpathy-guidelines.md` guards exist only to avoid re-loading on chained runs — but since the conditional evaluation is broken anyway, they are being loaded on every invocation. Remove the dead conditionals, always load the 4 core references, and accept the small context cost.
