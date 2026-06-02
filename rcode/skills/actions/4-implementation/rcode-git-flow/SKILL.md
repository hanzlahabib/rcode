---
name: rcode-git-flow
internal: true
description: Branching, commits, conflicts, parallel work — aligned with the rcode Epic→Feature→Task hierarchy.
triggers:
  - "git flow"
  - "branching strategy"
  - "open a pr"
  - "merge conflict"
  - "rebase or merge"
  - "feature branch"
  - "commit policy"
  - "branch from main"
user-invocable: true
---
@.rcode/references/karpathy-guidelines.md


## Overview

The rcode git workflow: feature branches off main, Conventional Commits, PRs that close issues with `Closes #N`, no force-push to main, no AI attribution in commit messages. Aligned with the Epic→Feature→Task hierarchy in `GITHUB_WORKFLOW.md` so every branch traces back to an issue.

## Branching

- **`main`** — always green. CI must pass. Never force-pushed.
- **`feature/<short-slug>`** — branched from latest `main` for new work.
- **`fix/<issue-N>-<slug>`** — branched from `main` for bug fixes; one branch per issue.
- **`docs/<short-slug>`** — branched from `main` for doc-only changes.

Naming: kebab-case slug, ≤40 chars after the prefix.

## Commit policy

- **Conventional Commits:** `type(scope): subject`
- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `revert`
- **Scopes:** see `AGENTS.md` for the allow-list (`agents`, `skills`, `workflows`, `templates`, `dashboard`, `docs`, etc.)
- **Subject:** lowercase first letter, imperative mood, no trailing period, ≤72 chars
- **Body:** explain the WHY (the diff shows the WHAT)
- **Footer:** `Closes #N` for the issue this commit completes
- **Forbidden:** AI attribution lines (`Co-Authored-By: Claude`, "Generated with..."). User does not want this.
- **Forbidden:** `--no-verify` to skip hooks. Fix the underlying issue.
- **Forbidden:** `git add -A` or `git add .` without reading the staged set first.

## Workflow

1. **Sync.** `git pull --rebase origin main` before starting any new work.
2. **Branch.** `git checkout -b feature/<slug>` from latest main.
3. **Commit small.** One logical change per commit. Run tests before committing.
4. **Push the branch.** **`git push origin <branch>`** requires user authorization (see `AGENTS.md` push policy). Never push to main directly.
5. **Open the PR.** `gh pr create --base main --title "<conventional-commits subject>" --body "<body>"`. Body links the issue: `Closes #N`.
6. **Review cycle.** Address feedback as additional commits (don't rewrite history once the PR is open).
7. **Merge.** Squash-merge by default; preserve commit history only when the chain is meaningful (rare). After merge: `git checkout main && git pull && git branch -d <branch>`.

## Conflict resolution

1. Don't reflexively `git pull --rebase` mid-PR. First read both sides.
2. Use `git mergetool` or your IDE's conflict UI — manual `<<<<<<<` editing is error-prone.
3. After resolving: run the full test suite. Conflicts often hide behavioural overlaps the tests catch.
4. Commit message: `merge: resolve conflicts with main` (chore-type, no scope needed).

## Output Format

For a new feature:

```
Branch: feature/<slug>   (from latest main)
Issue: #N — <title>

Commit plan:
  1. <conventional commit subject>
  2. <conventional commit subject>
  ...

PR title: <type>(<scope>): <subject>
PR body footer: Closes #N

Push approval required at: branch push, PR open, post-review push (each separately).
```

Do NOT include: force-pushes to main; commits with AI attribution; bundled commits ("feat: do everything").

## Examples

**Happy path** — A tracked issue (refresh README counts) → branch `docs/readme-counts` → 1 commit with subject `docs(readme): refresh agent/command/skill counts and add MIGRATIONS link` → push → PR with `Closes` the tracked issue → squash-merge.

**Edge case — conflict on team.yaml** — Two branches both edit team.yaml. Resolve by: pull both versions, manually merge agent entries (preserve unique IDs), run `node --test test/agents-registry.test.cjs`, commit.

**Negative — pushing to main** — User asks "just push it to main". Refuse — feature branches + PRs are non-negotiable per `AGENTS.md`. Open a PR even for a one-line fix.

## Memory Bank Hooks

- **Reads:** `.rcode/memory/project/decisions.md` (so prior branching decisions are loaded)
- **Writes:** none directly — the skill drives git, not Memory Bank state
