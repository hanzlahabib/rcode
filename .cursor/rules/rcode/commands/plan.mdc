---
name: rcode-plan
description: Convert council follow-ups or task descriptions into executable SPRINT.md files. Spawns rcode-planner to produce structured plans that /rcode-execute can run.
argument-hint: "<list | show <id> | <description>> [--phase <name>] [--output <dir>]"
allowed-tools: Read, Write, Glob, Grep, Bash, Agent
---

<objective>
Convert scope or task description into executable SPRINT.md files with story breakdown, dependencies, and acceptance criteria.
</objective>

<execution_context>
@.rcode/workflows/plan.md
</execution_context>

<process>
Execute the plan workflow from @.rcode/workflows/plan.md end-to-end.
Spawn rcode-planner to produce SPRINT.md. Run rcode-sprint-checker to verify quality before execution.
</process>
