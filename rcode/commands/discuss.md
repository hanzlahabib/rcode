---
name: rcode-discuss
description: Quick sync with one rcode agent. Lighter than /rcode-council — one agent, no cross-talk, optional save.
argument-hint: "[agent-name] <question>"
allowed-tools:
  - Read
  - Bash
  - Agent
  - AskUserQuestion
---

<objective>
Quick sync with one rcode agent — lighter than council. One agent answers, no cross-talk, optional artifact save.
</objective>

<execution_context>
@.rcode/workflows/discuss.md
</execution_context>

<process>
Execute the discuss workflow from @.rcode/workflows/discuss.md end-to-end.
Identify the right agent from the question, spawn it, return focused answer.
</process>
