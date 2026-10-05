---
name: rcode-new-project-roadmap
description: "Roadmap subcommand of new-project: writes PROJECT.md requirements, ROADMAP.md and the Done signoff."
argument-hint: "[--from-research]"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<objective>
Execute the requirements + roadmap phase of new-project: produce PROJECT.md, REQUIREMENTS.md, and ROADMAP.md.
</objective>

<execution_context>
@.rcode/workflows/new-project-roadmap.md
</execution_context>

<process>
Execute the new-project-roadmap subworkflow from @.rcode/workflows/new-project-roadmap.md end-to-end.
</process>
