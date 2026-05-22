---
phase: 28
plan_number: 4
wave: 1
depends_on: []
files_modified:
  - .rcode/references/iterative-retrieval.md
  - .rcode/references/agent-contracts.md
  - rcode/workflows/research-phase.md
  - rcode/workflows/new-project-research.md
  - test/iterative-retrieval-doc.test.cjs
autonomous: true
requirements: [REQ-748]
must_haves:
  truths:
    - "After a research subagent returns, the orchestrator evaluates sufficiency against the original objective."
    - "If insufficient, the SAME subagent is re-dispatched with follow-up questions, capped at 3 cycles."
    - "The initial dispatch prompt carries the broader objective, not just the literal query."
    - "The executor checkpoint flow is unchanged."
  artifacts:
    - .rcode/references/iterative-retrieval.md (the loop contract, @-includable)
    - .rcode/references/agent-contracts.md (loop contract documented)
  key_links:
    - "research-phase.md Step 5 (Handle Return) must branch into the sufficiency loop."
    - "new-project-research.md must apply the loop after the 4 parallel researchers return."
    - "The loop must be a documented reference both workflows @-include — single source of truth."
---

<objective>
Add a bounded iterative-retrieval loop to the research-spawning workflows. Today `research-phase.md` and `new-project-research.md` spawn research subagents and accept whatever returns — no follow-up. Add: (1) the broader objective passed into the initial dispatch prompt, (2) a post-return sufficiency evaluation against that objective, (3) a re-dispatch of the SAME subagent with follow-up questions when insufficient, hard-capped at 3 cycles. Document the loop contract in `.rcode/references/agent-contracts.md` via a new dedicated reference. The executor checkpoint flow stays untouched.
Purpose: Close the research-subagent follow-up gap found auditing against `everything-claude-code` — executors have a verifier gate, research subagents have nothing.
Output: a loop-contract reference, edits to both research workflows, agent-contracts.md update, a doc-parity test.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.rcode/state.json
</context>

<notes>
This sprint changes WORKFLOW PROSE (instructions an orchestrator follows), not executable code — the research workflows are markdown spec files read by the orchestrator. There is no runtime function to test, so the `<verify>` automation checks file structure and a doc-parity test rather than behavior.
`research-phase.md` Step 5 "Handle Return" (lines ~85-92) is the insertion point for the per-phase loop. `new-project-research.md` spawns 4 parallel `rcode-project-researcher` agents (Stack/Features/Architecture/Pitfalls) — the loop applies per-dimension after they return.
The 4 research subagents in scope: `rcode-phase-researcher`, `rcode-project-researcher`, `rcode-research-synthesizer`, `rcode-codebase-mapper` — all confirmed present in `rcode/agents/`.
Scope discipline: do NOT touch executor/verifier workflows. The loop is research-only.
</notes>

<tasks>

### Task 4.1 — Author the iterative-retrieval loop contract reference
<read_first>
- .rcode/references/agent-contracts.md
- .rcode/references/researcher-shared.md
- rcode/workflows/research-phase.md
</read_first>
<files>
.rcode/references/iterative-retrieval.md
.rcode/references/agent-contracts.md
</files>
<action>
Create `.rcode/references/iterative-retrieval.md` — a concise reference defining the bounded iterative-retrieval loop, written so a research-spawning workflow can `@`-include it. It MUST specify:
- **Initial dispatch:** the orchestrator passes the broader OBJECTIVE (the phase/project goal and why the research matters) into the subagent prompt, not just the literal query — give a concrete `<objective>` block shape.
- **Sufficiency evaluation:** after the subagent returns, the orchestrator checks the result against the original objective. Define explicit sufficiency criteria: does the result cover every dimension the objective asked for; are recommendations specific (versions/rationale) not vague; were any `## RESEARCH INCONCLUSIVE` / blocked signals returned.
- **Re-dispatch:** if insufficient, re-spawn the SAME `subagent_type` with a follow-up prompt that names the specific gaps and the prior result, asking only for the missing pieces.
- **Hard cap:** maximum 3 cycles (initial + up to 2 follow-ups). After cycle 3, accept the best result and note residual gaps in the research artifact — never loop unbounded.
- **Out of scope:** state explicitly that this loop does NOT apply to executor subagents — the executor checkpoint/verifier flow is unchanged.

Then update `.rcode/references/agent-contracts.md`: add a short section "Iterative retrieval (research subagents)" that summarizes the loop in 2-3 sentences and points to `iterative-retrieval.md` for the full contract.
</action>
<acceptance_criteria>
- `.rcode/references/iterative-retrieval.md` exists and contains the strings `3 cycles` (or `3 cycle`), `objective`, and `executor` (the out-of-scope statement).
- `grep -qi "iterative" .rcode/references/agent-contracts.md` succeeds.
- `grep -q "iterative-retrieval.md" .rcode/references/agent-contracts.md` succeeds.
</acceptance_criteria>
<verify>
<automated>
test -f .rcode/references/iterative-retrieval.md && grep -qi "3 cycle" .rcode/references/iterative-retrieval.md && grep -qi "executor" .rcode/references/iterative-retrieval.md && grep -q "iterative-retrieval.md" .rcode/references/agent-contracts.md
</automated>
</verify>
<done>The loop contract is documented in a dedicated reference and summarized in agent-contracts.md.</done>

### Task 4.2 — Wire the loop into research-phase.md
<read_first>
- rcode/workflows/research-phase.md
- .rcode/references/iterative-retrieval.md
</read_first>
<files>
rcode/workflows/research-phase.md
</files>
<action>
Edit `rcode/workflows/research-phase.md`:
1. In Step 4 (Spawn Researcher) the `Task(prompt=...)` block currently opens with `<objective>Research implementation approach for Phase {phase}: {name}</objective>`. Expand that `<objective>` block to also state the broader goal — WHY this phase matters and what the research output must enable downstream (planning). Add an `<objective_context>` line pulling `{description}` and the phase goal so the subagent sees the full objective, not just "research approach".
2. In Step 5 (Handle Return), insert a new sub-step before the existing bullets: `@.rcode/references/iterative-retrieval.md`, then a prose block instructing the orchestrator to evaluate the returned `## RESEARCH COMPLETE` summary for sufficiency against the Step-4 objective and, if insufficient (or `## RESEARCH INCONCLUSIVE`), re-dispatch `rcode-phase-researcher` with a follow-up prompt naming the gaps — capped at 3 total cycles. After the cap, proceed with the best result and note residual gaps.
Keep all existing Step 5 routing bullets (`Plan/Dig deeper/Review/Done`) intact — the loop runs before they are offered.
</action>
<acceptance_criteria>
- `grep -q "iterative-retrieval.md" rcode/workflows/research-phase.md` succeeds.
- `grep -qi "3 cycle\|cap" rcode/workflows/research-phase.md` succeeds.
- The `<objective>` block in Step 4 references the broader phase goal: `grep -qi "objective_context\|why this phase\|broader" rcode/workflows/research-phase.md` succeeds.
</acceptance_criteria>
<verify>
<automated>
grep -q "iterative-retrieval.md" rcode/workflows/research-phase.md && grep -qi "cycle" rcode/workflows/research-phase.md && grep -qi "objective_context\|broader\|why this phase" rcode/workflows/research-phase.md
</automated>
</verify>
<done>research-phase.md passes the broader objective into the researcher prompt and runs the bounded sufficiency loop on return.</done>

### Task 4.3 — Wire the loop into new-project-research.md
<read_first>
- rcode/workflows/new-project-research.md
- .rcode/references/iterative-retrieval.md
</read_first>
<files>
rcode/workflows/new-project-research.md
</files>
<action>
Edit `rcode/workflows/new-project-research.md`:
1. Each of the 4 parallel `Task(prompt=...)` blocks (Stack/Features/Architecture/Pitfalls) currently passes a `<research_type>` and a literal `<question>`. Add an `<objective>` block to each prompt stating the broader goal — that the research feeds requirements definition and roadmap creation for {project_name}, and what a sufficient result enables. The literal `<question>` stays; the `<objective>` is added alongside.
2. After the 4 parallel researchers return (locate the point where their results are collected — after the 4 `Task(...)` calls and before the synthesis/requirements step), add a new section: `@.rcode/references/iterative-retrieval.md`, then prose instructing the orchestrator to evaluate each dimension's returned artifact for sufficiency against its objective and re-dispatch that dimension's `rcode-project-researcher` with follow-up questions if insufficient — capped at 3 cycles per dimension. After the cap, proceed with the best result.
Do not alter the existing parallel-spawn structure or the synthesis step — additions only.
</action>
<acceptance_criteria>
- `grep -q "iterative-retrieval.md" rcode/workflows/new-project-research.md` succeeds.
- `grep -c "<objective>" rcode/workflows/new-project-research.md` returns at least 4 (one per dimension prompt).
- `grep -qi "cycle\|cap" rcode/workflows/new-project-research.md` succeeds.
</acceptance_criteria>
<verify>
<automated>
grep -q "iterative-retrieval.md" rcode/workflows/new-project-research.md && test "$(grep -c '<objective>' rcode/workflows/new-project-research.md)" -ge 4 && grep -qi "cycle" rcode/workflows/new-project-research.md
</automated>
</verify>
<done>new-project-research.md passes the broader objective into all 4 researcher prompts and runs the bounded per-dimension loop on return.</done>

### Task 4.4 — Add a doc-parity test for the loop contract
<read_first>
- test/at-ref-parity.test.cjs
- test/workflow-behavioral.test.cjs
- .rcode/references/iterative-retrieval.md
</read_first>
<files>
test/iterative-retrieval-doc.test.cjs
</files>
<action>
Create `test/iterative-retrieval-doc.test.cjs` (`node --test`, following `test/at-ref-parity.test.cjs` / `test/workflow-behavioral.test.cjs` structure). Assert:
- `.rcode/references/iterative-retrieval.md` exists and mentions the 3-cycle cap and the executor out-of-scope statement.
- Both `rcode/workflows/research-phase.md` and `rcode/workflows/new-project-research.md` `@`-include `iterative-retrieval.md` (the `@.rcode/references/iterative-retrieval.md` reference resolves to an existing file).
- Each research workflow contains a sufficiency/cycle keyword (`cycle`).
This locks the wiring against future regression — if someone removes the loop, the test fails.
</action>
<acceptance_criteria>
- `node --check test/iterative-retrieval-doc.test.cjs` exits 0.
- `node --test test/iterative-retrieval-doc.test.cjs` passes.
</acceptance_criteria>
<verify>
<automated>
node --check test/iterative-retrieval-doc.test.cjs && node --test test/iterative-retrieval-doc.test.cjs
</automated>
</verify>
<done>A doc-parity test locks the loop reference and its inclusion in both research workflows.</done>

</tasks>

<verification>
- `.rcode/references/iterative-retrieval.md` defines initial-objective passing, sufficiency evaluation, same-subagent re-dispatch, and the 3-cycle cap.
- Both research workflows `@`-include the reference and run the loop on return.
- `node --test test/iterative-retrieval-doc.test.cjs` passes.
- No executor/verifier workflow file is modified — `git diff --name-only` shows only the 5 files in `files_modified`.
</verification>

<success_criteria>
- Research workflows re-query insufficient subagent summaries, capped at 3 cycles.
- The broader objective (not just the literal query) is in every initial research dispatch.
- The executor checkpoint flow is unchanged.
</success_criteria>

<output>
Create `.planning/phases/28-audit-gap-closure-ecc-parity-hooks-eval-harness-schema-validation-iterative-retrieval/28-4-SUMMARY.md`
</output>
