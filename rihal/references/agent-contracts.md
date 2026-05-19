# Agent Contracts

Every Rihal agent and skill operates under a contract that defines what it consumes, what it produces, and what guarantees it offers. Workflows depend on these contracts being honoured — if an agent silently broadens or narrows its contract, the orchestrator's assumptions break.

## The contract has 5 parts

1. **Inputs** — what the orchestrator passes to the agent at spawn time. Examples: phase number, sprint id, story file path, council question, file glob.
2. **Outputs** — concrete artifacts produced. Always file paths or structured JSON, never free-form prose. Examples: `SUMMARY.md`, `RESEARCH.md`, a `state.json` mutation, a JSON object on stdout.
3. **Side effects** — what the agent writes outside its primary output. Examples: state.json upserts, .planning/ artifacts, decisions log entries.
4. **Halt conditions** — when the agent stops and returns control. Examples: menu reached, user input required, blocker detected, budget exhausted.
5. **Failure modes** — what the agent does on error. Always: partial output is preserved, error is reported with a fix command, exit code is non-zero.

## Contract enforcement

- Every agent's `.md` file declares its inputs/outputs in the frontmatter or opening section.
- Workflows that spawn agents pass exactly the declared inputs — no more, no less.
- Orchestrators verify the declared outputs after the agent returns. Missing output = run failed, regardless of what the agent says.
- Side-effect changes (state.json, .planning/) are validated against `_shared/state-sync-rule.md`.

## Why this matters

Without contracts, agents drift. An agent originally designed to "read code and produce SUMMARY.md" starts also writing decisions and modifying state.json. The next workflow that spawns it makes assumptions that no longer hold. Cascading silent breakage.

The contract is the API. Treat agents like network services that happen to run in-process.

## When you write a new agent

Open with a contract block:

```yaml
---
name: rihal-foo
inputs:
  - phase: NN
  - story_path: .planning/phases/NN/story-X.md
outputs:
  - .planning/phases/NN/story-X-SUMMARY.md
side_effects:
  - state.phases[N].stories[X].status: completed
halt_conditions:
  - acceptance criteria not measurable
  - user-input required for design decision
on_failure:
  - emit FAILURE.md with diagnostic + suggested fix command
---
```

If your agent doesn't fit a contract, the agent is too broad — split it.
