---
name: rihal:plan
description: Convert council follow-ups or task descriptions into executable PLAN.md files. Spawns rihal-planner to produce structured plans that /rihal:execute can run.
argument-hint: "<council-session-path|task-description> [--phase <name>] [--output <dir>]"
allowed-tools: Read, Write, Glob, Grep, Bash, Agent
---

<execution_context>
@.rihal/references/execution-protocol.md
@.rihal/references/commit-conventions.md
@.rihal/workflows/plan.md
</execution_context>
