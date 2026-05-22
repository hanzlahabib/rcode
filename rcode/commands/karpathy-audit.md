---
name: rcode-karpathy-audit
description: Audit source code changes against Andrej Karpathy's 4 LLM coding principles. Flags unclear assumptions, overengineering, surgical violations, and stubs.
argument-hint: "[--files <glob>] [--since <commit>]"
allowed-tools: Read, Bash, Glob, Grep
---

<objective>
Audit code changes against Karpathy's 4 principles and return structured findings with severity and fix guidance.
</objective>

<execution_context>
@.rcode/workflows/karpathy-audit.md
</execution_context>

<process>
Execute the karpathy-audit workflow from @.rcode/workflows/karpathy-audit.md end-to-end.
</process>
