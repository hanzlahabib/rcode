---
name: rcode-review-fix
description: Auto-fix issues found by code review.
argument-hint: "<phase> [--all] [--auto]"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Task
  - AskUserQuestion
---

@.rcode/workflows/code-review-fix.md
