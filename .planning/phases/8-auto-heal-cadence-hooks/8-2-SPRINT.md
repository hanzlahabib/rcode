---
phase: 8
plan_number: 2
title: PostToolUse hook on docs edits — fires feature-drift --quick
wave: 1
depends_on: []
files_modified:
  - rihal/workflows/feature-drift.md
  - rihal/skills/core/rihal-enable-hooks/SKILL.md
  - docs/HOOKS-AUTO-HEAL.md
autonomous: true
sequential: false
requirements: [phase-8-hooks]
---

<objective>
Add `--quick` flag to feature-drift workflow + ship a PostToolUse hook installable via `/rihal:enable-hooks` that fires drift detection on doc edits.
</objective>

<must_haves>
- `feature-drift.md` accepts `--quick` flag (skips deep verifier loop, target <2s runtime)
- `--quick` mode never patches — always report-only regardless of other flags (safety: hooks must not auto-modify)
- New doc `docs/HOOKS-AUTO-HEAL.md` describes how the hook works + how to opt in
- `rihal/skills/core/rihal-enable-hooks/SKILL.md` (or equivalent) gains a section advertising the new hook (extend, don't replace)
</must_haves>

<task id="8.2.1">
<title>Add --quick flag to feature-drift workflow</title>
<read_first>
- rihal/workflows/feature-drift.md
- .planning/phases/8-auto-heal-cadence-hooks/8-CONTEXT.md (D-3, D-4)
</read_first>

<action>
In `rihal/workflows/feature-drift.md` parse_args step, add detection for `--quick`. In severity_classify step, document the safety rule: `--quick` mode forces report-only regardless of other flags. Add to guardrails: "QUICK_MODE always implies report-only — never patches even if --fix is also passed."
</action>

<acceptance_criteria>
- File contains `QUICK_MODE` literal
- File contains "report-only" safety rule for --quick
- File guardrails explicitly mention --quick + --fix interaction
</acceptance_criteria>
</task>

<task id="8.2.2">
<title>Write docs/HOOKS-AUTO-HEAL.md</title>
<read_first>
- .claude/settings.json (existing hook examples for reference shape)
</read_first>

<action>
Write a doc explaining the PostToolUse hook config + opt-in via `/rihal:enable-hooks`. Include the literal `.claude/settings.json` JSON block users can paste, the file-pattern matchers (docs/, prd/, epics/, stories/, .planning/), and the safety promise that `--quick` never modifies files.
</action>

<acceptance_criteria>
- File `docs/HOOKS-AUTO-HEAL.md` exists
- Contains a `.claude/settings.json` JSON block
- Contains literal phrase "report-only" or "never modifies"
- Lists the file patterns that trigger the hook
</acceptance_criteria>
</task>
