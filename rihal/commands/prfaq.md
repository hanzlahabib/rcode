---
name: rihal:prfaq
description: Working Backwards PRFAQ challenge to forge product concepts. Use when the user requests to create a PRFAQ, work backwards, or run the PRFAQ challenge.
argument-hint: ""
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
---

<delegate_to_skill>
This slash command delegates to the `rihal-prfaq` skill.
Authoritative behaviour lives in:
  - `.claude/skills/rihal-prfaq/SKILL.md` (triggers, output format, examples)
  - `.claude/skills/rihal-prfaq/workflow.md` (Critical Rules, step files)

Load both before running. The skill's safety rails (halt-at-menu,
state-sync, no-bypass) MUST fire whether activated by phrase or this
slash command. Closes #218.
</delegate_to_skill>

@.claude/skills/rihal-prfaq/SKILL.md
