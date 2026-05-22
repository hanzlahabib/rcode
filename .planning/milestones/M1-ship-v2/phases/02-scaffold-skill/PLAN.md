---
phase: 02
name: Scaffold Project Skill
status: complete
completed_at: 2026-04-15
milestone: M1
---

# Phase 02 — Scaffold Project Skill

**Goal:** Enable Rihalians to bootstrap new projects from the official template repo (`rcode-om/template`) with one command, always pulling fresh.

## Requirements

- REQ-02-SCAFFOLD: `rcode-scaffold-project` skill bootstraps a project from template
- REQ-02-SAFETY: Never overwrites a non-empty folder
- REQ-02-FRESH: Always pulls fresh from GitHub (no local cache)

## Approach

Create a skill that wraps `git clone` of the official template. Add safety checks. Register in SKILLS_INDEX.

## Delivered

- `rcode-scaffold-project` skill — 4-step workflow
- Safety checks: detects non-empty folders, aborts cleanly
- Fresh clone every time — no stale local cache
- GH issue #101 filed for template improvement suggestions

## Acceptance

✅ `rcode-scaffold-project` skill installed and invocable.
✅ Running on non-empty folder aborts with clear message.
✅ Template improvements tracked in #101 (separate track).
