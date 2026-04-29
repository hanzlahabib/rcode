---
phase: 9
plan_number: 1
title: dogfood scan — invoke each rihal tool on rihal-code, document gaps
wave: 1
depends_on: []
files_modified:
  - .planning/phases/9-dogfood-audit-pass/SCAN-RESULTS.md
autonomous: true
sequential: false
requirements: [phase-9-scan]
---

<objective>
Run every user-facing rihal tool (`/rihal:health`, `/rihal:status`, `/rihal:audit`, `/rihal:feature-drift`, `/rihal:memory-audit`, `/rihal:scan`, `/rihal:progress`, `/rihal:stats`, `state sync --from-disk`) against rihal-code itself. Capture each tool's output, compare to its declared purpose, surface drift. File a GH issue for every gap found.
</objective>

<must_haves>
- Single artifact: `.planning/phases/9-dogfood-audit-pass/SCAN-RESULTS.md`
- One section per tool: `## /rihal:<name>`, with subsections "Claimed purpose", "Observed output (truncated)", "Drift / gaps", "Severity" (breaking | shape | cosmetic | none)
- For every drift with severity ≥ shape: GH issue filed with reproducer, linked from the report
- Tools that PASS get listed as "no drift" — visible green-row evidence the audit is complete
</must_haves>

<task id="9.1.1">
<title>Capture observed output for read-only inspection tools</title>
<read_first>
- rihal/workflows/health.md
- rihal/workflows/status.md
- rihal/workflows/scan.md (if present)
- rihal/workflows/progress.md
- rihal/workflows/stats.md (if present)
</read_first>

<action>
For each tool, run the CLI command that backs it (typically `node rihal/bin/rihal-tools.cjs <subcommand>`). Capture stdout to a temp variable, then write to SCAN-RESULTS.md under that tool's heading.

Concrete commands to run:
- `node rihal/bin/rihal-tools.cjs init phase-op 0` — for status / phase-state introspection
- `node rihal/bin/rihal-tools.cjs state sync --from-disk` — should return warnings:[] post-#455
- `node rihal/bin/rihal-tools.cjs roadmap list-phases`
- `node rihal/bin/rihal-tools.cjs plan list`
- `node rihal/bin/rihal-tools.cjs help` — confirm `phase add` line is present (post-#460)

For each, document in SCAN-RESULTS.md:

```markdown
## state sync --from-disk

**Claimed:** Sync `.rihal/state.json` from disk artifacts (ROADMAP.md headings + epics).

**Observed:**
\`\`\`json
{<paste relevant fields>}
\`\`\`

**Drift / gaps:**
- (none, OR list with severity)

**Severity:** none | cosmetic | shape | breaking
```

Skip any tool that requires Skill-tool invocation (those are interactive); document as "covered by plan 9.2 instead".
</action>

<acceptance_criteria>
- File `.planning/phases/9-dogfood-audit-pass/SCAN-RESULTS.md` exists
- Contains at minimum 5 tool sections with the 4-subheading structure
- Each section has either "(none)" under Drift OR a numbered list of findings
- File contains literal string `**Severity:**` in each section
</acceptance_criteria>
</task>

<task id="9.1.2">
<title>Run /rihal:feature-drift and /rihal:memory-audit on rihal-code itself (read-only)</title>
<read_first>
- rihal/workflows/feature-drift.md (just shipped)
- rihal/workflows/memory-audit.md (Phase 6 extended)
</read_first>

<action>
Both tools are slash-skill workflows, so a literal CLI invocation isn't possible without spawning an agent. For Phase 9's read-only scan, simulate the dry-run by:

1. **For feature-drift:** check that the workflow file is parseable, that `rihal-docs-auditor` has the `<mode_feature_drift>` section, and that the slash-command file exists. Don't actually spawn the agent (that's Phase 10+ work or scheduled cadence).
2. **For memory-audit:** check the `--fix` flag detection block exists in the workflow. Run a dry-run by reading the workflow's "Steps" section and confirming each referenced file exists in `.rihal/memory/`.

Document findings in SCAN-RESULTS.md under the same 4-subheading structure. If `.rihal/memory/INDEX.md` doesn't exist, note that the memory-audit precondition would fail — this IS a finding (severity: shape) since the workflow assumes it.
</action>

<acceptance_criteria>
- SCAN-RESULTS.md gains two new sections: `## /rihal:feature-drift` and `## /rihal:memory-audit`
- Each documents observed status (workflow parseable, agent extension present, memory bank existence)
- File any gaps as new GH issues; the issue numbers appear in the report
</acceptance_criteria>
</task>

<task id="9.1.3">
<title>File issues for every shape/breaking drift surfaced</title>
<read_first>
- .planning/phases/9-dogfood-audit-pass/SCAN-RESULTS.md (after 9.1.1 + 9.1.2 written)
</read_first>

<action>
For every entry in SCAN-RESULTS.md with `**Severity:** shape` or `**Severity:** breaking`, file a GH issue using the existing pattern:

```bash
gh issue create --title "fix(<scope>): <one-line>" --body "..."
```

Body must include: reproducer command, observed output, expected output, suggested fix scope. Link back to #463 (umbrella).

After issues are filed, edit SCAN-RESULTS.md to add the issue number next to each finding.

Cosmetic / none entries do NOT get issues — only actionable drift.
</action>

<acceptance_criteria>
- Every shape/breaking entry in SCAN-RESULTS.md has an issue link `(#NNN)`
- No silent fixes — even small drift is filed before any code change
- If zero shape/breaking drift surfaced, this task explicitly notes "no issues filed — clean run" in SCAN-RESULTS.md footer
</acceptance_criteria>
</task>
