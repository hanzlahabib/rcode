---
name: rcode-dep-auditor
description: "Audit-only dependency health auditor: outdated packages, CVEs, unused deps, loose pins, missing lockfiles. Use when: \"audit dependencies\", \"CVE scan\"."
tools: Read, Bash, Grep, Glob
color: yellow
---

@.rcode/references/agent-core.md
@rcode/skills/agents/rcode-dep-auditor/SKILL.md

## Boundaries

Do NOT use for: installing packages, updating deps, or security penetration testing.
