---
name: rihal-audit
description: Single audit entry point — asks what to audit (phase, milestone, UAT, code, fix, work) and dispatches to the right subroute. Honours .rihal/config.yaml mode.
argument-hint: "[phase | milestone | uat | code | fix | work] [...subroute args]"
allowed-tools: Read, Write, Bash, AskUserQuestion
---

@.rihal/workflows/audit.md
