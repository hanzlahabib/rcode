---
name: rihal-scaffold-milestone
description: Bulk-create all phase directories for a milestone from a pipe-separated name list or ROADMAP.md planned phases. Closes #731.
argument-hint: "--names \"Phase Name 1|Phase Name 2|...\" [--start N]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

<objective>
Execute scaffold-milestone workflow
</objective>

<execution_context>
@.rihal/workflows/scaffold-milestone.md
</execution_context>

<process>
Execute the scaffold-milestone workflow from @.rihal/workflows/scaffold-milestone.md end-to-end.
</process>
