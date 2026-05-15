---
phase: 8
plan_number: 1
title: cadence docs — recommended schedules for auto-heal tools
wave: 1
depends_on: []
files_modified:
  - docs/AUTO-HEAL-CADENCE.md
  - README.md
autonomous: true
sequential: false
requirements: [phase-8-cadence]
---

<objective>
Ship `docs/AUTO-HEAL-CADENCE.md` — recommended schedules for `/rihal-health`, `/rihal-feature-drift`, `/rihal-memory-audit`, `/rihal-phase-status-drift`. Include both `/loop` invocations (for in-session use) and crontab entries (for ops-side scheduling). Linked from README.
</objective>

<must_haves>
- File `docs/AUTO-HEAL-CADENCE.md` exists with a recommended-cadence table per tool
- Both `/loop` examples + crontab examples shown
- README has a link to the new doc under an "Auto-heal" section
- No new infra — this is documentation only
</must_haves>

<task id="8.1.1">
<title>Write docs/AUTO-HEAL-CADENCE.md</title>
<read_first>
- rihal/workflows/feature-drift.md (just shipped)
- rihal/workflows/memory-audit.md (Phase 6 extended)
- rihal/workflows/health.md
- rihal/skills/core/loop/SKILL.md (if present) — for /loop syntax
</read_first>

<action>
Write `docs/AUTO-HEAL-CADENCE.md` with a recommended schedule table, /loop examples, and crontab examples. Doc must include explicit guidance on which tools auto-fix vs report-only, and the safety rule that `--fix` modes never run unsupervised (in CI / hook contexts they always require explicit opt-in).
</action>

<acceptance_criteria>
- File `docs/AUTO-HEAL-CADENCE.md` exists
- Contains a recommended-cadence table with 4+ rows
- Contains both `/loop` examples and crontab examples
- Contains an explicit "auto-fix safety" section
</acceptance_criteria>
</task>

<task id="8.1.2">
<title>Link cadence doc from README</title>
<read_first>
- README.md (find existing structure for adding a section)
</read_first>

<action>
Add a small "Auto-heal" section to README pointing at `docs/AUTO-HEAL-CADENCE.md`. Place it near the existing "Auto-heal tools" reference if one exists, otherwise near the end before footer.
</action>

<acceptance_criteria>
- README.md contains literal `docs/AUTO-HEAL-CADENCE.md` reference
- README.md has a heading containing "Auto-heal" or "Cadence"
</acceptance_criteria>
</task>
