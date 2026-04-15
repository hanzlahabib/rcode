---
name: rihal:execute
description: Execute one or more PLAN.md files. Spawns rihal-executor subagents in parallel per dependency wave. Pauses at checkpoints and waits for human verification or decisions.
argument-hint: "<plan-file.md | phase-dir> [--wave N] [--interactive] [--continue] [--option=A]"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent
---

@.rihal/workflows/execute.md
