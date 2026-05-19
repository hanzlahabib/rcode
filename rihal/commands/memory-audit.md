---
name: rihal-memory-audit
description: Audit the Memory Bank for stale entries, contradictions, and unfilled placeholders — read-only report
argument-hint: "[--severity {critical|warn|info}]"
allowed-tools:
  - Read
  - Bash
---

@.rihal/workflows/memory-audit.md
