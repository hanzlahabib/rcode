---
name: rcode-do
description: >-
  [ROUTER] Interactive picker — describe what you want and rcode picks
  the command. It ASKS which command to run; it never acts on its own,
  so activating it costs one question and nothing more.
  Activates when the user names rcode ("use rcode", "rcode kar do",
  "let rcode handle this", "rcode this"), AND ALSO on project-lifecycle
  requests that rcode already has a command for even when rcode is not
  named: raising a PR or shipping a branch, planning or executing a
  phase, adding a phase or a sprint, auditing or verifying work,
  starting a new project or milestone, or updating the rcode install.
  rcode ships 117 such commands; a request that matches one should reach
  it rather than being hand-rolled with Bash. Do NOT activate for
  ordinary coding, debugging, or file edits that have no rcode command —
  when in doubt, do not route.
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
