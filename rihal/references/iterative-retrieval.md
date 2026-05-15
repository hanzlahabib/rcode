# Iterative Retrieval — Bounded Research Loop

The contract a research-spawning workflow follows when dispatching a research
subagent and handling its return. Designed to be `@`-included by any workflow
that spawns a research subagent (`rihal-phase-researcher`,
`rihal-project-researcher`, `rihal-research-synthesizer`,
`rihal-codebase-mapper`).

Goal: research subagents get a follow-up gate, the same way executors get a
verifier gate. A single research dispatch may return a shallow or partial
result; this loop re-queries it — bounded — until the result is sufficient
against the original objective.

---

## 1. Initial dispatch — pass the broader objective

The orchestrator MUST pass the broader **objective** into the subagent prompt,
not just the literal query. The subagent needs to know *why* the research
matters and *what its output must enable downstream* — otherwise it optimizes
for the narrow question and misses what the consumer actually needs.

Include an `<objective>` block of this shape in the dispatch prompt:

```
<objective>
{literal research query — the specific thing to find out}

Why this matters: {the broader phase/project goal this research serves}
Downstream consumer: {what planning/requirements/roadmap step uses this
  result, and what a sufficient result must let that step do}
</objective>
```

The literal query stays; the objective frames it.

---

## 2. Sufficiency evaluation — on return

After the subagent returns its `## RESEARCH COMPLETE` summary, the orchestrator
evaluates the result against the Step-1 objective **before** routing onward.
The result is **insufficient** if any of these hold:

- **Coverage gap** — the result does not address every dimension the objective
  asked for (a missing dimension, an unanswered sub-question).
- **Vague recommendations** — recommendations lack specifics: no versions, no
  rationale, "consider X or Y" menus instead of "use X because Y".
- **Blocked signal** — the subagent returned `## RESEARCH INCONCLUSIVE`, a
  structured blocked message, or flagged a dimension it could not resolve.

If none hold, the result is sufficient — proceed with normal routing.

---

## 3. Re-dispatch — same subagent, named gaps

If insufficient, re-spawn the **SAME** `subagent_type` with a follow-up prompt
that:

- names the **specific gaps** found in Section 2 (which dimension, which
  vague recommendation, which blocked signal),
- includes the **prior result** so the subagent does not redo finished work,
- asks **only for the missing pieces** — not a full re-research.

The follow-up dispatch carries the same `<objective>` block from Step 1.

---

## 4. Hard cap — maximum 3 cycles

The loop is hard-capped at **3 cycles**: the initial dispatch plus at most 2
follow-up re-dispatches. After cycle 3, the orchestrator accepts the best
result obtained, records the residual gaps in the research artifact (a
`## Residual Gaps` note or equivalent), and proceeds. **Never loop unbounded** —
3 cycles is the ceiling regardless of remaining gaps.

---

## 5. Out of scope — executors

This loop applies to **research subagents only**. It does **not** apply to
executor subagents — the executor checkpoint/verifier flow is unchanged. Do
not re-dispatch an executor based on a sufficiency evaluation; executors have
their own checkpoint and verifier gates.
