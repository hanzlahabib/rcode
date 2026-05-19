---
name: rihal-dev-story
internal: true
description: >
  Execute an approved story file by writing tests and code that fulfill
  every acceptance criterion. Activates when the user says "dev this story",
  "implement story {id}", "execute the story", "code the next story", "run
  dev-story on", or "implement .rihal/phases/{phase}/stories/{file}". Do NOT
  use without a prepared story file (use rihal-create-story first).
triggers:
  - "dev this story"
  - "implement story {id}"
  - "execute the story"
  - "code the next story"
  - "run
  dev-story on"
  - "implement .rihal/phases/{phase}/stories/{file}"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

Execute an approved story file by writing tests and code that fulfill every acceptance criterion.

## Workflow

Follow the instructions in ./workflow.md.

## Output Format

- Reads story file first; executes tasks in order
- Marks tasks [x] only when implementation AND tests pass
- Updates story's File List and Dev Agent Record sections
- Runs two-stage automated review before marking complete: spec compliance → code quality
- Reports: "Story complete. N tasks done. Tests: PASS (X). Files: [list]. Reviews: SPEC ✅ QUALITY ✅"
- Do NOT invent scope beyond the story
- Do NOT commit with red tests

## Review Protocol

After all tasks complete, dispatches two fresh reviewer subagents before handing off to human review:

**Stage 1 — Spec Compliance:** Confirms every AC is implemented, nothing extra was built. Repeats until COMPLIANT.

**Stage 2 — Code Quality:** Reviews naming, error handling, test depth, security, maintainability. Fixes High-severity issues; logs Medium issues for human reviewer. Repeats until APPROVED/APPROVED_WITH_NOTES.

## Model Selection

When dispatching reviewer subagents or sub-tasks:
- Mechanical tasks (isolated, clear spec, 1-2 files) → cheapest/fastest model
- Integration tasks (multi-file, pattern matching) → standard model  
- Architecture, design, or review tasks → most capable model

## Implementer Status Protocol

When running as a subagent implementer, report one of:
- **DONE** — all requirements met, tests pass
- **DONE_WITH_CONCERNS** — complete but flagging doubts about correctness or scope
- **NEEDS_CONTEXT** — cannot proceed without specific missing information
- **BLOCKED** — cannot complete; caller must restructure or escalate

## Examples

### Happy Path
**Input:** "dev this story: .rihal/phases/phase-02/stories/story-005.md"
**Expected behavior:** Read story, execute tasks in order, write tests, run suite after each task, mark checkboxes, update File List. After all tasks: dispatch spec compliance reviewer, dispatch code quality reviewer, mark as "review".

### Edge Case: Missing Story
**Input:** "dev the login story" (story file doesn't exist)
**Expected behavior:** Refuse. Respond: "No story file found. Run rihal-create-story first. I execute approved stories, I don't invent them."

### Edge Case: Red Tests Mid-Execution
**Input:** (task 2 breaks a test from task 1)
**Expected behavior:** STOP. Report regression. Fix before continuing.

### Edge Case: Spec Compliance Fails Review
**Input:** Implementation complete but reviewer finds missing AC
**Expected behavior:** Fix the gap, re-run tests, re-dispatch spec compliance reviewer. Do not proceed to code quality review until spec compliance passes.
