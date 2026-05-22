---
name: rcode-next
description: Automatically advance to the next logical step — zero friction, auto-invoke
argument-hint: "[--force]"
allowed-tools: Bash, Read, Grep, Glob
---

<objective>
Detect current project state and automatically invoke the next logical rcode workflow step. No confirmation — reads state, routes, executes.
</objective>

<execution_context>
@.rcode/workflows/next.md
</execution_context>

<process>
Execute the next workflow from @.rcode/workflows/next.md end-to-end.
Detect state, apply safety gates, determine next action, invoke immediately.
</process>
