---
name: rihal-sprint-planning
description: >
  Generate or update a sprint plan that sequences stories for dev execution.
  Activates when the user says "plan the sprint", "create sprint plan", "run
  sprint planning", "sequence the next sprint", or "generate sprint N plan".
  Do NOT use for epic breakdown (use rihal-create-epics-and-stories) or
  status reporting (use rihal-sprint-status).
triggers:
  # English
  - "plan the sprint"
  - "create sprint plan"
  - "run sprint planning"
  - "sequence the next sprint"
  - "generate sprint plan"
  - "schedule the sprint"
  # Roman Urdu / Hindi
  - "sprint plan karo"
  - "sprint banao"
  - "agla sprint plan karo"
  # Arabic native
  - "خطّط السباق"
  - "خطط السبرنت"
  - "أنشئ خطة السباق"
  - "السباق التالي"
  - "جدولة السبرنت"
---
@.rihal/references/karpathy-guidelines.md


## Overview

Generate or update a sprint plan that sequences stories for dev execution.

## Workflow

Follow the instructions in ./workflow.md.

## Output Format

- Output: .rihal/phases/{phase}/sprint-{N}.md
- Fixed structure: Sprint Goal (one sentence) | Assumptions | Duration | Stories (with owners) | Capacity Used/Available | Risks | Definition of Done
- Stories ranked by priority from epics.md
- Leave 20% capacity buffer
- Do NOT commit to stories without explicit owners
- Sprint Goal must be one verifiable sentence — if it cannot be verified at sprint end without interpretation, rewrite it
- `Assumptions` block required: list capacity assumptions, any known blockers assumed absent, any dependencies assumed resolved

## Examples

### Happy Path
**Input:** "Plan the next 2-week sprint"
**Expected behavior:** Read epics.md, ask team capacity, select stories fitting capacity with 20% buffer, assign owners, produce sprint file.

### Edge Case: No Capacity Info
**Input:** "Plan the sprint"
**Expected behavior:** Ask: "How many devs, any PTO, any known meetings? I need capacity numbers before committing to stories."

### Negative Example: Fabricated Capacity
**Input:** "Plan the sprint" (no prior capacity info, no `mode: yolo`, no `--auto`)
**Expected behavior:** DO NOT assume "1 senior FT, 30 pts/week" or any other capacity. DO NOT write `sprint-N.md` until the user provides numeric answers for devs/PTO/velocity. If the user resists, point them at the two sanctioned bypass paths (`.rihal/config.yaml` → `mode: yolo` or `/rihal-do --auto`). See `../../_shared/no-autonomous-bypass.md`.
