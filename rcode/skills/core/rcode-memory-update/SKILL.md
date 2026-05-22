---
name: rcode-memory-update
description: >
  Surgical update of specific Memory Bank files from conversation context.
  Adds an entry to decisions.md, appends a known issue, updates the current
  milestone, or extends the stakeholder list — without rewriting whole files.
  Activates when the user says "remember this decision", "log this decision",
  "add this to memory bank", "update memory bank", "/rcode-memory-update",
  "save this to memory", "yeh memory mein add karo", or after a council
  session that produced a clear decision. Do NOT use for: initial bootstrap
  (use rcode-memory-init), regenerating distillates (use rcode-memory-distill),
  or general note-taking (use the existing rcode-note workflow).
triggers:
  # English
  - "remember this decision"
  - "log this decision"
  - "add this to memory bank"
  - "update memory bank"
  - "save this to memory"
  - "/rcode-memory-update"
  - "/rcode-memory-update"
  # Roman Urdu / Hindi
  - "yeh memory mein add karo"
  - "memory mein save karo"
  - "yeh decision yaad rakho"
  - "memory bank update karo"
  # Arabic native
  - "احفظ هذا القرار"
  - "أضف إلى الذاكرة"
  - "تذكّر هذا"
  - "حدّث بنك الذاكرة"
  - "سجّل هذا القرار"
user-invocable: false
---
@.rcode/references/karpathy-guidelines.md


## Overview

Append or update a single Memory Bank file based on the current conversation context. Surgical: never rewrites a whole file, never deletes existing content. Auto-routes the update to the right file based on what's being saved (decision → `decisions.md`, issue → `known-issues.md`, etc.).

## Workflow

1. **Detect target file.** Read the user's intent and pick the destination:
   - "decision" / "we chose" / "ADR" → `project/decisions.md`
   - "issue" / "bug" / "workaround" → `incidents/known-issues.md`
   - "stakeholder" / "client" / "contact" → `people/stakeholders.md`
   - "milestone" / "sprint" / "phase" → `milestones/current.md`
   - "stack" / "we're using" / "switched to" → `project/stack.md`
   - "term" / "what does X mean" / "glossary" → `project/glossary.md`
   - "team" / "who owns" → `people/team.md`
2. **Confirm target with user.** Show the file path and the entry to be added. Wait for ack.
3. **Append using the file's documented format.** Each Memory Bank file documents its own entry format at the top — follow it exactly.
4. **Never overwrite.** If the user wants to *change* an existing entry, refuse and direct them to edit the file directly. This skill is append-only for safety.
5. **Stamp with date** in `YYYY-MM-DD` format.
6. **Suggest distillate refresh** if the update was substantive (`/rcode-memory-distill`).

## Output Format

```
✓ Appended to .rcode/memory/project/decisions.md

  ### 2026-04-26 — Switch to Postgres 16 from Postgres 14
  **Decision:** Upgrade primary database to Postgres 16.4.
  **Rationale:** ...

Tip: run /rcode-memory-distill to refresh the project distillate.
```

## Examples

**Happy path — decision**
User: `remember this decision: we picked Temporal over BullMQ because we need durable workflows`
Skill: detects decision intent, formats entry, confirms, appends to `decisions.md`.

**Happy path — known issue**
User: `add to memory bank: SSO login fails on Safari 16, workaround is Chrome`
Skill: detects issue intent, formats entry, appends to `incidents/known-issues.md`.

**Negative — destructive request**
User: `update memory bank: change the milestone goal to X`
Skill: refuses ("this skill is append-only"). Suggests editing `milestones/current.md` directly.

## Memory Bank Hooks

- **Reads:** the target file's existing format header (to preserve structure)
- **Writes:** exactly one append to one file per invocation
