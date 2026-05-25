<purpose>
Bulk-create all phase directories for a milestone from a pipe-separated name list or from ROADMAP.md planned phases. Closes #731.
</purpose>

<process>

## 1. Parse arguments

If `--names` is provided in `$ARGUMENTS`:

```bash
node ".rcode/bin/rcode-tools.cjs" phase scaffold-milestone --names "${NAMES_ARG}" ${START_ARG:+--start $START_ARG}
```

Print the result JSON and exit.

## 2. Auto-detect from ROADMAP.md (when no --names)

Read `.planning/ROADMAP.md`. Extract all phase entries that:

- Have a `**Status:** Planned` line
- Do NOT have a corresponding directory under `.planning/phases/`

Collect their names in order. Build a pipe-separated list and pass to scaffold-milestone:

```bash
PLANNED_NAMES="Phase A|Phase B|Phase C"
node ".rcode/bin/rcode-tools.cjs" phase scaffold-milestone --names "${PLANNED_NAMES}"
```

## 3. Report

Print a summary:

```
✓ Scaffolded {N} phase directories:
  {number}-{slug}/
  {number}-{slug}/
  ...

Next step: /rcode-plan {first_number}
```

</process>

## Output Format

One line per created phase directory. Final "Next step" routing.

## Examples

**With names:** `/rcode-scaffold-milestone --names "Auth System|Dashboard|API Layer"` → creates 3 phase dirs.

**Auto-detect:** `/rcode-scaffold-milestone` → reads ROADMAP.md, creates dirs for all Planned phases without existing directories.

## Success Criteria

- [ ] Phase directories created under `.planning/phases/`
- [ ] Summary printed with one line per created directory
- [ ] Next-step routing printed

## Next Up

- `/rcode-plan-milestone` — plan all the scaffolded phases
- `/rcode-discuss-phase` — discuss the first phase before planning
