<purpose>
Create executable phase prompts (SPRINT.md files) for a roadmap phase with integrated research and verification. Default flow: Research (if needed) -> Plan -> Verify -> Done. Orchestrates rcode-phase-researcher, rcode-planner, and rcode-sprint-checker agents with a revision loop (max 3 iterations).
</purpose>

<process>
This workflow is split into step files so only the step you are on is loaded. Execute the steps in order. Before each step, Read its file with the Read tool (paths below are plain paths, never `@`-includes). Do not read ahead, and skip a step only when its Read-when condition is false. Every instruction, gate, checkpoint, tool call, subagent allowlist and error path lives in the step files; the orchestrator never replaces them. If a step file says "Next:", follow it.

| # | Step | File | Read when |
|---|------|------|-----------|
| 01 | Output format, orchestrator contract, scope authorization, project-status preflight, frontend/UI gate suggestion | `.rcode/workflows/plan/steps/01-contract-preflight.md` | Always, first |
| 02 | Initialize, parse/normalize arguments, validate --reviews, validate phase, --gaps mode | `.rcode/workflows/plan/steps/02-init-args.md` | Always (--reviews / --gaps sections apply only when those flags are set) |
| 03 | Load CONTEXT.md, effort-tier gate, check existing plans, INIT context paths | `.rcode/workflows/plan/steps/03-context-existing-plans.md` | Always |
| 04 | Nyquist artifacts check, file-ownership and conflict avoidance (planner spawn inputs) | `.rcode/workflows/plan/steps/04-nyquist-ownership.md` | Before spawning rcode-planner |
| 05 | Handle planner return, phase-split recommendation, initial plan commit, specialist review panel | `.rcode/workflows/plan/steps/05-planner-return-panel.md` | After rcode-planner returns (panel 9.5 only when its trigger holds) |
| 06 | Spawn rcode-sprint-checker, handle checker return, revision loop, wave file-overlap check | `.rcode/workflows/plan/steps/06-checker-revision.md` | After the initial plan is committed |
| 07 | Requirements coverage gate, STATE.md planning record, milestone-health nudge, final status | `.rcode/workflows/plan/steps/07-coverage-status.md` | After checker passes |
| 08 | Auto-advance check (only when --auto / chained execution applies) | `.rcode/workflows/plan/steps/08-auto-advance.md` | Only when auto-advance is requested or configured |
| 09 | Banner emission gate, offer-next, Windows troubleshooting, success criteria | `.rcode/workflows/plan/steps/09-closing.md` | Last |

Rules that hold for every step:
- Read step 01 first, in full, before taking any action: it carries the required reading, contract and pre-flight gates.
- Re-Read a step file if its content is no longer in context (for example after compaction or when looping back to an earlier step).
- Step files keep their original `<step>`/`<process>` tags and section numbering; references such as "go to handle_blocker" or "step 9.5" point into the step files above.
</process>
