---
name: rihal-ship
description: "After a phase is verified, create a PR: push branch, auto-generate PR body from planning artifacts (ROADMAP, VERIFICATION, SUMMARY), and optionally request review. Closes the plan→execute→verify→ship loop."
argument-hint: "[<phase>] [--draft]"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<objective>
Ship a completed, verified phase by pushing its feature branch and opening a
pull request with an auto-generated body drawn from planning artifacts.

**When to use:**
- You have finished `/rihal-execute <phase>` and `/rihal-verify-phase <phase>` passed
- You want to open a PR from your feature branch into main/develop
- You want the PR body auto-filled with phase goal, changes, requirements addressed, and verification status

**When NOT to use:**
- Publishing a package to npm → use `npm publish` directly
- Tagging a release → use `git tag` + `git push --tags`
- You are inside the rihal-code framework repo itself (no phases exist here)
- Your project uses `git.branching_strategy: none` and you commit directly to main
</objective>

<execution_context>
@.rihal/workflows/ship.md
</execution_context>

<process>
Execute the ship workflow from @.rihal/workflows/ship.md end-to-end.
</process>
