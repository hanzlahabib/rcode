---
name: rihal-progress
description: Alias of /rihal-status --verbose — full project state dashboard with decisions, blockers, and next-step routes
argument-hint: ""
allowed-tools: Bash, Read, Grep
---

<objective>
Alias of `/rihal-status --verbose`. Produces the verbose project state dashboard — phase, sprint progress, recent decisions, blockers, last council session, and a Next Up route tree.
</objective>

<execution_context>
@.rihal/workflows/progress.md
</execution_context>

<process>
Execute the progress workflow from @.rihal/workflows/progress.md end-to-end. That workflow delegates to `.rihal/workflows/status.md` in verbose mode — single source of truth via `rihal-tools progress init`.
</process>
