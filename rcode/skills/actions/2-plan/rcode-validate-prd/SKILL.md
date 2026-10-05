---
name: rcode-validate-prd
internal: true
description: "Validate a PRD for completeness, leanness and consistency. Use when: \"validate the PRD\", \"is the PRD ready\", \"PRD quality check\". Not for create or edit."
disable-model-invocation: true
triggers:
  - "validate the PRD"
  - "review the PRD"
  - "check the PRD"
  - "is the PRD ready"
  - "PRD quality check"
  - "audit the PRD"
user-invocable: true
---

@.rcode/references/karpathy-guidelines.md


## Overview

Validate an existing PRD for comprehensiveness, leanness, organization, and internal consistency.

## Workflow

Follow the instructions in ./workflow.md.

## Output Format

- Produces a validation report with severity per issue: Critical / Warning / Info
- Report table: Section | Issue | Severity | Suggested Fix
- Final verdict: READY / NEEDS REVISION / REWRITE
- Do NOT silently fix issues — report them for the user to decide

## Examples

### Happy Path
**Input:** "Validate the PRD at .rcode/phases/phase-02/prd.md"
**Expected behavior:** Read PRD, check against rubric (problem clarity, measurable success, explicit scope, kill criteria, owner attribution), produce report, deliver verdict.

### Edge Case: PRD Missing Sections
**Input:** (PRD is missing Kill Criteria section)
**Expected behavior:** Report as Critical: "Missing Kill Criteria section. Without this, the project has no exit strategy. Recommended fix: [template snippet]."

## Boundaries

Do NOT use to create or edit a PRD.
