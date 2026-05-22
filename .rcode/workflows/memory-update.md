# Workflow: rcode-memory-update

<purpose>
Append-only surgical update to a single Memory Bank file. Adds a decision, known issue, stakeholder note, or milestone update from current conversation context. Never rewrites, never deletes — pure append.
</purpose>

Append-only surgical update to a single Memory Bank file. Never rewrites, never deletes.

---

## Inputs

- **content** — the thing to remember, in plain English
- **target** (optional) — explicit file path; if omitted, auto-detected from content

## Preconditions

- `.rihal/memory/` exists (run `/rcode:memory-init` first)

## Halt conditions

- `.rihal/memory/` missing → instruct user to init first
- User asks to *change* (not append) an existing entry → refuse, redirect to direct file edit
- Detected target file does not exist → report and halt (don't create new files in this workflow)

---

## Steps

### Step 1 — Auto-detect target

Match keywords in the user's content against this routing table:

| Signal | Target |
|---|---|
| "decision", "we chose", "ADR", "decided" | `project/decisions.md` |
| "bug", "issue", "broken", "workaround" | `incidents/known-issues.md` |
| "stakeholder", "client", "contact", "rep" | `people/stakeholders.md` |
| "milestone", "sprint", "phase", "blocker" | `milestones/current.md` |
| "stack", "framework", "library", "switched to" | `project/stack.md` |
| "term", "glossary", "what does X mean" | `project/glossary.md` |
| "team", "who owns", "engineer", "responsibility" | `people/team.md` |
| "change record", "deployment", "rollback" | `change-records/` (creates new file) |

If ambiguous, ask the user to pick from the top 2 candidates.

### Step 2 — Confirm with user

Show:
- Target file path
- Proposed entry, formatted to match the file's existing entry style
- A "Apply / cancel / edit format" choice

### Step 3 — Append

For appendable files (`decisions.md`, `known-issues.md`, `stakeholders.md`, `team.md`, `glossary.md`):
- Insert above the `<!-- Append new entries above this line -->` marker if present
- Otherwise append to end of file with a blank line separator

For `milestones/current.md`:
- Allow only field-level updates (Goal, Active phase, Blockers, Recent decisions)
- Replace the field's value, not the whole file

For `change-records/`:
- Create a new file `YYYYMMDD-NNN.md` where `NNN` is the next sequence number
- Use the change-record template format

### Step 4 — Stamp and verify

- Add `YYYY-MM-DD` date (today, ISO format) to every appended entry
- Print a diff preview (last 20 lines of the file) so the user can confirm the change landed

### Step 5 — Suggest distillate refresh

If the change was to `project/`, `milestones/current.md`, or `incidents/`, suggest `/rcode:memory-distill` to refresh distillates. Optional, not enforced.

---

## Post-conditions

- Exactly one file changed (or one new change-record file created)
- File still parses as valid markdown
- No content removed

## Reversibility

`git diff .rihal/memory/` shows exactly one append — easy to revert with `git checkout`.
