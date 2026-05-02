---
name: rihal-audit
description: Single audit entry point — asks what to audit (phase, milestone, UAT, code, fix, work, lens) and dispatches to the right subroute. Honours .rihal/config.yaml mode.
argument-hint: "[phase | milestone | uat | code | fix | work | lens [<1-15> | all]] [...subroute args]"
allowed-tools: Read, Write, Bash, AskUserQuestion
---

@.rihal/workflows/audit.md
