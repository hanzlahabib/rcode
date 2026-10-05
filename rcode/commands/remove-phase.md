---
name: rcode-remove-phase
description: "Remove an unstarted future phase from ROADMAP.md and renumber later phases."
argument-hint: "<phase-number>"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<objective>
Execute remove-phase workflow
</objective>

<execution_context>
@.rcode/workflows/remove-phase.md
</execution_context>

<process>
Execute the remove-phase workflow from @.rcode/workflows/remove-phase.md end-to-end.
</process>
