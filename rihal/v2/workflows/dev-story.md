# Workflow: rihal:dev-story

<purpose>
Wrap a STORY.md file for AI-coder consumption. Produces:
1. Full story context with acceptance criteria
2. Explicit file paths for implementation
3. Development checklist
4. Entry gate via checklist-story-draft.md
5. Exit gate via checklist-story-dod.md

This workflow creates the execution prompt for a pair-programming session with an AI coder.
</purpose>


## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rihal:dev-story <argument-here>
```

**Examples:**
```
/rihal:dev-story example 1
/rihal:dev-story example 2
```

STOP — do not proceed.

## Step 0 — Validation

**If no arguments:**

```
Usage: /rihal:dev-story <STORY.md>

Examples:
  /rihal:dev-story .planning/stories/EPIC-01.1.md
```

Stop and wait for arguments.

**Validate input file exists:**

```bash
if [[ ! -f "$STORY_FILE" ]]; then
  echo "Error: File not found: $STORY_FILE"
  exit 1
fi

if [[ ! "$STORY_FILE" =~ \.md$ ]]; then
  echo "Error: Must be a .md file: $STORY_FILE"
  exit 1
fi
```

## Step 1 — Load Story & References

```bash
@.rihal/references/checklist-story-draft.md
@.rihal/references/checklist-story-dod.md
@.rihal/references/commit-conventions.md
```

Read the story file:

```bash
STORY_CONTENT=$(cat "$STORY_FILE")
STORY_ID=$(echo "$STORY_CONTENT" | grep "^**ID:**" | sed "s/^**ID:** //")
STORY_TITLE=$(echo "$STORY_CONTENT" | grep "^# Story:" | sed "s/^# Story: //")
PERSONA=$(echo "$STORY_CONTENT" | grep "^**Persona:**" | sed "s/^**Persona:** //")
EFFORT=$(echo "$STORY_CONTENT" | grep "^**Size:**" | sed "s/^**Size:** //")
```

## Step 2 — Check Entry Gate

Run story through checklist-story-draft.md:

- ✓ Persona named
- ✓ Action/outcome specified
- ✓ 3+ acceptance criteria
- ✓ Out-of-scope listed
- ✓ Effort estimated

Extract acceptance criteria from story:

```bash
CRITERIA=$(sed -n '/^## Acceptance Criteria/,/^## /p' "$STORY_FILE" | grep "^- \[ \]" | sed 's/^- \[ \] //')
```

If story fails checks, print error:

```
⚠️ Story does not pass entry gate:

Missing: {failed checks}

Fix the story file before proceeding.
```

Stop. Only proceed if ALL checks pass.

## Step 3 — Generate Execution Context

Produce a detailed context document that will be passed to an AI coder.

**Detect related files (context for the coder):**

```bash
# Find relevant source files, tests, config
PROJECT_ROOT=$(pwd)
PACKAGE_JSON="$PROJECT_ROOT/package.json"
README="$PROJECT_ROOT/README.md"
PROJECT_MD="$PROJECT_ROOT/.planning/PROJECT.md"
EPIC_FILE=$(echo "$STORY_CONTENT" | grep "^**Epic:**" | sed "s/^**Epic:** //" | sed "s/ —.*//" | xargs -I {} find .planning/epics -name "EPIC-*.md" -exec grep -l "^# Epic {}" {} \;)
```

## Step 4 — Create Dev Prompt

Create `.planning/dev-sessions/{story-id}-dev-prompt.md`:

```bash
mkdir -p .planning/dev-sessions
DEV_PROMPT_FILE=".planning/dev-sessions/${STORY_ID}-dev-prompt.md"
```

Content:

```markdown
# Development Session: {Story title}

**Story ID:** {STORY_ID}

**Persona:** {Persona}

**Effort estimate:** {Size}

**Status:** Ready for development

---

## Story Context

{Full story text from STORY.md, sections:}

### User Story

{Action: "As a X, I want to Y so that Z"}

### Acceptance Criteria

{All criteria with checkboxes for AI to mark as they implement}

### Out of Scope

{What NOT to do}

### Dev Notes

{Technical approach, risks, dependencies, testing strategy}

---

## Project Context

**Project name:** {from PROJECT.md}

**Technology stack:** {from STACK.md or package.json}

**Relevant files for this story:**

{List of absolute paths that the coder should read/modify}

**Dependencies:**

{List stories/features that must be done first}

**How to test locally:**

{Commands to run tests, start dev server, etc.}

---

## Implementation Checklist

Before starting:
- [ ] Read project README and STACK.md
- [ ] Review existing tests for patterns
- [ ] List files you'll create/modify in PR description

During development:
- [ ] Implement acceptance criteria one by one
- [ ] Write tests alongside code
- [ ] No console.log left in production code
- [ ] Follow project commit conventions (see below)

After implementation:
- [ ] All acceptance criteria passing ✓
- [ ] All edge cases tested ✓
- [ ] Definition of Done checklist complete ✓
- [ ] Create PR with story summary ✓

---

## Commit Convention

When committing code for this story, use:

```
{type}({scope}): {description}

{optional body explaining why}
```

Example for this story:

```
feat(EPIC-01): {story-specific description}

{Why this change, what problem it solves}
```

See `.rihal/references/commit-conventions.md` for full rules.

---

## Definition of Done

This story is "Done" when all items in checklist-story-dod.md are checked:

- [ ] **Acceptance Criteria:** All {count} criteria tested and passing
- [ ] **Tests:** {unit tests, integration tests} written and passing
- [ ] **Code Quality:** No lint errors, follows project patterns
- [ ] **Commits:** Conventional Commits format, no AI attribution
- [ ] **Handoff:** Story summary written, no blockers

---

## Files to Create/Modify

{Based on story, explicit paths for:}

**Source files:**
- {path/to/file1}
- {path/to/file2}

**Test files:**
- {path/to/test1}
- {path/to/test2}

**Config/docs:**
- {path/to/config}

---

## Running This Story

To execute with an AI coder:

```bash
/rihal:code .planning/dev-sessions/{story-id}-dev-prompt.md
```

---

**Created:** {ISO date}

**Expected completion:** {date + effort estimate}

**Story summary template** (for PR after implementation):

```markdown
## Summary

Implemented {story title}.

### Acceptance Criteria Met

- ✓ Criterion 1
- ✓ Criterion 2
- ✓ Criterion 3

### Testing

Added {count} tests covering:
- Happy path
- Edge cases: {list}

### Changes

- {file1}: {what changed}
- {file2}: {what changed}
```
```

## Step 5 — Print Dev Session Summary

Print the dev prompt path and next steps:

```
🎯 Dev Session Ready

Story: {STORY_ID} — {Story title}
Persona: {Persona}
Effort: {Size}
Acceptance Criteria: {count}

Context file: {path to dev-prompt.md}

Next: /rihal:code {path to dev-prompt.md}

Or, continue the current session to:
  - Ask clarifying questions
  - Discuss edge cases
  - Review dependencies
```

## Step 6 — Optional: Spawn AI Coder

If user says "start coding" or "let's build", spawn the code execution workflow:

```bash
# User says "let's go" or "start", then:
/rihal:code "$DEV_PROMPT_FILE"
```

Otherwise, offer:

```
Ready to code this story?

/rihal:code {dev-prompt-file}
```

Stop and wait for user to proceed. Do NOT auto-spawn.

## Errors

- **Story file not found:** print error and exit
- **Story fails entry gate:** print failures and ask user to fix story file
- **Missing acceptance criteria:** cannot proceed; story is incomplete

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

