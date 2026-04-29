---
name: rihal-feature-drift
description: "Detect drift between PRD, epics, stories, and code. Severity-tagged report; --fix patches trivial items only. Reuses verifier-loop pattern from /rihal:docs-update."
argument-hint: "[--fix] [--scope phase|project] [phase-number]"
allowed-tools: Read, Write, Bash, Glob, Grep, Task, AskUserQuestion
---

<objective>
Execute feature-drift workflow
</objective>

<execution_context>
@.rihal/workflows/feature-drift.md
</execution_context>

<process>
Execute the feature-drift workflow from @.rihal/workflows/feature-drift.md end-to-end.
</process>
