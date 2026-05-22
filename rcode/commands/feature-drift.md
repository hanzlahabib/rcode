---
name: rcode-feature-drift
description: "Detect drift between PRD, epics, stories, and code. Severity-tagged report; --fix patches trivial items only. Reuses verifier-loop pattern from /rcode-docs-update."
argument-hint: "[--fix] [--scope phase|project] [phase-number]"
allowed-tools: Read, Write, Bash, Glob, Grep, Task, AskUserQuestion
---

<objective>
Execute feature-drift workflow
</objective>

<execution_context>
@.rcode/workflows/feature-drift.md
</execution_context>

<process>
Execute the feature-drift workflow from @.rcode/workflows/feature-drift.md end-to-end.
</process>
