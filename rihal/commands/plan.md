---
name: rihal:plan
description: Convert council follow-ups or task descriptions into executable PLAN.md files. Spawns rihal-planner to produce structured plans that /rihal:execute can run.
argument-hint: "<list | show <id> | <description>> [--phase <name>] [--output <dir>]"
allowed-tools: Read, Write, Glob, Grep, Bash, Agent
---

@.rihal/workflows/plan.md
