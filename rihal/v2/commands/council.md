---
name: rihal:council
description: Convene the Rihal majlis — spawns 3-5 specialist subagents in parallel to answer a strategic question. Agents are picked by keyword scoring.
argument-hint: "<question> [--full] [--agents=a,b,c] [--explain]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Task
  - AskUserQuestion
---

<execution_context>
@.rihal/references/council-protocol.md
@.rihal/references/commit-conventions.md
@.rihal/workflows/council.md
</execution_context>

<objective>
Dispatch a panel of 3-5 Rihal specialist subagents to answer a strategic question, in parallel, with a pre-consultation codebase scan and a panel-selection step that picks only the agents whose expertise matches the question.

Replaces the v1 council that fired all 13 personas sequentially in one context. v2 spawns real subagents via the Task tool — each agent is independent, runs in parallel, and produces a genuinely distinct perspective.
</objective>

<available_agent_types>
The following Rihal subagents are valid targets for the Task tool. Use these exact `subagent_type` values — do not fall back to `general-purpose`:

- `rihal-sadiq` — Director of Strategy (strategic priorities, kill criteria, market timing)
- `rihal-waleed` — CTO (architecture, stack, feasibility, security, scale)
- `rihal-fatima` — QA Lead (test strategy, release readiness, regression risk)
- `rihal-hussain-pm` — Product Manager (scope, roadmap, feature definition, user stories)
- `rihal-mariam` — Marketing & Growth Lead (market research, GTM strategy, positioning, launch)
</available_agent_types>

<process>
Execute the council workflow from `.rihal/workflows/council.md` end-to-end. That workflow:

1. Parses `$ARGUMENTS` for the question and flags.
2. Runs `node .rihal/bin/rihal-tools.cjs init council "$ARGUMENTS"` to get a JSON blob with all paths, flags, config, and the pre-selected panel.
3. Performs Step 0: cheap pre-consultation codebase scan (config, state, git log, README, package.json) — produces a 5-8 line "Observed context" summary.
4. Performs Step 1: presents the panel selection to the user in guided mode, or proceeds silently in yolo mode.
5. Performs Step 2: spawns each panelist in parallel via the Task tool, passing question + codebase summary + previous-agent context as the prompt.
6. Performs Step 3: presents each subagent's response verbatim (no summarization), in panel order.
7. Performs Step 4: optionally adds an Orchestrator Note flagging disagreements worth a follow-up.
8. Performs Step 5: saves the session to `.planning/council-sessions/council-{date}-{slug}.md`.

Follow the workflow file's instructions literally. Do not improvise on panel selection — use the output of `rihal-tools.cjs select-panel` verbatim.
</process>

<flags>
- `--full` — Skip scoring, use all installed agents (v2: all 3 subagents). For the user who explicitly wants everyone.
- `--agents=a,b,c` — Manual panel override. Validates against the available agent list, errors on unknown ids.
- `--explain` — Print the panel scoring table before spawning, so the user can see why each agent was picked or skipped.
</flags>

<examples>
```
/rihal:council should I start a new project or continue this one?
/rihal:council --agents=sadiq,waleed,fatima is this plan ready to ship?
/rihal:council --explain what stack should I use for a multi-tenant SaaS?
/rihal:council --full should we rewrite the auth layer?
```
</examples>
