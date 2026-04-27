---
name: rihal-remove-phase
description: "Remove an unstarted future phase from ROADMAP.md, delete its directory, and renumber all subsequent phases to maintain a clean sequence. Cannot remove a phase already in progress or completed."
argument-hint: "<phase-number>"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<objective>
Execute remove-phase workflow
</objective>

<execution_context>
@.rihal/workflows/remove-phase.md
</execution_context>

<process>
Execute the remove-phase workflow from @.rihal/workflows/remove-phase.md end-to-end.
</process>
