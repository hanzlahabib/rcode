---
name: rcode-verify-phase
description: "Goal-backward audit — does the codebase actually deliver what the phase promised? Produces VERIFICATION.md with pass/fail. Required before /rcode-ship. Run after /rcode-execute completes."
argument-hint: "<phase-number>"
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion, Agent
---

<objective>
Verify phase goal achievement through goal-backward analysis. Check that the codebase delivers what the phase promised, 
</objective>

<execution_context>
@.rcode/workflows/verify-phase.md
</execution_context>

<process>
Execute the verify-phase workflow from @.rcode/workflows/verify-phase.md end-to-end.
</process>
