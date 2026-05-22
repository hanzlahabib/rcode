---
name: rcode-cleanup
description: "Archive completed milestone phase directories into .planning/milestones/. Run after /rcode-complete-milestone to keep .planning/ tidy. Shows a dry-run summary before moving anything."
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
