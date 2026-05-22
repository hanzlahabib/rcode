---
name: rcode-memory-audit
description: >
  Audit the Memory Bank for stale entries, contradictions, missing sections,
  and content that should be archived. Produces a report with severity-tagged
  findings and one-line fix suggestions. Activates when the user says
  "audit memory bank", "check memory bank", "/rcode-memory-audit",
  "memory bank ka audit", "find stale entries", "is my memory bank healthy".
  Optional --fix flag patches trivial items (typos, stale dates, broken paths)
  atomically; non-trivial findings always report-only.
  Do NOT use for: bootstrap (use rcode-memory-init), surgical updates
  (use rcode-memory-update), or distillate regeneration (use rcode-memory-distill).
triggers:
  # English
  - "audit memory bank"
  - "check memory bank"
  - "find stale entries"
  - "is my memory bank healthy"
  - "auto-fix memory bank"
  - "memory bank --fix"
  - "patch trivial memory drift"
  - "/rcode-memory-audit"
  - "/rcode-memory-audit"
  # Roman Urdu / Hindi
  - "memory bank ka audit"
  - "memory bank ka --fix"
  - "memory check karo"
  - "purani entries dhoondo"
  # Arabic native
  - "افحص بنك الذاكرة"
  - "تدقيق الذاكرة"
  - "ابحث عن إدخالات قديمة"
  - "هل بنك الذاكرة سليم"
  - "أصلح الذاكرة"
user-invocable: false
---
@.rcode/references/karpathy-guidelines.md


## Overview

Walks the Memory Bank and reports problems. Stale entries (referencing milestones that ended), contradictions (decisions log says X, stack file says Y), missing sections (template placeholders never filled), and content that should be archived (resolved issues lingering in `known-issues.md`). Read-only — never modifies files. Produces a fix list the user can act on with `rcode-memory-update`.

## Workflow

1. **Walk the Memory Bank.** List every file and section.
2. **Run six checks** (see Output Format) and collect findings.
3. **Tag severity** per finding: `critical` (broken reference), `warn` (stale or contradictory), `info` (template placeholder still present).
4. **Group findings by file**, sorted by severity descending.
5. **Print report.** No file changes.

## The six checks

1. **Stale milestone** — `milestones/current.md` references a milestone whose target close date has passed by ≥30 days
2. **Resolved issues lingering** — `incidents/known-issues.md` entry has a "Real fix planned for" milestone that has completed
3. **Template placeholders unfilled** — files still contain `{{PLACEHOLDER}}` patterns or `_(e.g. ...)_` italicised hints from templates
4. **Stack vs decisions contradiction** — a decision in `decisions.md` references a stack item that doesn't appear in `stack.md`
5. **Empty subdirectories** — `change-records/`, `incidents/post-mortems/`, `milestones/archive/` contain only `.gitkeep`
6. **Distillate freshness** — `distillates/*.distillate.md` `source-digest` does not match current source files

## Output Format

```
Memory Bank Audit — 2026-04-26
================================

CRITICAL (1)
  project/decisions.md
    └─ Decision "Switch to Postgres 16" references stack.md row that doesn't exist
       Fix: update project/stack.md Runtime → Database to "Postgres 16.x"

WARN (3)
  milestones/current.md
    └─ Milestone target close was 2026-02-01 (84 days ago) but file still says "active"
       Fix: archive via /rcode-memory-update or move to milestones/archive/

  incidents/known-issues.md
    └─ Issue "SSO Safari 16 fails" — real fix was planned for M2 (closed)
       Fix: verify and remove, or move to post-mortems/

  distillates/project.distillate.md
    └─ Source digest stale — 4 source files modified since last regenerate
       Fix: /rcode-memory-distill

INFO (2)
  project/glossary.md
    └─ Empty — no terms recorded yet
  people/team.md
    └─ Coverage table contains 3 unfilled cells
       Fix: /rcode-memory-update with team coverage info
```

## Examples

**Healthy bank**
Output: `✓ Memory Bank is healthy. 0 findings.`

**Stale milestone + unfilled glossary**
Output: lists 2 findings, severity warn + info, suggests fixes per finding.

**Negative — used to fix problems**
This skill only reports. Fixes happen via `rcode-memory-update`, manual edits, or `rcode-memory-distill`. Do not invoke this skill expecting auto-fix.

## Memory Bank Hooks

- **Reads:** every file under `.rcode/memory/`
- **Writes:** nothing — strictly read-only
