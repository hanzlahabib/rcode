---
name: rcode-lens-audit
triggers:
  - rcode-lens-audit
  - lens audit
  - lens audit karo
  - run lens audit
  - audit with lens
  - audit lens
  - specific lens audit
  - run security lens
  - run performance lens
  - run testability lens
  - run all lenses
  - 15 lens audit
not-for:
  - phase audit (use /rcode-audit phase)
  - milestone audit (use /rcode-audit milestone)
  - karpathy audit without lens context (use /rcode-review --karpathy)
description: Run a structured 15-lens code audit. Picks one lens or all 15 sequentially. Prints findings and ready-to-paste GitHub issue bodies. Never auto-fixes — audit-first.
argument-hint: "[<1-15> | <lens-name> | all]"
allowed-tools: Read, Write, Bash, AskUserQuestion
---

## Overview

15-lens audit entry point. Each lens is an independent inspection angle:
security, performance, testability, extensibility, dep-health, error-recovery,
state-machine, i18n, documentation, cross-platform, karpathy, sxo,
observability, naming, coverage.

Runs the selected lens(es), prints labelled findings, outputs GH issue bodies
for each lens with findings. Never modifies files — audit-first, fix-second.

## Workflow

@.rcode/workflows/lens-audit.md

## Output Format

Per-lens labelled finding blocks, then a summary banner with counts, then
foldable GitHub issue bodies ready to copy-paste or pipe to `gh issue create`.

## Examples

**Happy path — interactive:**
```
/rcode-lens-audit
→ shows lens picker, user selects 1 (security)
→ runs security lens, prints findings, prints GH issue body
```

**Happy path — direct:**
```
/rcode-lens-audit security
/rcode-lens-audit 3
/rcode-lens-audit all
```

**Edge — no findings:**
```
/rcode-lens-audit 5
→ ✓ Lens 5 (dep-health): no findings
```

**Negative — wrong lens number:**
```
/rcode-lens-audit 99
→ Error: lens must be 1-15 or a lens name. Run /rcode-lens-audit --help.
```
