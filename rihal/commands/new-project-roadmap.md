---
name: rihal-new-project-roadmap
description: Roadmap subcommand for new-project. Generates PROJECT.md requirements, ROADMAP.md, and the Done signoff after setup and optional research.
argument-hint: "[--from-research]"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<objective>
Execute the requirements + roadmap phase of new-project: produce PROJECT.md, REQUIREMENTS.md, and ROADMAP.md.
</objective>

<execution_context>
@.rihal/workflows/new-project-roadmap.md
</execution_context>

<process>
Execute the new-project-roadmap subworkflow from @.rihal/workflows/new-project-roadmap.md end-to-end.
</process>
