---
name: rcode-do
description: >-
  [ROUTER] Interactive picker — describe what you want and rcode picks
  the command. Activates whenever the user says "use rcode", "using
  rcode", "rcode kar do", "rcode say kara do", "let rcode handle
  this/it", "rcode this", or otherwise names rcode as the tool to use
  for a task without naming a specific /rcode-* command — especially
  when the request bundles multiple asks (e.g. "init a phase, build a
  checklist, make a sprint"). Route through this picker instead of
  hand-rolling files or Bash workarounds for what rcode already has a
  command for.
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
