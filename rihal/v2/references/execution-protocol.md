# Rihal Execution Protocol

Shared reference `@`-included by `execute.md` workflow and `rihal-executor` subagent.

## PLAN.md schema

Every plan file must have this frontmatter and structure:

```markdown
---
phase: 01-project-setup
plan: "01"
type: auto
depends_on: []
---

## Objective
One sentence describing what this plan achieves.

## Success criteria
- [ ] Specific, verifiable outcome

## Tasks

### Task 1 — name
type: auto
**Steps:**
1. ...
**Done when:** specific, observable condition
**Commit:** feat(scope): description

### Task 2 — name
type: checkpoint:human-verify
**Verify:** what the human must confirm before continuing
```

**Task types:**
- `auto` — executor runs without pausing
- `checkpoint:human-verify` — executor stops, prints return format, waits for human
- `checkpoint:decision` — executor stopped itself due to a deviation requiring architectural choice

## Deviation rules

When the executor encounters something unexpected:

1. **Bug in the task itself** → fix it, continue, note in SUMMARY
2. **Missing critical dependency** (file, package, env var) → add it, continue, note in SUMMARY
3. **Blocking issue not in the plan** → fix the blocker, continue, note in SUMMARY
4. **Architectural change required** (the plan's approach is fundamentally wrong) → STOP, return `checkpoint:decision` with the options

Rules 1-3 are auto. Rule 4 always pauses for human decision.

## Analysis paralysis guard

If the executor has made 5+ Read/Grep/Glob calls without a Write, Edit, or Bash that changes state — STOP. Write what you have so far, commit, and continue from the next task. Do not read more before acting.

## Checkpoint return format

When an executor hits a checkpoint, it returns exactly this block and stops:

```
---CHECKPOINT REACHED---
Plan: {plan file path}
Task: {task name}
Type: {human-verify | decision}

{For human-verify:}
Please verify: {what to check}
URL/path: {where to look}
Resume with: /rihal:execute {plan} --continue

{For decision:}
Problem: {what the plan assumed that isn't true}
Option A: {approach} — {trade-off}
Option B: {approach} — {trade-off}
Recommendation: {which one and why}
Resume with: /rihal:execute {plan} --continue --option=A
---
```

## Commit protocol

After every completed `auto` task:

1. `git status --short` — confirm only expected files changed
2. Stage specific files: `git add path/to/file` — never `git add -A`
3. Commit: `type(scope): description` (Conventional Commits)
4. Record the SHA in the SUMMARY

**Never add:** `Co-Authored-By: Claude`, `Generated with Claude Code`, or any AI attribution.
**Never use:** `--no-verify`.

## SUMMARY format

Written to `{plan-dir}/{plan-name}-SUMMARY.md` after completion:

```markdown
# Plan Summary — {plan name}

**Status:** complete | partial
**Duration:** {start} → {end}
**Commits:** {count}

## Tasks
- [x] Task 1 — {commit SHA}
- [x] Task 2 — {commit SHA}
- [ ] Task 3 — SKIPPED: {reason}

## Deviations
- {deviation description} → {rule applied} → {resolution}

## Next
{first task of the next plan, if known}
```
