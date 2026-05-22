---
phase: 6
plan_number: 3
title: memory-audit --fix mode for trivial staleness
wave: 2
depends_on: [6.1]
files_modified:
  - rcode/workflows/memory-audit.md
  - rcode/skills/core/rcode-memory-audit/SKILL.md
autonomous: true
sequential: false
requirements: [phase-6-memfix]
---

<objective>
Extend `/rcode-memory-audit` with an opt-in `--fix` flag that surgically updates trivial staleness in the Memory Bank (typos, stale dates, broken paths). All non-trivial findings stay report-only per D-2. Mirrors the safety constraints of `/rcode-feature-drift` so behavior is consistent across auto-heal tools.
</objective>

<must_haves>
- `rcode/workflows/memory-audit.md` accepts `--fix` flag
- `--fix` only patches items the auditor classifies as severity=trivial
- Each fix commits atomically with `fix(memory): {what was stale} → {what's true now}`
- `--fix` defaults OFF — report-only behavior is preserved when flag absent
- Skill description in SKILL.md is updated to mention `--fix` mode and trigger phrases like "auto-fix memory bank", "memory bank ka --fix"
</must_haves>

<task id="6.3.1">
<title>Add --fix mode to memory-audit workflow</title>
<read_first>
- rcode/workflows/memory-audit.md (current report-only flow)
- rcode/workflows/feature-drift.md (will be created in 6.1; share severity allowlist + atomic-commit pattern with this plan)
- rcode/workflows/audit-fix.md (precedent for severity-tagged auto-fix)
- .planning/phases/6-feature-doc-drift-auto-heal/6-CONTEXT.md (D-1, D-2)
</read_first>

<action>
In `rcode/workflows/memory-audit.md`:

1. In the `parse_args` step (or earliest argument-parsing step), add detection for `--fix`:
   ```bash
   if [[ "$ARGUMENTS" =~ (^|[[:space:]])--fix($|[[:space:]]) ]]; then
     FIX_MODE=true
   else
     FIX_MODE=false
   fi
   ```

2. After the existing audit step (where staleness findings are collected), add a new conditional step `<step name="apply_fixes">`:

   ```markdown
   <step name="apply_fixes">
   Skip if `FIX_MODE` is false.

   For each finding from the audit:
     - If severity is "trivial" (typos, stale ISO dates, dead relative paths,
       provably-wrong factual values like outdated commit hashes), patch in place.
     - For all other severities, leave for human review and add to the report.

   Patching rule (HARD): use file Read + Edit (NOT regex sed) so fixes are
   exact string replacements that fail loudly on ambiguity.

   Atomic commit per fix:
     git add <file>
     git commit -m "fix(memory): <what was stale> → <what's true now>"

   After the loop, log:
     "Memory --fix applied {N} trivial corrections across {M} commits."
   </step>
   ```

3. Update the workflow's `<guardrails>` (or add one if missing):
   ```markdown
   <guardrails>
   - --fix NEVER patches above trivial severity, even with --force
   - --fix uses Read+Edit, not regex sed
   - --fix commits each correction atomically (no batched commits)
   - Default behavior (no --fix) is unchanged: report-only
   </guardrails>
   ```

4. Update `<success_criteria>` to add:
   - `[ ] --fix off by default; report-only path preserved`
   - `[ ] --fix patches only trivial items, each as atomic commit`
</action>

<acceptance_criteria>
- File `rcode/workflows/memory-audit.md` contains literal string `FIX_MODE`
- File contains literal `<step name="apply_fixes">`
- File contains literal `fix(memory):`
- File contains literal `--fix NEVER patches above trivial severity`
- File contains literal `Read+Edit, not regex sed`
</acceptance_criteria>
</task>

<task id="6.3.2">
<title>Update memory-audit SKILL.md with --fix triggers</title>
<read_first>
- rcode/skills/core/rcode-memory-audit/SKILL.md (current skill description)
</read_first>

<action>
In `rcode/skills/core/rcode-memory-audit/SKILL.md`:

1. Update the `description:` field to mention --fix mode. Append to current description:
   ` Optional --fix flag patches trivial items (typos, stale dates, broken paths) atomically; non-trivial findings always report-only.`

2. Add new trigger phrases to the `triggers:` list:
   - `"auto-fix memory bank"`
   - `"memory bank --fix"`
   - `"memory bank ka --fix"`
   - `"patch trivial memory drift"`

Do NOT remove existing trigger phrases. Do NOT change other frontmatter fields.
</action>

<acceptance_criteria>
- File `rcode/skills/core/rcode-memory-audit/SKILL.md` `description:` contains the literal phrase `--fix`
- File `triggers:` list contains `"auto-fix memory bank"`
- Original triggers preserved (no removed entries)
</acceptance_criteria>
</task>
