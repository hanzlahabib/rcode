# Agent Contracts

Conventions Rihal sub-agents follow when invoked from a workflow.

- **Input**: a single prompt string. The orchestrator passes structured data
  inline (path lists, JSON blobs) — sub-agents do not stream args.
- **Output**: one final message back to the orchestrator. No partial state
  is visible mid-run.
- **Side effects**: each agent's tool list is its full surface — any tool
  not granted in the agent definition is unavailable.
- **Failure**: agents that hit an obstacle return a structured "blocked"
  message rather than fabricating output.

## Iterative retrieval (research subagents)

When a workflow spawns a research subagent, it passes the broader objective —
not just the literal query — and evaluates the returned result for sufficiency
against that objective. If the result is insufficient (coverage gap, vague
recommendations, or a blocked signal), the workflow re-dispatches the same
subagent with the named gaps, hard-capped at 3 cycles. This loop is research-only
— it does not apply to executor subagents. See `iterative-retrieval.md` for the
full contract.
