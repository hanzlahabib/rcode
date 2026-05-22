---
name: rcode-validate-phase
description: Audit Nyquist validation gaps for a completed phase. Generate missing tests. Update VALIDATION.md.
argument-hint: "<phase-number>"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, Agent
---

<objective>
Audit Nyquist validation gaps for a completed phase. Generate missing tests. Update VALIDATION.md.
</objective>

<execution_context>
@.rcode/workflows/validate-phase.md
</execution_context>

<process>
Execute the validate-phase workflow from @.rcode/workflows/validate-phase.md end-to-end.
</process>
