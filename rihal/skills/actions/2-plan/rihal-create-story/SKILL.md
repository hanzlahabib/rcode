---
name: rihal-create-story
description: >
  Prepare a dev-ready user story with full implementation context. Activates
  when the user says "create the next story", "prepare a story", "create
  story {id}", "write the story for", "get next story ready for dev", or
  "assemble story context". Do NOT use to execute a story (use
  rihal-dev-story).
triggers:
  - "create the next story"
  - "prepare a story"
  - "create
  story {id}"
  - "write the story for"
  - "get next story ready for dev"
  - "assemble story context"
---

## Overview

Prepare a dev-ready user story with full implementation context.

## Workflow

Follow the instructions in ./workflow.md.

## Output Format

- Story file at .rihal/phases/{phase}/stories/story-{id}.md
- Fixed sections: Goal | Assumptions | Context | Tasks (checklist) | Acceptance Criteria | Dependencies | File List (empty) | Dev Agent Record (empty)
- Each task is ≤4 hours, in execution order
- Acceptance criteria in Given/When/Then — no criterion is valid unless a test can be written against it
- `## Assumptions` block is mandatory: list every assumption that, if wrong, would change the story scope
- Do NOT include implementation details in the story — those emerge during dev
- If AC cannot be stated in Given/When/Then, stop and ask the user to clarify before generating the story

## Examples

### Happy Path
**Input:** "Create the next story from the backlog"
**Expected behavior:** Read epics.md, identify next unstarted story, populate all sections, save.

### Edge Case: Story Dependencies Missing
**Input:** Next story depends on story-003, which isn't done
**Expected behavior:** Report: "story-{id} depends on story-003 (not yet done). Options: (1) work on story-003 first, (2) skip to next independent story. Which?"
