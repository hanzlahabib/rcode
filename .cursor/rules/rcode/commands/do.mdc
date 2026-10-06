---
name: rcode-do
description: "[ROUTER] Picker: asks which rcode command fits, never acts on its own. Use when: \"rcode kar do\", \"let rcode handle this\", \"raise a PR\", \"plan this phase\". Not for: plain coding."
argument-hint: "[optional question or task description]"
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---

<objective>
Route freeform input to the best /rcode-* command. A dispatcher: it never does the work itself.
</objective>

<execution_context>
@.rcode/workflows/do.md
</execution_context>

<process>
Execute the do workflow from @.rcode/workflows/do.md end-to-end.
Route user intent to the best rcode command and invoke it.
</process>
