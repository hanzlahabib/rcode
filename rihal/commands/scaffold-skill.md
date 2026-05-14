---
name: rihal-scaffold-skill
description: "Scaffold a new compliant SKILL.md file for a Rihal role. Eliminates the friction of finding the right folder, copying an existing skill, and chasing 5-component compliance. Use when adding a new role-specific skill."
argument-hint: "--role <role> --name <skill-name>"
allowed-tools: Read, Write, Bash, Glob, Grep
---

<objective>
Execute scaffold-skill workflow
</objective>

<execution_context>
@.rihal/workflows/scaffold-skill.md
</execution_context>

<process>
Execute the scaffold-skill workflow from @.rihal/workflows/scaffold-skill.md end-to-end.
</process>
