---
name: rihal:autonomous
description: Execute remaining phases autonomously with minimal human intervention. Runs plan → execute → verify cycles for unfinished work, pausing at checkpoints and failures.
argument-hint: "[--from N] [--to M] [--only N] [--interactive]"
allowed-tools: Read, Bash, Agent, AskUserQuestion
---

@.rihal/workflows/autonomous.md
