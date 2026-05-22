# Git Preflight Contract

Shared reference `@`-included by every code-touching workflow. Designed by Khalid (DevOps) to close #659.

## When this runs

Before ANY workflow step that will modify files in the working tree — i.e. before `/rihal-execute`, `/rihal-quick`, `/rihal-dev-story`, `/rihal-code-review-fix`, and any other workflow that writes outside `.planning/`.

## The 4 checks

Run these read-only commands in order. Any failure halts the workflow with the failure banner below.

```bash
# Check 1: working tree clean
DIRTY=$(git status --porcelain 2>/dev/null)

# Check 2: not on a protected branch
BRANCH=$(git branch --show-current 2>/dev/null)
PROTECTED="main master develop v2-prototype"

# Check 3: branch follows naming convention
# Allowed: feat/foo-bar, fix/123-baz, issue-123-name, task-123-slug
BRANCH_OK=$(echo "$BRANCH" | grep -qE '^((feat|fix|docs|chore|refactor|test|perf|style|build|ci)/[a-z0-9][a-z0-9-]*|(issue|task)-[0-9]+-[a-z0-9-]+)$' && echo yes || echo no)

# Check 4: scope drift — files touched that don't belong to the active task
# The workflow MUST pass $TASK_SCOPE_GLOB (e.g. ".planning/phases/8-*/" or "src/auth/")
# If the workflow can't compute scope, skip this check rather than fail closed.
if [ -n "$TASK_SCOPE_GLOB" ]; then
  OUT_OF_SCOPE=$(git diff --name-only HEAD 2>/dev/null | grep -vE "$TASK_SCOPE_GLOB" | head -10)
fi
```

## Failure conditions

The workflow MUST stop and print the banner below if ANY of:

- `DIRTY` is non-empty AND user did not pass `--allow-dirty`
- `BRANCH` is in `$PROTECTED` AND user did not pass `--on-main`
- `BRANCH_OK` is `no` AND user did not pass `--allow-dirty` (branch-name lint is advisory if working tree is dirty AND user accepted the dirty override)
- `OUT_OF_SCOPE` is non-empty AND user did not pass `--allow-scope-drift`

## Failure UX (banner)

```
Khalid (خالد) — DevOps preflight

Cannot start {workflow_name}. Git state is unsafe.

  Branch:        {BRANCH}              {protected? "(protected)" : ""}
  Working tree:  {dirty/clean}         {N modified, M untracked if dirty}
  Branch name:   {BRANCH_OK ? "ok" : "doesn't match convention"}
  Scope drift:   {N files outside task scope}

  {if dirty: list up to 5 modified files}
  {if scope drift: list up to 5 out-of-scope files}

Fix path:
  1. git checkout -b fix/<issue-num>-<short-slug>
  2. git add <files> ; git commit -m "fix(scope): subject (#<issue>)"
  3. Re-run /{workflow_name}

Override (last resort, only if you understand the trade-off):
  /{workflow_name} {args} --allow-dirty       # skip working-tree check
  /{workflow_name} {args} --on-main           # skip protected-branch check
  /{workflow_name} {args} --allow-scope-drift # skip scope-drift check

▶ Next Up
  Clean the tree or branch, then resume. Khalid does not gate hotfixes —
  if this is a true emergency, --on-main is the right answer.
```

## Post-task commit prompt

After the workflow's code-modifying work completes, BEFORE returning control to the user, prompt for a commit:

```
Khalid — commit checkpoint

Modified files (staged or unstaged):
  [list git status --short output, grouped by logical unit if possible]

A commit is required before this workflow can be considered done.

GH issue link required per AGENTS.md. What issue does this work close?
  Issue # (digits only, or "none" if this is exploratory): ___

Suggested commit (Conventional Commits):
  {type}({scope}): {subject} (#{issue})

  {body — optional, explain WHY}

Run `git add <files> && git commit` with the message above, or edit before
running. AGENTS.md forbids --no-verify; if a hook fails, fix the underlying
cause.
```

The hook only stages and commits. **It does NOT push.** Push always requires fresh user consent per `.rihal/references/no-unauthorized-git-ops.md`.

## Override flag semantics

| Flag | Skips | When valid |
|------|-------|------------|
| `--allow-dirty` | working-tree clean check | resuming a partial in-progress task, or amending a WIP commit |
| `--on-main` | protected-branch check | true hotfix where the user accepts the risk; CI / release flows |
| `--allow-scope-drift` | scope drift check | refactor that legitimately spans phases; cross-cutting cleanup |

Each flag is independent. The user must pass exactly the override they need; the workflow MUST NOT auto-promote one override into another.

## What this does NOT do

- Does not run `git fetch` / `git pull` — those are remote operations and need explicit consent (see `no-unauthorized-git-ops.md`).
- Does not create branches automatically. The failure banner *suggests* the branch name; the user runs the command.
- Does not block read-only workflows (`/rihal-status`, `/rihal-discuss`, `/rihal-council`, etc.).

## Why a shared reference

Same shape as `no-unauthorized-git-ops.md`: a pre-condition contract that every workflow includes by `@`-reference. Single source of truth — when the policy changes, exactly one file changes and every code-touching workflow inherits the update.
