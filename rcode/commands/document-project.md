---
name: rcode-document-project
description: Load documentation-requirements.csv, audit missing/stale docs, file missing docs as SPRINT.md tasks. Auto-injected by resume-work.md if present.
argument-hint: "[--csv <path>] [--auto-file-tasks]"
allowed-tools: Read, Write, Glob, Bash, Agent
---

@.rcode/workflows/document-project.md
