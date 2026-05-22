# Sprint 28-4 Summary — Bounded Iterative-Retrieval Loop

**Phase:** 28 — Audit Gap Closure
**Sprint:** 28-4
**Requirement:** REQ-748
**Branch:** audit-gap-closure
**Status:** Complete — all 4 tasks done, all `<verify>` blocks exit 0.

## Objective

Add a bounded iterative-retrieval loop to the research-spawning workflows.
Research subagents had no follow-up gate (executors have a verifier gate).
The loop: pass the broader objective into the initial dispatch, evaluate the
returned result for sufficiency against that objective, re-dispatch the same
subagent with named gaps, hard-capped at 3 cycles. Executor checkpoint flow
untouched.

## Tasks completed

| Task | Description | Verify |
|------|-------------|--------|
| 4.1 | Author `iterative-retrieval.md` loop-contract reference; summarize in `agent-contracts.md` | exit 0 |
| 4.2 | Wire the loop into `research-phase.md` (broader objective in Step 4, sufficiency loop in Step 5) | exit 0 |
| 4.3 | Wire the loop into `new-project-research.md` (4 per-dimension objectives + per-dimension loop before synthesis) | exit 0 |
| 4.4 | Add `test/iterative-retrieval-doc.test.cjs` doc-parity test | exit 0 |

## Files changed

- `rcode/references/iterative-retrieval.md` (new) — loop-contract reference
- `rcode/references/agent-contracts.md` — "Iterative retrieval" section added
- `rcode/workflows/research-phase.md` — broader `<objective>`/`<objective_context>`, Step 5 sufficiency loop
- `rcode/workflows/new-project-research.md` — `<objective>` block on all 4 researcher prompts, per-dimension loop before synthesis
- `test/iterative-retrieval-doc.test.cjs` (new) — doc-parity test, 7 assertions

Note: the SPRINT `files_modified` listed `.rcode/references/*` paths. `.rcode/`
is the gitignored install layout; the tracked SOURCE is `rcode/`. Per project
CLAUDE.md ("edit the SOURCE under `rcode/`"), the committed changes live in
`rcode/references/` and `rcode/workflows/`. The `.rcode/` install copies were
also updated locally to keep source/install in parity (not tracked).

## Verification results

- Task 4.1 verify: `test -f ... && grep 3 cycle && grep executor && grep iterative-retrieval.md` — exit 0
- Task 4.2 verify: `grep iterative-retrieval.md && grep cycle && grep objective_context|broader` — exit 0
- Task 4.3 verify: `grep iterative-retrieval.md && grep -c '<objective>' >= 4 (got 5) && grep cycle` — exit 0
- Task 4.4 verify: `node --check` exit 0; `node --test` 7/7 pass

## Full suite (`node --test`)

3 failing tests — all pre-existing baseline, no NEW failures:

- `scope-history-parity` — commit scopes `kanban`, `orchestrator` not in AGENTS.md (pre-existing, Phase 27 commits)
- `at-ref-parity` — broken refs `.rcode/workflows/execute-milestone.md`, `.rcode/workflows/plan-milestone.md` (#483 baseline; my new `@.rcode/references/iterative-retrieval.md` ref resolves correctly)
- `command-workflow @-includes` — pre-existing baseline

The new `iterative-retrieval.md` reference resolves under both layouts;
`at-ref-parity` confirms it is not among the broken refs.

## Commits

- `fef3354` — docs(references): add bounded iterative-retrieval loop contract
- `c857646` — feat(workflows): wire iterative-retrieval loop into research workflows
- `ecb77f1` — test(workflows): lock iterative-retrieval loop wiring

## Deviations / blockers

- **Deviation (file paths):** SPRINT `<files>` named `.rcode/references/*`; committed changes are in the tracked source `rcode/references/*` instead, because `.rcode/` is gitignored install output. No scope change — same logical files.
- No blockers. Executor/verifier workflows untouched. No push performed.
