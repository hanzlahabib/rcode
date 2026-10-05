<purpose>
Execute all plans in a phase using wave-based parallel execution. Orchestrator stays lean — delegates plan execution to subagents.
</purpose>

<process>
This workflow is split into step files so only the step you are on is loaded. Execute the steps in order. Before each step, Read its file with the Read tool (paths below are plain paths, never `@`-includes). Do not read ahead, and skip a step only when its Read-when condition is false. Every instruction, gate, checkpoint, tool call, subagent allowlist and error path lives in the step files; the orchestrator never replaces them. If a step file says "Next:", follow it.

| # | Step | File | Read when |
|---|------|------|-----------|
| 01 | Raees contract, pre-flight, insight block, execution plan, three options | `.rcode/workflows/execute/steps/01-contract-preflight.md` | Always, first |
| 02 | Output format, core principle, runtime compatibility, required reading, parse_args, initialize | `.rcode/workflows/execute/steps/02-setup-init.md` | Always |
| 03 | Phase snapshot, blocking antipatterns, interactive mode, branching, validate phase, discover and group plans | `.rcode/workflows/execute/steps/03-snapshot-guards.md` | Always |
| 04 | Checkpoint handling, aggregate results, partial wave execution, run verify commands | `.rcode/workflows/execute/steps/04-wave-execution.md` | While executing waves |
| 05 | Code review gate, close parent artifacts | `.rcode/workflows/execute/steps/05-review-gate.md` | After all waves complete |
| 06 | UAT gate, update ROADMAP, auto-copy learnings, update PROJECT.md, completion notification | `.rcode/workflows/execute/steps/06-uat-roadmap.md` | After review gate passes |
| 07 | Generate tests offer, offer next, context efficiency, failure handling, resumption | `.rcode/workflows/execute/steps/07-tests-offer-next.md` | Last |

Rules that hold for every step:
- Read step 01 first, in full, before taking any action: it carries the required reading, contract and pre-flight gates.
- Re-Read a step file if its content is no longer in context (for example after compaction or when looping back to an earlier step).
- Step files keep their original `<step>`/`<process>` tags and section numbering; references such as "go to handle_blocker" or "step 9.5" point into the step files above.
</process>
