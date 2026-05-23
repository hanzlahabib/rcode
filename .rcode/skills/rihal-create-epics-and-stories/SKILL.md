---
name: rihal-create-epics-and-stories
internal: true
description: >
  Break a PRD into epics and user stories that drive development. Activates
  when the user says "create epics", "break this into stories", "generate
  the epic list", "epic and story breakdown", "decompose the PRD", or
  "create the backlog". Do NOT use to prepare a single story for dev (use
  rihal-create-story).
triggers:
  # English
  - "create epics"
  - "break this into stories"
  - "generate the epic list"
  - "epic and story breakdown"
  - "decompose the PRD"
  - "create the backlog"
  # Roman Urdu / Hindi
  - "epics banao"
  - "stories banao"
  - "backlog banao"
  # Arabic native
  - "أنشئ ملاحم"
  - "أنشئ القصص"
  - "قسّم المتطلبات"
  - "ابني القائمة"
  - "تحليل وثيقة المتطلبات"
---
@.rcode/references/karpathy-guidelines.md


## Overview

Break a PRD into epics and user stories that drive development.

## Workflow

Follow the instructions in ./workflow.md.

## Output Format

- Produces .rcode/phases/{phase}/epics.md with hierarchical structure
- Each epic has: Title | Goal | Assumptions | Stories (list) | Priority | Estimate
- Each story is independently testable and under 4-hour estimate
- Do NOT create epics larger than 10 stories — split further
- Every epic must include an `Assumptions` line — at minimum one entry; "none" is not acceptable
- Every story must have a one-line verifiable AC before being listed — vague stories get flagged and blocked

## Examples

### Happy Path
**Input:** "Break the PRD into epics and stories"
**Expected behavior:** Read PRD, identify 3-6 epics aligned with requirements, decompose each into 3-8 stories with clear acceptance criteria. Save to epics.md.

### Edge Case: PRD Missing
**Input:** "Create epics" (no PRD exists)
**Expected behavior:** Refuse. Respond: "No PRD found. Run rihal-create-prd first. I cannot invent requirements."
