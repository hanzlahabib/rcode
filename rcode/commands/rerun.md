---
name: rcode-rerun
description: Re-execute a phase or plan, resetting its state and creating fresh commits
argument-hint: <phase-id|plan-id>
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---

@.rcode/workflows/rerun.md
