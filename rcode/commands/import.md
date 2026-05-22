---
name: rcode-import
description: Ingest external plans with conflict detection against project decisions
argument-hint: "--from <path>"
allowed-tools:
  - Read
  - Grep
  - Bash
  - AskUserQuestion
---

@.rcode/workflows/import.md
