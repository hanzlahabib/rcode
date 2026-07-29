---
phase: 45-audit-remediation-fix-findings-from-6-lens-critical-audit-issues-981-1001
plan_number: 2
wave: 1
depends_on: []
autonomous: true
files_modified:
  - rcode/agents/rules/verifier/verification-report.md
  - cli/lib/config.cjs
  - rcode/brain/best-practices/state-sync-rule.md
  - rcode/skills/_shared/state-sync-rule.md
  - rcode/skills/agents/hussain-sm/SKILL.md
  - rcode/skills/agents/hussain-pm/SKILL.md
  - rcode/templates/github/epic-template.md
  - rcode/templates/github/feature-template.md
  - rcode/templates/github/task-template.md
requirements: []
must_haves:
  truths:
    - rcode/agents/rules/verifier/verification-report.md tells the verifier to write VERIFICATION.md under .planning/phases/, not the dead .rcode/phases/ path
    - cli/lib/config.cjs's planning_artifacts default is .planning/phases, not .rcode/phases
    - state-sync-rule.md (both the brain copy and the _shared copy), hussain-sm/SKILL.md, hussain-pm/SKILL.md, and the 3 github issue templates contain zero remaining literal .rcode/phases references
  artifacts:
    - rcode/agents/rules/verifier/verification-report.md — corrected write path
  key_links:
    - This sprint is independent of phase 44 (#980) — phase 44 fixes cli/github-sync.js and 2 docs files (docs/METHODOLOGY.md, docs/USP.md); this sprint fixes 8 different files the schema-drift audit identified as separate, newly-found drift (findings #6, #7, #8)
---

<objective>
Fix GitHub issues #985, #986, #988 — three clusters of scattered, still-live references to the dead
`.rcode/phases/` directory layout (dead since the v4.0 rebrand, commit `4da7c1e`) that AUDIT-schema-drift.md
identifies as newly-found (not part of phase 44/#980's already-planned scope): the verifier's own
operative rule file for where to write VERIFICATION.md, the CLI's hardcoded config default for
`planning_artifacts`, and 6 scattered live-adjacent skill/rule/template files. All target the same class
of fix (dead path -> `.planning/phases/` or `.planning/`) across independent files with no
cross-dependency.

This is a repo-maintenance/bugfix phase — no numbered requirement IDs apply (`requirements: []`).
</objective>

<execution_context>
@.rcode/workflows/execute-sprint.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/audits/AUDIT-schema-drift.md
</context>

<tasks>

<task id="45.2.1" type="auto">
<title>Fix verification-report.md's dead .rcode/phases/ write path</title>
<read_first>
- rcode/agents/rules/verifier/verification-report.md lines 1-20 (`Create .rcode/phases/{phase_dir}/{phase_num}-VERIFICATION.md`) and lines 100-121 (`Report: .rcode/phases/{phase_dir}/{phase_num}-VERIFICATION.md` in the Return-to-Orchestrator format)
</read_first>
<files>rcode/agents/rules/verifier/verification-report.md</files>
<action>
Re-grep the literal string `.rcode/phases/{phase_dir}` before editing.

Replace both occurrences:
- Line 7: `Create \`.rcode/phases/{phase_dir}/{phase_num}-VERIFICATION.md\`:` → `Create \`.planning/phases/{phase_dir}/{phase_num}-VERIFICATION.md\`:`
- Line 111: `**Report:** .rcode/phases/{phase_dir}/{phase_num}-VERIFICATION.md` → `**Report:** .planning/phases/{phase_dir}/{phase_num}-VERIFICATION.md`

This is the operative rule file `rcode-verifier` (Tools: Read, Write, Bash, Grep, Glob) actually loads and follows — a live `/rcode-verify-phase` run today would attempt to Write to a nonexistent `.rcode/phases/` directory tree that no scanner, dashboard, or github-sync tool ever reads back.
</action>
<acceptance_criteria>
- `! grep -q '\.rcode/phases' rcode/agents/rules/verifier/verification-report.md`
- `grep -c '\.planning/phases/{phase_dir}' rcode/agents/rules/verifier/verification-report.md` returns at least `2`
</acceptance_criteria>
<verify>
<automated>
! grep -q '\.rcode/phases' rcode/agents/rules/verifier/verification-report.md && \
[ "$(grep -c '\.planning/phases/{phase_dir}' rcode/agents/rules/verifier/verification-report.md)" -ge 2 ] && \
echo PASS
</automated>
</verify>
<done>verification-report.md tells the verifier to write and report VERIFICATION.md under .planning/phases/{phase_dir}/ — the real, discoverable phase-artifact directory — with zero remaining .rcode/phases references.</done>
<evidence>AUDIT-schema-drift.md finding #6: "rcode/agents/rules/verifier/verification-report.md:7,111... Real location... verification artifacts belong under .planning/phases/{phase-dir}/, not .rcode/phases/." Confirmed via direct read this session (verification-report.md:7,111).</evidence>
</task>

<task id="45.2.2" type="auto">
<title>Fix cli/lib/config.cjs's planning_artifacts dead-path default</title>
<read_first>
- cli/lib/config.cjs lines 30-52 (HARDCODED_DEFAULTS: `planning_artifacts: '.rcode/phases',`)
</read_first>
<files>cli/lib/config.cjs</files>
<action>
Re-grep `planning_artifacts: '.rcode/phases'` before editing.

Change line 52:
```javascript
planning_artifacts: '.rcode/phases',
```
to:
```javascript
planning_artifacts: '.planning/phases',
```
This repo's own dogfood config (no `.rcode/config.json` exists) resolves `planning_artifacts` to this hardcoded default today, pointing at a directory that has not existed since the v4.0 rebrand. Do not touch any other key in `HARDCODED_DEFAULTS` — this is a single-value correction, not a config schema change.
</action>
<acceptance_criteria>
- `grep -q "planning_artifacts: '.planning/phases'" cli/lib/config.cjs`
- `node --check cli/lib/config.cjs` passes
</acceptance_criteria>
<verify>
<automated>
grep -q "planning_artifacts: '.planning/phases'" cli/lib/config.cjs && \
node --check cli/lib/config.cjs && \
echo PASS
</automated>
</verify>
<done>cli/lib/config.cjs's HARDCODED_DEFAULTS.planning_artifacts resolves to .planning/phases, matching where planning artifacts actually live in every current install.</done>
<evidence>AUDIT-schema-drift.md finding #7: "cli/lib/config.cjs:52 — planning_artifacts: '.rcode/phases', (hardcoded default)... This repo has no .rcode/config.json... so this repo's own dogfood config resolves planning_artifacts to .rcode/phases — a directory that has not existed since the v4.0 rebrand." Confirmed via direct read this session (config.cjs:52).</evidence>
</task>

<task id="45.2.3" type="auto">
<title>Fix scattered .rcode/phases references in state-sync-rule.md, hussain-sm/pm SKILL.md, and github issue templates</title>
<read_first>
- rcode/brain/best-practices/state-sync-rule.md line 11 and rcode/skills/_shared/state-sync-rule.md line 11 (both: `.rcode/phases/{phase}/sprint-{N}.md — sprint commitments`)
- rcode/skills/agents/hussain-sm/SKILL.md lines 111, 120 (`.rcode/phases/{current}/epics.md`, `.rcode/phases/{current}/stories/story-{id}.md`)
- rcode/skills/agents/hussain-pm/SKILL.md line 145 (`.rcode/phases/{current}/prd.md`)
- rcode/templates/github/epic-template.md line 57, feature-template.md line 55, task-template.md line 52 (footer boilerplate: `Generated by rcode — .rcode/phases/{{phase}}/...`)
</read_first>
<files>rcode/brain/best-practices/state-sync-rule.md, rcode/skills/_shared/state-sync-rule.md, rcode/skills/agents/hussain-sm/SKILL.md, rcode/skills/agents/hussain-pm/SKILL.md, rcode/templates/github/epic-template.md, rcode/templates/github/feature-template.md, rcode/templates/github/task-template.md</files>
<action>
Re-grep each literal string before editing (both state-sync-rule.md copies must be edited identically since they're maintained as duplicates):

1. `rcode/brain/best-practices/state-sync-rule.md:11` and `rcode/skills/_shared/state-sync-rule.md:11` — change `.rcode/phases/{phase}/sprint-{N}.md — sprint commitments` to `.planning/phases/{phase-dir}/{phase}-{plan}-SPRINT.md — sprint commitments` (matches the real filename convention, not just the directory).

2. `rcode/skills/agents/hussain-sm/SKILL.md:111` — change `.rcode/phases/{current}/epics.md` to `.planning/epics/EPIC-{NN}.md`; line 120 — change `.rcode/phases/{current}/stories/story-{id}.md` to `.planning/epics/stories/{N}.{M}.md`.

3. `rcode/skills/agents/hussain-pm/SKILL.md:145` — change `.rcode/phases/{current}/prd.md` to `.planning/PRD.md` (or the nearest real current PRD location — verify via `find .planning -iname "PRD.md"` before finalizing; if no PRD.md convention exists in `.planning/`, use `.planning/prd.md` for consistency with the lowercase `.planning/` artifact naming already used elsewhere in this same file).

4. `rcode/templates/github/epic-template.md:57`, `feature-template.md:55`, `task-template.md:52` — change the footer `Generated by rcode — \`.rcode/phases/{{phase}}/tasks|stories/{{source_file}}\`` to `Generated by rcode — \`.planning/phases/{{phase}}/{{source_file}}\`` (these templates are not currently loaded by any code under cli/ or server/ — github-sync.js builds issue bodies from inline template literals — but are still worth correcting since they're user-facing documentation of what rcode generates).
</action>
<acceptance_criteria>
- `! grep -rq '\.rcode/phases' rcode/brain/best-practices/state-sync-rule.md rcode/skills/_shared/state-sync-rule.md rcode/skills/agents/hussain-sm/SKILL.md rcode/skills/agents/hussain-pm/SKILL.md rcode/templates/github/epic-template.md rcode/templates/github/feature-template.md rcode/templates/github/task-template.md`
</acceptance_criteria>
<verify>
<automated>
! grep -rq '\.rcode/phases' rcode/brain/best-practices/state-sync-rule.md rcode/skills/_shared/state-sync-rule.md rcode/skills/agents/hussain-sm/SKILL.md rcode/skills/agents/hussain-pm/SKILL.md rcode/templates/github/epic-template.md rcode/templates/github/feature-template.md rcode/templates/github/task-template.md && \
echo PASS
</automated>
</verify>
<done>All 7 files contain zero remaining literal .rcode/phases references; state-sync-rule.md's two copies stay identical to each other after the edit.</done>
<evidence>AUDIT-schema-drift.md finding #8: "rcode/brain/best-practices/state-sync-rule.md:11 and its mirror rcode/skills/_shared/state-sync-rule.md:11... rcode/skills/agents/hussain-sm/SKILL.md:111,120 and rcode/skills/agents/hussain-pm/SKILL.md:145... rcode/templates/github/{feature,epic,task}-template.md (lines 55, 57, 52 respectively)." Confirmed via direct grep this session (all 7 file:line locations verified present).</evidence>
</task>

</tasks>

<verification>
- `grep -rln "\.rcode/phases" rcode/agents/rules/verifier/verification-report.md cli/lib/config.cjs rcode/brain/best-practices/state-sync-rule.md rcode/skills/_shared/state-sync-rule.md rcode/skills/agents/hussain-sm/SKILL.md rcode/skills/agents/hussain-pm/SKILL.md rcode/templates/github/*.md` returns nothing
- `node --check cli/lib/config.cjs` passes
- `diff rcode/brain/best-practices/state-sync-rule.md rcode/skills/_shared/state-sync-rule.md` shows the two mirrored copies still agree with each other post-edit (pre-existing diffs, if any, are unrelated to this fix)
</verification>

<success_criteria>
- The verifier writes VERIFICATION.md to a real, discoverable directory
- cli/lib/config.cjs's default no longer silently points every fresh install at a dead directory
- No live-adjacent skill/rule/template file in this repo still documents .rcode/phases/ as current
</success_criteria>

<output>
Create `.planning/phases/45-audit-remediation-fix-findings-from-6-lens-critical-audit-issues-981-1001/45-2-SUMMARY.md`
</output>

## Files Touched

**Creates:**
<!-- none -->

**Modifies:**
- `rcode/agents/rules/verifier/verification-report.md` — 2 lines corrected to `.planning/phases/`
- `cli/lib/config.cjs` — 1-line default correction
- `rcode/brain/best-practices/state-sync-rule.md` — 1 line corrected
- `rcode/skills/_shared/state-sync-rule.md` — 1 line corrected (kept identical to the brain copy)
- `rcode/skills/agents/hussain-sm/SKILL.md` — 2 lines corrected
- `rcode/skills/agents/hussain-pm/SKILL.md` — 1 line corrected
- `rcode/templates/github/epic-template.md`, `feature-template.md`, `task-template.md` — 1 footer line each corrected

**Tests:**
<!-- none — no existing test asserts on these specific doc/rule paths -->
