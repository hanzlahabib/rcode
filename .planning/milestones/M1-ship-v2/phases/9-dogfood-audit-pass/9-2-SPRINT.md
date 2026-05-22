---
phase: 9
plan_number: 2
title: workflow-vs-CLI drift sweep — verify every CLI invocation in every workflow
wave: 1
depends_on: []
files_modified:
  - .planning/phases/9-dogfood-audit-pass/DRIFT-SWEEP.md
autonomous: true
sequential: false
requirements: [phase-9-drift]
---

<objective>
Catch the #460 / #462 pattern systematically. Every workflow .md under `rcode/workflows/` references `rcode-tools.cjs` subcommands. We need to verify each referenced subcommand actually exists in the CLI and matches the shape the workflow assumes.
</objective>

<must_haves>
- Single artifact: `.planning/phases/9-dogfood-audit-pass/DRIFT-SWEEP.md`
- Enumerates every `rcode-tools.cjs <subcommand>` reference across all workflows
- Tags each as "verified" / "drift detected — severity X"
- Issues filed for breaking + shape drift; report links them
</must_haves>

<task id="9.2.1">
<title>Extract every CLI invocation reference from rcode/workflows/*.md</title>
<read_first>
- (Discovery — list all .md files in rcode/workflows/)
</read_first>

<action>
Run:

```bash
grep -rEn 'rcode-tools\.cjs[^"`'\'']+' rcode/workflows/ | \
  sed -E 's|.*rcode-tools\.cjs[[:space:]]+([^"`'\'' ]+).*|\1|' | \
  sort -u
```

This yields a list of every subcommand chain referenced by any workflow (e.g., `init phase-op`, `state sync --from-disk`, `state set-phase`, `phase add`, `roadmap get-phase`, etc.).

Save the raw list to a temp var. Cross-reference against the `help` output:

```bash
node rcode/bin/rcode-tools.cjs help
```

For each referenced subcommand, classify:
- **verified** — appears in help output, accepts the flags the workflow uses
- **shape drift** — exists but flags differ (e.g., workflow passes `--phase` but CLI expects `--number`)
- **breaking drift** — subcommand doesn't exist in help output

Write findings to DRIFT-SWEEP.md:

```markdown
# Workflow ↔ CLI Drift Sweep

**Date:** 2026-04-29
**Workflows scanned:** {count}
**CLI references found:** {count}

## Verified ({n})

| Subcommand | Referenced in | Status |
|---|---|---|
| `state sync --from-disk` | feature-drift.md, do.md | ✓ |
| `phase add <name>` | add-phase.md | ✓ (post-#460) |
| ... | | |

## Shape drift ({n})

| Subcommand | Referenced in | Issue | Mismatch |
|---|---|---|---|
| ... | | #NNN | flag X expected, Y observed |

## Breaking drift ({n})

| Subcommand | Referenced in | Issue | Notes |
|---|---|---|---|
| ... | | #NNN | subcommand absent from help |
```

If the sweep finds zero drift: report "Clean run — all {N} CLI references resolve correctly." This is itself meaningful evidence the audit is closing the gap.
</action>

<acceptance_criteria>
- File `.planning/phases/9-dogfood-audit-pass/DRIFT-SWEEP.md` exists
- Contains the three tables: Verified / Shape drift / Breaking drift
- Every row maps to a real `rcode-tools.cjs` invocation found in a workflow
- Total count math adds up (verified + shape + breaking = all references)
</acceptance_criteria>
</task>

<task id="9.2.2">
<title>File issues for shape + breaking drift; close gap-loop</title>
<read_first>
- .planning/phases/9-dogfood-audit-pass/DRIFT-SWEEP.md (after 9.2.1 written)
</read_first>

<action>
For each row in "Shape drift" or "Breaking drift" table:

```bash
gh issue create --title "fix(workflows): <workflow>.md references non-existent CLI invocation '<subcmd>'" --body "..."
```

Body must include the exact workflow filename + line number, the failing CLI invocation, and the help output proving the subcommand is missing or shape-mismatched.

Update DRIFT-SWEEP.md tables with the issue numbers in the "Issue" column.

If zero drift: explicitly state at the bottom of the report: "All {N} CLI references verified. Closing gap that produced #460 + #462."
</action>

<acceptance_criteria>
- Every Shape/Breaking row has a populated `#NNN` Issue column
- Report footer either lists filed issues OR states "Clean run"
- No silent fixes
</acceptance_criteria>
</task>
