---
name: rihal-research-phase
description: "Research how to implement a phase before planning. Spawns rihal-phase-researcher with phase context. Standalone tool — /rihal-plan already runs this automatically. Use only when you want research without immediately creating a plan."
argument-hint: "<phase-number>"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<objective>
Execute research-phase workflow
</objective>

<execution_context>
@.rihal/workflows/research-phase.md
</execution_context>

<process>
Execute the research-phase workflow from @.rihal/workflows/research-phase.md end-to-end.
</process>
