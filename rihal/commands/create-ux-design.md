---
name: rihal:create-ux-design
description: create-ux-design workflow
argument-hint: ""
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

<delegate_to_skill>
This slash command delegates to the `rihal-create-ux-design` skill.
Authoritative behaviour lives in:
  - `.claude/skills/rihal-create-ux-design/SKILL.md` (triggers, output format, examples)
  - `.claude/skills/rihal-create-ux-design/workflow.md` (Critical Rules, step files)

Load both before running. The skill's safety rails (halt-at-menu,
state-sync, no-bypass) MUST fire whether activated by phrase or this
slash command. Closes #218.
</delegate_to_skill>

@.claude/skills/rihal-create-ux-design/SKILL.md
