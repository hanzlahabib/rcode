---
name: rcode-do
description: "[ROUTER] Interactive picker — describe what you want and rcode picks the command"
argument-hint: "[optional question or task description]"
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---

<objective>
Analyze freeform natural language input and dispatch to the most appropriate rcode command. Acts as a smart dispatcher — never does the work itself. Matches intent to the best /rcode-* command, confirms the match, then hands off.
</objective>

<execution_context>
@.rcode/workflows/do.md
</execution_context>

<process>
Execute the do workflow from @.rcode/workflows/do.md end-to-end.
Route user intent to the best rcode command and invoke it.
</process>
