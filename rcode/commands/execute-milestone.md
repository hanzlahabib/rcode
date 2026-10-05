---
name: rcode-execute-milestone
description: "Execute every phase of the current milestone in dependency order with verify gates between phases."
argument-hint: "[--milestone <name>] [--dry-run] [--skip-verify] [--wave N] [--phase N]"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, Agent, TaskCreate, TaskUpdate
---

<objective>
Execute all phases in the current milestone in dependency order, with verify gates between waves.
</objective>

<execution_context>
@.rcode/workflows/execute-milestone.md
</execution_context>

<process>
Execute the execute-milestone workflow from @.rcode/workflows/execute-milestone.md end-to-end.
</process>
