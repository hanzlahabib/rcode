---
name: rcode-add-phase
description: "Add a new integer phase to the end of the current milestone and update ROADMAP.md."
argument-hint: "<phase-name>"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<objective>
Execute add-phase workflow
</objective>

<execution_context>
@.rcode/workflows/add-phase.md
</execution_context>

<process>
Execute the add-phase workflow from @.rcode/workflows/add-phase.md end-to-end.
</process>
