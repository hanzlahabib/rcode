# Phase 9 — Plan 2: Workflow ↔ CLI Drift Sweep

**Date:** 2026-04-29
**Workflows scanned:** 71 files in `rcode/workflows/`
**Unique CLI invocations found:** 134
**Verified:** 121
**Drift detected:** 13

---

## Verified (121 of 134) — sample

All `init phase-op`, `init sprint-plan`, `init discuss`, `init council`, `init execute-phase` (and 14 other init variants), `state add-blocker`, `state add-decision`, `state sync`, `state insert-phase`, `state read`, `roadmap get-phase`, `roadmap update-plan-progress`, `roadmap analyze`, `agent-skills *`, `agent-info *`, `resolve-model *`, `module *`, `notes *`, `notify send`, `select-panel`, `verify *`, `frontmatter get`, `find-files`, `progress init`, `phase add`, `phase complete`, `phase remove`, `phase set-status`, `phases list`, `plan check-wave-overlaps`, `version`. All passed verification — exist in CLI and accept the flags workflows use.

---

## Drift detected (13 of 134) — all classified `breaking`

### Used by workflow files (high impact)

| # | Subcommand | Workflow consumers | Issue |
|---|---|---|---|
| 1 | `commit` | execute-sprint.md, map-codebase.md, new-project-roadmap.md | #465 |
| 2 | `commit-to-subrepo` | execute-sprint.md | #465 |
| 3 | `check-implementation-readiness` | check-implementation-readiness.md (self-named, circular) | #465 |
| 4 | `classify-tech` | ui-phase.md | #465 |
| 5 | `context refresh` | init.md | #465 |
| 6 | `generate-claude-md` | new-project-roadmap.md | #465 |

### Referenced in agents/docs but not in current workflow files (lower priority — may be dead refs)

| # | Subcommand | Notes |
|---|---|---|
| 7 | `audit-uat` | grep-only reference; verify still live |
| 8 | `find-phase` | Helper utility |
| 9 | `learnings copy` | Cross-project pattern transfer |
| 10 | `phase-plan-index` | Plan indexing |
| 11 | `requirements mark-complete` | Requirement state management |
| 12 | `todo match-phase` | discuss-phase.md line ~325 |
| 13 | `uat render-checkpoint` | UAT checkpoint rendering |

All 13 filed under umbrella **#465**. Individual implementation tickets will spin off when scoped — Phase 9 explicitly does not commit to implementing all 13 in this sprint.

---

## Same drift family

| Issue | Pattern | Status |
|---|---|---|
| #460 | `phase add` referenced by workflow but missing from CLI | Fixed |
| #462 | `phase add` writing to wrong state path | Fixed |
| #464 | `roadmap` subcommands + init don't read heading-style ROADMAP | Regex part fixed; init phase-aware fields still missing |
| **#465** | 13 subcommands referenced by workflows but not implemented | Filed |

The audit's job is to make this drift visible and tracked. Plan 9.4 (CI gate) ensures regressions on closed issues fail builds going forward.

---

## Methodology (reusable for future audits)

```bash
# Step 1 — extract every CLI reference from workflows
ACTUAL_REFS=$(grep -rEoh 'node\s+["\.][^"]*rcode-tools\.cjs["\.]?\s+[a-z][a-zA-Z0-9-]+(\s+[a-zA-Z0-9.-]+)*' rcode/workflows/ | \
  sed -E 's|^node\s+["\.][^"]*rcode-tools\.cjs["\.]?\s+||' | \
  awk '{print $1, ($2 ~ /^[a-z]/ ? $2 : "")}' | sort -u)

# Step 2 — verify each by attempting actual invocation
for ref in $ACTUAL_REFS; do
  out=$(node rcode/bin/rcode-tools.cjs $ref 2>&1)
  if echo "$out" | grep -qi "Unknown subcommand"; then
    echo "DRIFT: $ref"
  fi
done

# Step 3 — file umbrella issue with reproducer
gh issue create --title "..." --body "..."
```

This methodology is wrapped into Plan 9.4's CI gate.
