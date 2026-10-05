---
name: rcode-cleanup
description: "Archive completed milestone phase directories into .planning/milestones/ after a dry-run summary."
argument-hint: "[--dry-run]"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, Agent
---

<objective>
Execute cleanup workflow
</objective>

<execution_context>
@.rcode/workflows/cleanup.md
</execution_context>

<process>
Execute the cleanup workflow from @.rcode/workflows/cleanup.md end-to-end.
</process>
