---
name: rcode-scaffold-project
description: "Scaffold a new project from the official rcode template repo, or add rcode to an existing project with --here."
argument-hint: "[project-name | --here]"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<objective>
Execute scaffold-project workflow
</objective>

<execution_context>
@.rcode/workflows/scaffold-project.md
</execution_context>

<process>
Execute the scaffold-project workflow from @.rcode/workflows/scaffold-project.md end-to-end.
</process>
