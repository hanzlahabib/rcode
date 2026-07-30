---
name: rcode-create-epics-and-stories
internal: true
description: >
  Break a PRD into epics and user stories that drive development. Activates
  when the user says "create epics", "break this into stories", "generate
  the epic list", "epic and story breakdown", "decompose the PRD", or
  "create the backlog". Do NOT use to prepare a single story for dev (use
  rcode-create-story).
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
user-invocable: true
---

<!-- Bridge status: not currently invoked by any rcode/workflows/*.md file (no delegate_to_skill
     cross-reference exists in either direction). Reachable only via direct phrase-trigger match
     or explicit @-inclusion. See AUDIT-redundant-work.md finding 3. -->
@.rcode/references/karpathy-guidelines.md

> **Note (experimental, no execution consumer):** the epics/stories/dev-story pipeline this
> skill is part of is not wired to `/rcode-execute` today — `rcode-executor` only reads
> `*-SPRINT.md` files (see `rcode/agents/rcode-executor.md`). The only way to "run" a story
> produced here is the manual `/rcode {dev-prompt-file}` invocation documented in
> `rcode/workflows/dev-story.md`, which has none of `/rcode-execute`'s atomic-commit,
> checkpoint, wave, or verification machinery. Treat this pipeline as experimental /
> unsupported for production execution until a decision is made to either wire it to
> `/rcode-execute` or deprecate it in favor of the SPRINT.md pipeline (see
> `AUDIT-redundant-work.md` finding 2).

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
**Expected behavior:** Refuse. Respond: "No PRD found. Run rcode-create-prd first. I cannot invent requirements."
