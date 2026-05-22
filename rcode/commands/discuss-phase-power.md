---
name: rcode-discuss-phase-power
description: Power user mode for discuss-phase. Generates all questions upfront into a JSON state file and HTML companion UI, then processes all answers in one pass to produce CONTEXT.md.
argument-hint: "<phase-number>"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

<objective>
Power mode discuss-phase: batch all questions upfront, collect answers at user's pace, produce CONTEXT.md in one processing pass.
</objective>

<execution_context>
@.rcode/workflows/discuss-phase-power.md
</execution_context>

<process>
Execute the discuss-phase-power workflow from @.rcode/workflows/discuss-phase-power.md end-to-end.
</process>
