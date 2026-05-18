---
name: rihal-plan-milestone
description: Plan all phases in a milestone in parallel dependency waves. Reads ROADMAP.md, groups phases into dependency waves, spawns rihal-planner agents in parallel per wave. Closes #732.
argument-hint: "[--milestone <name>] [--dry-run] [--skip-research] [--wave N]"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, Agent, TaskCreate, TaskUpdate
---

<objective>
Plan all phases for a milestone using parallel dependency-wave execution. Group independent phases into concurrent waves, run rihal-planner for each in parallel.
</objective>

<execution_context>
@rihal/workflows/plan-milestone.md
</execution_context>

<process>
Execute the plan-milestone workflow from @rihal/workflows/plan-milestone.md end-to-end.
</process>
