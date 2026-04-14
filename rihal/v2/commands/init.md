---
name: rihal:init
description: Begin the rihla — configure Rihal for this project, scan existing context, and route to the right first action
argument-hint: "[--reset] [--skip-scan]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---

@.rihal/workflows/init.md
