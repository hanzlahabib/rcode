---
name: rcode-plan-milestone-gaps
description: "Create the phases needed to close gaps found by /rcode-audit-milestone (reads MILESTONE-AUDIT.md)."
argument-hint: ""
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, Agent
---

<objective>
Create all phases necessary to close gaps identified by `/rcode-audit-milestone`. Reads MILESTONE-AUDIT.md, groups gaps 
</objective>

<execution_context>
@.rcode/workflows/plan-milestone-gaps.md
</execution_context>

<process>
Execute the plan-milestone-gaps workflow from @.rcode/workflows/plan-milestone-gaps.md end-to-end.
</process>
