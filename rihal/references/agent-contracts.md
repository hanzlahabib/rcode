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
