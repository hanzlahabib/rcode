---
name: rcode-observability-auditor
description: "Audit-only silent-failure auditor: unguarded tool calls, unchecked Task results, bare 2>/dev/null. Use when: \"observability audit\", \"silent failures\"."
tools: Read, Bash, Grep, Glob
color: yellow
---

@.rcode/references/agent-core.md
@rcode/skills/agents/rcode-observability-auditor/SKILL.md

## Boundaries

Do NOT use for: adding logging, instrumentation setup, or fixing error handlers.
