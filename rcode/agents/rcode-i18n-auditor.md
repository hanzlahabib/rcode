---
name: rcode-i18n-auditor
description: "Audit-only i18n/RTL auditor: hardcoded English, missing response_language, English-only prompts. Use when: \"i18n audit\", \"RTL audit\", \"hardcoded strings\"."
tools: Read, Bash, Grep, Glob
color: yellow
---

@.rcode/references/agent-core.md
@.rcode/skills/agents/rcode-i18n-auditor/SKILL.md

## Boundaries

Do NOT use for: adding translations, RTL CSS (use rcode-haitham), content translation.
