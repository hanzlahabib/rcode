---
name: rihal-check-implementation-readiness
description: "Verify a feature is fully ready to implement — PRD approved, architecture approved, dependencies identified — before writing code."
argument-hint: "[--phase <n>]"
allowed-tools: Read, Write, Bash, Glob, Grep, Agent
---

<objective>
Execute check-implementation-readiness workflow
</objective>

<execution_context>
@.rihal/workflows/check-implementation-readiness.md
</execution_context>

<process>
Execute the check-implementation-readiness workflow from @.rihal/workflows/check-implementation-readiness.md end-to-end.
</process>
