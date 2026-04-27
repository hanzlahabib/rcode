---
name: rihal-incremental
description: Ship code in small, atomic, verifiable steps. Use when implementing any feature, fixing any bug, or refactoring any module. Forces one logical change per commit, build-and-test gate after each step, and a rollback-ready trail. Pairs with rihal-prove-it (TDD) and rihal-code-review.
triggers:
  - "ship incrementally"
  - "atomic commits"
  - "small steps"
  - "step by step build"
  - "incremental implementation"
  - "one commit at a time"
  - "build verifiably"
  - "rollback ready"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

Treats every change as a sequence of small, verifiable steps that compile, pass tests, and revert cleanly. The unit isn't "the feature" — it's "the next 30 lines that still leave the build green." This is how rcode itself was reshaped (see `.rihal/memory/project/decisions.md`).

## Workflow

1. **Decompose first.** Before touching code, list the steps as a numbered checklist. Each step must end with the codebase still building and tests still passing.
2. **One logical change per commit.** No bundled refactors. If you find yourself writing "and also" in the commit subject, split it.
3. **Verify after each step.** Run the targeted test, the type-check, the linter — whatever the project gates require — before moving on.
4. **Commit with intent.** Conventional Commits format (`type(scope): subject`); subject describes the WHY, not the WHAT (the diff already shows the what).
5. **Pause at logical milestones.** After every 3–5 commits, ask whether to push, get review, or continue locally.
6. **Revert is the first option, not the last.** If a step goes sideways, `git revert <sha>` and try a different decomposition. Never accumulate broken state.

## Output Format

For each implementation request, return:
- **Step plan** — numbered checklist with one-line scope per step
- **Per-step commit messages** drafted in Conventional Commits format
- **Verification command** the agent will run after each step
- **Rollback note** for each step (what `git revert` undoes)

Do NOT include: bundled diffs, "and also" steps, or commits without verification.

## Examples

**Happy path** — "Add dark mode to dashboard" → 5-step plan: (1) extract colour tokens to CSS vars, (2) add theme state + localStorage, (3) wire `data-theme` on `<html>`, (4) add toggle button, (5) screenshot regression. Each step compiles + tests pass.

**Edge case — refactor that touches 30 files** — Decompose into directory-by-directory commits. If a single commit must touch many files (e.g. an alias rename), state that in the plan and verify the codebase still parses afterwards.

**Negative — speculative future cleanup** — "Refactor the whole auth layer" without a current task driving it. Refuse. Pair this skill with a real bug fix or feature; otherwise it becomes scope creep.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/project/decisions.md` (so context for "why this approach" is loaded)
- **Writes:** append to `.rihal/memory/project/decisions.md` when a step encodes a non-obvious choice
