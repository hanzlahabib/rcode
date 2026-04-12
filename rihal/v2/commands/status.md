---
name: rihal:status
description: Print current project state — phase, plan progress, recent decisions, blockers, last council session
argument-hint: ""
allowed-tools:
  - Read
  - Bash
---

<execution_context>
@.rihal/workflows/status.md
</execution_context>

<objective>
Print a readable dashboard of the current project state from `.rihal/state.json`. Shows phase, plan progress, recent decisions, open blockers, and council session history.
</objective>

<process>
Execute the status workflow from `.rihal/workflows/status.md` end-to-end.
</process>

<examples>
```
/rihal:status
```
</examples>
