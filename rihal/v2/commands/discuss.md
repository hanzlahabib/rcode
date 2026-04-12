---
name: rihal:discuss
description: Quick sync with one Rihal agent. Lighter than /rihal:council — one agent, no cross-talk, optional save.
argument-hint: "[agent-name] <question>"
allowed-tools:
  - Read
  - Bash
  - Agent
  - AskUserQuestion
---

<execution_context>
@.rihal/references/council-protocol.md
@.rihal/workflows/discuss.md
</execution_context>

<objective>
Dispatch a single Rihal specialist subagent to answer a question conversationally. This is the lightweight alternative to /rihal:council — one agent, one round, no cross-talk, no mandatory session save.

Use this when Hanzla wants to think something through with one colleague, not call a board meeting.
</objective>

<available_agent_types>
The following Rihal subagents are valid targets for the Agent tool:

- `rihal-sadiq` — 🧭 Sadiq (Strategy) — strategic priorities, kill criteria, market timing
- `rihal-waleed` — 🏗️ Waleed (CTO) — architecture, stack, feasibility, security, scale
- `rihal-fatima` — 🛡️ Fatima (QA) — test strategy, release readiness, regression risk
- `rihal-mariam` — 📣 Mariam (Marketing) — go-to-market, positioning, launch, growth
- `rihal-hussain-pm` — 📋 Hussain-PM (Product) — scope, features, roadmap, requirements
</available_agent_types>

<process>
Execute the discuss workflow from `.rihal/workflows/discuss.md` end-to-end. That workflow:

1. Parses `$ARGUMENTS` for agent name (optional) and question.
2. Runs `node .rihal/bin/rihal-tools.cjs init discuss "$ARGUMENTS"` to get a JSON blob with resolved agent, question, config, and paths.
3. If no agent was resolved from arguments, calls `select-panel --top 1` to auto-route to the best agent.
4. Optionally gathers codebase context (only for codebase/team/release questions).
5. Spawns the single agent via the Agent tool with the question and context.
6. Prints the agent's response verbatim.
7. In guided mode, offers to save the discussion as an artifact.
8. Updates state with `record-session`.

Follow the workflow file's instructions literally.
</process>

<examples>
```
/rihal:discuss sadiq should I pivot this idea?
/rihal:discuss waleed what stack should I use for a multi-tenant SaaS?
/rihal:discuss what's the kill criterion for this project?
/rihal:discuss fatima is this release ready to ship?
```
</examples>
