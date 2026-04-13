---
name: rihal:council
description: Convene the Rihal majlis — spawns 3-5 specialist subagents in parallel to answer a strategic question. Agents are picked by keyword scoring.
argument-hint: "<question> [--full] [--agents=a,b,c] [--explain]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Task
  - AskUserQuestion
---

@.rihal/workflows/council.md
