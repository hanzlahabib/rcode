---
name: rcode-execute
description: "Execute SPRINT.md files with parallel rcode-executor subagents per wave; pauses at checkpoints."
argument-hint: "<plan-file.md | phase-dir> [--wave N] [--interactive] [--continue] [--option=A]"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

<objective>
Execute one or more SPRINT.md files with atomic commits per story, checkpoint handling, and state updates.
</objective>

<execution_context>
@.rcode/workflows/execute.md
</execution_context>

<process>
Execute the execute workflow from @.rcode/workflows/execute.md end-to-end.
Spawn rcode-executor subagents per dependency wave. Pause at checkpoints. Update story status via rcode-tools.cjs.
</process>
