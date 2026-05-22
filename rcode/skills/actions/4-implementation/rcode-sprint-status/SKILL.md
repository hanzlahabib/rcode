---
name: rcode-sprint-status
internal: true
description: >
  Generate a sprint status report showing progress, blockers, and
  recommended next actions. Activates when the user says "sprint status",
  "how is the sprint going", "generate status report", "sprint progress", or
  "where are we in the sprint". Do NOT use for retrospectives (use
  rcode-retrospective).
triggers:
  - "sprint status"
  - "how is the sprint going"
  - "generate status report"
  - "sprint progress"
  - "where are we in the sprint"
user-invocable: true
---
@.rcode/references/karpathy-guidelines.md


## Overview

Generate a sprint status report showing progress, blockers, and recommended next actions.

## Workflow

Follow the instructions in ./workflow.md.

## Output Format

- Sprint table: Sprint | Status | Artifacts (SUMMARY.md ✓ / —)
- Summary: X/Y sprints done, N in-progress, N todo, recommendation for next action
- Reads from `.planning/phases/<phase-dir>/*-SPRINT.md` and `*-SUMMARY.md`
- Do NOT invent progress — read from actual file states

## Examples

### Happy Path
**Input:** "What's the sprint status?"
**Expected behavior:** Read state.json for current phase, scan SPRINT.md and SUMMARY.md files in the phase directory, produce table + summary + next-action recommendation.

### Edge Case: No Active Phase
**Input:** "Sprint status" (no state.json or no current_phase)
**Expected behavior:** Respond: "No active phase found. Run /rcode-plan <N> to start a phase."

### Edge Case: No Sprints Executed Yet
**Input:** "Sprint status" (SPRINT.md files exist but no SUMMARY.md)
**Expected behavior:** Show all sprints as `todo`, recommend `/rcode-execute <phase>`.
