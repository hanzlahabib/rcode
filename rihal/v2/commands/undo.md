---
name: rihal:undo
description: Safe git revert — roll back phase or plan commits with dependency checks.
argument-hint: "--last N | --phase NN | --plan NN-MM"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Task
  - AskUserQuestion
---

@.rihal/workflows/undo.md
