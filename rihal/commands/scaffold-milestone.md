---
name: rihal-scaffold-milestone
description: Bulk-create all phase directories for a milestone from a pipe-separated name list or ROADMAP.md planned phases. Closes #731.
argument-hint: "--names \"Phase Name 1|Phase Name 2|...\" [--start N]"
allowed-tools: Read, Write, Bash, Glob, Grep
---

<objective>
Bulk-create phase folders for a milestone. Accepts pipe-separated phase names or reads unscaffolded phases from ROADMAP.md.
</objective>

<process>
## 1. Parse arguments

If `--names` is provided in $ARGUMENTS:
```bash
node ".rihal/bin/rihal-tools.cjs" phase scaffold-milestone --names "${NAMES_ARG}" ${START_ARG:+--start $START_ARG}
```
Print the result JSON and exit.

## 2. Auto-detect from ROADMAP.md (when no --names)

Read `.planning/ROADMAP.md`. Extract all phase entries that:
- Have a `**Status:** Planned` line
- Do NOT have a corresponding directory under `.planning/phases/`

Collect their names in order. Build a pipe-separated list and pass to scaffold-milestone:
```bash
PLANNED_NAMES="Phase A|Phase B|Phase C"
node ".rihal/bin/rihal-tools.cjs" phase scaffold-milestone --names "${PLANNED_NAMES}"
```

## 3. Report

Print a summary:
```
✓ Scaffolded {N} phase directories:
  {number}-{slug}/
  {number}-{slug}/
  ...

Next step: /rihal-plan {first_number}
```
</process>

## Output Format

One line per created phase directory. Final "Next step" routing.

## Examples

**With names:** `/rihal-scaffold-milestone --names "Auth System|Dashboard|API Layer"` → creates 3 phase dirs.

**Auto-detect:** `/rihal-scaffold-milestone` → reads ROADMAP.md, creates dirs for all Planned phases without existing directories.
