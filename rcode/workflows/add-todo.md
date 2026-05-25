<purpose>
Capture an idea, task, or issue that surfaces during a rcode session as a structured note for later work. Enables "thought → capture → continue" flow without losing context.
</purpose>


## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rcode-add-todo <argument-here>
```

**Examples:**
```
/rcode-add-todo example 1
/rcode-add-todo example 2
```

STOP — do not proceed.

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="init_context">
Load todo context:

```bash
[ -d .rcode/todos ] || mkdir -p .rcode/todos/pending .rcode/todos/done
```

Ensure directories exist for organized todo capture.
</step>

<step name="extract_content">
**With arguments:** Use as the title/focus.
- `/rcode-add-todo Add auth token refresh` → title = "Add auth token refresh"

**Without arguments:** Analyze recent conversation to extract:
- The specific problem, idea, or task discussed
- Relevant file paths mentioned
- Technical details (error messages, line numbers, constraints)

Formulate:
- `title`: 3-10 word descriptive title (action verb preferred)
- `problem`: What's wrong or why this is needed
- `solution`: Approach hints or "TBD" if just an idea
- `files`: Relevant paths with line numbers from conversation
</step>

<step name="infer_area">
Infer area from file paths:

| Path pattern | Area |
|--------------|------|
| `src/api/*`, `api/*` | `api` |
| `src/components/*`, `src/ui/*` | `ui` |
| `src/auth/*`, `auth/*` | `auth` |
| `src/db/*`, `database/*` | `database` |
| `tests/*`, `__tests__/*` | `testing` |
| `docs/*` | `docs` |
| `.rcode/*` | `planning` |
| `scripts/*`, `bin/*` | `tooling` |
| No files or unclear | `general` |

Use existing area if similar match exists.
</step>

<step name="check_duplicates">
```bash
# Search for key words from title in existing todos
grep -l -i "[key words from title]" .rcode/todos/pending/*.md 2>/dev/null || true
```

If potential duplicate found:
1. Read the existing todo
2. Compare scope

If overlapping, ask user:
- "Similar todo exists: [title]. What would you like to do?"
- Options:
  - "Skip" — keep existing todo
  - "Replace" — update existing with new context
  - "Add anyway" — create as separate todo
</step>

<step name="create_file">
Generate slug for the title and write to `.rcode/todos/pending/{date}-{slug}.md`:

```bash
slug=$(echo "$title" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
date=$(date +%Y-%m-%d)
```

Write file with:

```markdown
---
created: [ISO timestamp]
title: [title]
area: [area]
files:
  - [file:lines]
---

## Problem

[problem description - enough context for future agent to understand weeks later]

## Solution

[approach hints or "TBD"]
```
</step>

<step name="update_state">
If `.rcode/STATE.md` exists:

1. Count pending todos in .rcode/todos/pending/
2. Update "## Pending Todos" section (if exists)
</step>

<step name="git_commit">
Commit the todo and any updated state:

```bash
git add .rcode/todos/pending/ .rcode/STATE.md 2>/dev/null || true
git commit -m "docs: capture todo - $title" 2>/dev/null || true
```

Confirm: "Committed: docs: capture todo - [title]"
</step>

<step name="confirm">
```
Todo saved: .rcode/todos/pending/[filename]

  [title]
  Area: [area]
  Files: [count] referenced

---

Would you like to:

1. Continue with current work
2. Add another todo
3. View all todos (/rcode-add-todo --list)
```
</step>

</process>

<success_criteria>
- [ ] Directory structure exists
- [ ] Todo file created with valid frontmatter
- [ ] Problem section has enough context for future agent
- [ ] No duplicates (checked and resolved)
- [ ] Area consistent with existing todos
- [ ] STATE.md updated if exists
- [ ] Todo committed to git
</success_criteria>
</process>

## Success Criteria

- [ ] Task completed as requested
- [ ] Output saved or reported
- [ ] State updated if necessary
- [ ] No errors encountered

## On Error

If arguments are invalid, missing files, or subagent fails:
- Validate inputs match expected format
- Check that required files exist
- Retry with clearer arguments or report the specific error to the user


## On Completion

/rcode-check-todos — review all open todos
/rcode-next — get suggested next action
/rcode-progress — see overall roadmap status

## Next Up

- `/rcode-check-todos` — view all captured todos
- `/rcode-do` — continue with your current work
