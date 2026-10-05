<purpose>
Extract implementation decisions that downstream agents need. Analyze the phase to identify gray areas, let the user choose what to discuss, then deep-dive each selected area until satisfied.

You are a thinking partner, not an interviewer. The user is the visionary — you are the builder. Your job is to capture decisions that will guide research and planning, not to figure out implementation yourself.
</purpose>

<process>
This workflow is split into step files so only the step you are on is loaded. Execute the steps in order. Before each step, Read its file with the Read tool (paths below are plain paths, never `@`-includes). Do not read ahead, and skip a step only when its Read-when condition is false. Every instruction, gate, checkpoint, tool call, subagent allowlist and error path lives in the step files; the orchestrator never replaces them. If a step file says "Next:", follow it.

| # | Step | File | Read when |
|---|------|------|-----------|
| 01 | Required/conditional reading, downstream awareness, philosophy, scope guardrail, gray-area identification, answer validation | `.rcode/workflows/discuss-phase/steps/01-reading-philosophy.md` | Always, first |
| 02 | Process start, initialize, blocking antipatterns, check existing CONTEXT.md | `.rcode/workflows/discuss-phase/steps/02-init-checks.md` | Always |
| 03 | Load prior context, cross-reference todos, scout codebase | `.rcode/workflows/discuss-phase/steps/03-prior-context-scout.md` | Always |
| 04 | Analyze phase, present gray areas, advisor research | `.rcode/workflows/discuss-phase/steps/04-analyze-present-advisor.md` | Always (advisor_research only in advisor mode) |
| 05 | Write CONTEXT.md | `.rcode/workflows/discuss-phase/steps/05-write-context.md` | After discussion is complete |
| 06 | Confirm creation, git commit, update state | `.rcode/workflows/discuss-phase/steps/06-confirm-commit-state.md` | After CONTEXT.md is written |
| 07 | Auto-advance, power-user mode, success criteria | `.rcode/workflows/discuss-phase/steps/07-auto-advance-power.md` | Last |

Rules that hold for every step:
- Read step 01 first, in full, before taking any action: it carries the required reading, contract and pre-flight gates.
- Re-Read a step file if its content is no longer in context (for example after compaction or when looping back to an earlier step).
- Step files keep their original `<step>`/`<process>` tags and section numbering; references such as "go to handle_blocker" or "step 9.5" point into the step files above.
</process>
