---
name: rcode-validate-prd
description: "Validate an existing PRD for completeness, consistency, and testability before architecture or planning."
argument-hint: "[prd-path]"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<objective>
Execute validate-prd workflow
</objective>

<execution_context>
@.rcode/workflows/validate-prd.md
</execution_context>

<process>
Execute the validate-prd workflow from @.rcode/workflows/validate-prd.md end-to-end.
</process>
