---
name: rcode-pr-branch
description: "Create a clean PR branch that strips all rcode planning artifacts (.planning/, SPRINT.md, SUMMARY.md, STATE.md). Reviewers see only code changes. Use before /rcode-ship when you want a clean git history in the PR."
argument-hint: "[<base-branch>]"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<objective>
Execute pr-branch workflow
</objective>

<execution_context>
@.rcode/workflows/pr-branch.md
</execution_context>

<process>
Execute the pr-branch workflow from @.rcode/workflows/pr-branch.md end-to-end.
</process>
