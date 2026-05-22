---
phase: 8
plan_number: 3
title: phase-status drift detector — extends feature-drift with --mode=phase-status (#461)
wave: 2
depends_on: [8.2]
files_modified:
  - rcode/workflows/feature-drift.md
  - rcode/agents/rcode-docs-auditor.md
  - scripts/dogfood-check.sh
autonomous: true
sequential: false
requirements: [phase-8-status-drift]
---

<objective>
Closes #461. Detect drift between ROADMAP claim and shipping reality (phase status). Reuses `feature-drift` workflow with new `--mode=phase-status`. Mirrors the Phase 6 pattern of extending the docs-auditor agent rather than creating a new one.
</objective>

<must_haves>
- `feature-drift` workflow accepts `--mode=phase-status`
- Detector compares ROADMAP `**Status:**` line against shipping signals (SUMMARY.md, SPRINT.md, git log on phase scope)
- Severity tags: major (status fully wrong), partial (N/M acceptance items shipped), trivial (missing ✅ marker)
- `--fix` only patches trivial (✅ marker addition + missing date) — never auto-flips Active→Complete
- CI dogfood gate gains a phase-status alignment check
</must_haves>

<task id="8.3.1">
<title>Add --mode=phase-status to feature-drift workflow</title>
<read_first>
- rcode/workflows/feature-drift.md (extends existing parse_args + scan_drift)
- .planning/phases/8-auto-heal-cadence-hooks/8-CONTEXT.md (D-6, D-7, D-8, D-9)
</read_first>

<action>
Extend `feature-drift.md`'s parse_args step to read `--mode <feature|phase-status>` (default: feature). Add a new branch in scan_drift for phase-status mode that:
1. Reads ROADMAP.md via the now-fixed parser (post #464)
2. For each phase, checks SUMMARY.md presence + SPRINT.md presence + last commit on phase scope
3. Compares against ROADMAP `**Status:**` line
4. Emits findings with severity per CONTEXT.md D-8

Add severity-classify rules for phase-status mode: trivial = missing ✅, partial = mismatched-but-not-fully-wrong, major = entirely-incorrect-status.
</action>

<acceptance_criteria>
- File contains literal `--mode=phase-status` and `--mode <feature|phase-status>`
- File contains ROADMAP.md status comparison logic
- Severity rules per CONTEXT.md D-8 documented
</acceptance_criteria>
</task>

<task id="8.3.2">
<title>Add <mode_phase_status> section to rcode-docs-auditor</title>
<read_first>
- rcode/agents/rcode-docs-auditor.md (study the existing <mode_feature_drift> section as template)
</read_first>

<action>
Append a new `<mode_phase_status>` section to the docs-auditor agent, structurally parallel to `<mode_feature_drift>`. Inputs: roadmap_phases[], phase_dirs[]. Output: structured JSON with drift entries (phase_number, claimed_status, shipping_signals, evidence, severity, fix_hint). Hard severity rules per CONTEXT.md D-8.
</action>

<acceptance_criteria>
- File contains `<mode_phase_status>` literal
- Section parallels `<mode_feature_drift>` structure
- JSON schema documented with the literal field names from D-7
</acceptance_criteria>
</task>

<task id="8.3.3">
<title>Add phase-status check to dogfood-check.sh</title>
<read_first>
- scripts/dogfood-check.sh (Phase 9 baseline — extend without breaking)
</read_first>

<action>
Add a new check before the final summary: "phase-status alignment". For each phase in `state.phases`, verify that ROADMAP status claim matches disk artifacts. Report-only — fail the gate ONLY on major-severity drift (the kind that lies, e.g., "Complete" without a SUMMARY). Trivial drift (missing ✅) just warns.
</action>

<acceptance_criteria>
- scripts/dogfood-check.sh contains literal "phase-status" or "ROADMAP claim vs"
- Script still runs in <30s (this check should be <1s)
- npm run dogfood still exits 0 on the current repo state (no major drift expected)
</acceptance_criteria>
</task>
