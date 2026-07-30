---
name: rcode-create-architecture
internal: true
description: >
  Write an Architecture Decision Record (ADR) to lock a significant
  technical decision. Activates when the user says "write an ADR", "create
  architecture decision", "document this architectural choice", "write an
  architecture record", "lock this technical decision", or "record the
  decision to use X". Do NOT use for implementation code (use
  rcode-dev-story) or sprint planning (use rcode-sprint-planning).
triggers:
  - "write an ADR"
  - "create
  architecture decision"
  - "document this architectural choice"
  - "write an
  architecture record"
  - "lock this technical decision"
  - "record the
  decision to use X"
user-invocable: true
---

<!-- Bridge status: not currently invoked by any rcode/workflows/*.md file (no delegate_to_skill cross-reference exists in either direction). Reachable only via direct phrase-trigger match or explicit @-inclusion. See AUDIT-redundant-work.md finding 3. -->
@.rcode/references/karpathy-guidelines.md


## Overview

Write an Architecture Decision Record (ADR) to lock a significant technical decision.

## Workflow

Follow the instructions in ./workflow.md.

## Output Format

- ADR file structure is fixed: Title | Status | Date | Decider | Context | Decision | Consequences | Alternatives Considered
- Saved to .rcode/decisions/{NNN}-{slug}.md with sequential numbering
- Status values: Proposed / Accepted / Deprecated / Superseded
- At least 2 alternatives considered, each with explicit rejection reason
- Do NOT skip the Alternatives section — it's the most important part

## Examples

### Happy Path
**Input:** "Create an ADR for choosing Postgres over MongoDB"
**Expected behavior:** Ask for context (what project, constraints). Produce ADR with Context, Decision (Postgres), Consequences (trade-offs both ways), Alternatives (MongoDB rejected because X, SQLite rejected because Y).

### Edge Case: Insufficient Justification
**Input:** "ADR: we're using React"
**Expected behavior:** Refuse to write a one-liner ADR. Ask: "What did you reject (Vue, Svelte, Angular)? What trade-offs did you weigh? An ADR without alternatives is a note, not a decision record."
