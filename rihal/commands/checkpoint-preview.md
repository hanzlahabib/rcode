---
name: rihal:checkpoint-preview
description: LLM-assisted human-in-the-loop review. Make sense of a change, focus attention where it matters, test. Use when the user says checkpoint, human review, or walk me through this change.
argument-hint: ""
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

<delegate_to_skill>
This slash command delegates to the `rihal-checkpoint-preview` skill.
Authoritative behaviour lives in:
  - `.claude/skills/rihal-checkpoint-preview/SKILL.md` (triggers, output format, examples)
  - `.claude/skills/rihal-checkpoint-preview/workflow.md` (Critical Rules, step files)

Load both before running. The skill's safety rails (halt-at-menu,
state-sync, no-bypass) MUST fire whether activated by phrase or this
slash command. Closes #218.
</delegate_to_skill>

@.claude/skills/rihal-checkpoint-preview/SKILL.md
