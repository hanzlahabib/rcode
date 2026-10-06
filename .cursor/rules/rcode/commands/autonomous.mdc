---
name: rcode-autonomous
description: "Run plan, execute and verify cycles for all remaining phases, pausing at checkpoints and failures."
argument-hint: "[--from N] [--to M] [--only N] [--interactive]"
allowed-tools: Read, Bash, Agent, AskUserQuestion
---

<objective>
Execute remaining incomplete phases autonomously — plan, execute, verify in a loop, pausing only at checkpoints, failures, or decision gates.
</objective>

<execution_context>
@.rcode/workflows/autonomous.md
</execution_context>

<process>
Execute the autonomous workflow from @.rcode/workflows/autonomous.md end-to-end.
Loop through todo phases: spawn rcode-planner if no SPRINT.md, then rcode-executor, handle checkpoints.
</process>
