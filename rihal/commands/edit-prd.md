---
name: rihal-edit-prd
description: "Update an existing PRD with revisions or clarifications. Use after validation findings or scope changes."
argument-hint: "[prd-path]"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<objective>
Execute edit-prd workflow
</objective>

<execution_context>
@.rihal/workflows/edit-prd.md
</execution_context>

<process>
Execute the edit-prd workflow from @.rihal/workflows/edit-prd.md end-to-end.
</process>
