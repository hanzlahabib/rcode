---
name: rihal:add-phase
description: "Add a new integer phase to the end of the current milestone. Auto-calculates the next phase number, creates the phase directory, and updates ROADMAP.md. Use when scope expands mid-milestone."
argument-hint: "<phase-name>"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<objective>
Execute add-phase workflow
</objective>

<execution_context>
@.rihal/workflows/add-phase.md
</execution_context>

<process>
Execute the add-phase workflow from @.rihal/workflows/add-phase.md end-to-end.
</process>
