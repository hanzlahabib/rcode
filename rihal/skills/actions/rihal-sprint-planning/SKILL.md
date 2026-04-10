---
name: rihal-sprint-planning
description: >
  Generate or update a sprint plan that sequences stories for dev execution.
  Activates when the user says "plan the sprint", "create sprint plan", "run
  sprint planning", "sequence the next sprint", or "generate sprint N plan".
  Do NOT use for epic breakdown (use rihal-create-epics-and-stories) or
  status reporting (use rihal-sprint-status).
---

Follow the instructions in ./workflow.md.

## Output Format

- Output: .rihal/phases/{phase}/sprint-{N}.md
- Fixed structure: Sprint Goal (one sentence) | Duration | Stories (with owners) | Capacity Used/Available | Risks | Definition of Done
- Stories ranked by priority from epics.md
- Leave 20% capacity buffer
- Do NOT commit to stories without explicit owners

## Examples

### Happy Path
**Input:** "Plan the next 2-week sprint"
**Expected behavior:** Read epics.md, ask team capacity, select stories fitting capacity with 20% buffer, assign owners, produce sprint file.

### Edge Case: No Capacity Info
**Input:** "Plan the sprint"
**Expected behavior:** Ask: "How many devs, any PTO, any known meetings? I need capacity numbers before committing to stories."
