---
phase: 6
plan_number: 1
title: feature-drift workflow + extended docs-auditor agent
wave: 1
depends_on: []
files_modified:
  - rcode/workflows/feature-drift.md
  - rcode/commands/feature-drift.md
  - rcode/agents/rcode-docs-auditor.md
autonomous: true
sequential: false
requirements: [phase-6-core]
---

<objective>
Ship the core auto-heal capability: a `/rcode-feature-drift` workflow that reads PRD → epics → stories → code, surfaces stale claims with severity tags, and offers a bounded auto-fix path for trivial items. Reuses the verifier-loop pattern from `docs-update.md` and extends `rcode-docs-auditor` with `--mode=feature-drift` per D-4.
</objective>

<must_haves>
- New file `rcode/workflows/feature-drift.md` exists with sections: purpose, required_reading, process (steps: parse_args, load_artifacts, scan_drift, severity_classify, report_or_fix, commit), success_criteria, guardrails
- New file `rcode/commands/feature-drift.md` registers slash command `/rcode-feature-drift` with execution_context pointing at the workflow
- `rcode/agents/rcode-docs-auditor.md` accepts `--mode=feature-drift` and routes to drift-specific instructions
- Workflow handles `--fix` flag: only patches items with severity `trivial`; refuses higher severities with clear message
- Workflow handles missing PRD/epics/stories per D-3: warn and continue with partial scope
- Output format: severity-grouped markdown report at `${phase_dir}/DRIFT.md` (when invoked inside phase) or `.planning/audits/feature-drift-{ISO-date}.md` (otherwise)
- `--fix` mode commits each correction as atomic git commit with message `fix(drift): {what was stale} → {what's true now}`
</must_haves>

<task id="6.1.1">
<title>Create rcode/workflows/feature-drift.md</title>
<read_first>
- rcode/workflows/docs-update.md (mirror its writer+verifier loop pattern; copy its overall structure)
- rcode/workflows/audit-fix.md (copy its severity-tagged auto-fix conventions)
- rcode/workflows/correct-course.md (study how it surfaces drift but not auto-fix)
- .planning/phases/6-feature-doc-drift-auto-heal/6-CONTEXT.md (D-1 through D-5 + canonical_refs)
</read_first>

<action>
Write `rcode/workflows/feature-drift.md` with this structure:

```markdown
# Workflow: rcode-feature-drift

<purpose>
Detect drift between PRD, epics, stories, and code. Report severity-tagged
findings; optionally fix trivial items in-place.
</purpose>

<required_reading>
@.rcode/references/output-format.md
</required_reading>

<process>

<step name="parse_args">
Extract from $ARGUMENTS:
- `--fix` flag — opt-in auto-fix for trivial items only
- `--scope <phase|project>` — phase scope reads phase-local docs; project scope reads root docs
- Optional positional phase number

Default scope: project (root .planning/PRD.md, .planning/epics/, .planning/stories/).
</step>

<step name="load_artifacts">
Locate and read:
- PRD: .planning/PRD.md or .planning/phases/{N}-*/PRD.md
- Epics: .planning/epics/*.md or .planning/phases/{N}-*/epics/*.md
- Stories: .planning/stories/*.md or .planning/phases/{N}-*/stories/*.md
- Code surface: src/, lib/, packages/ (best-effort discovery)

For each missing artifact, log warning and continue (D-3 fail-open with notice).
Track which layers are present in `present_layers[]`.
</step>

<step name="scan_drift">
Spawn rcode-docs-auditor with `--mode=feature-drift`. Pass:
- artifacts loaded above
- present_layers (so auditor doesn't claim drift between absent layers)
- code surface paths

Auditor returns structured findings:
{
  drift: [
    { id, severity: "trivial"|"minor"|"major"|"critical",
      layer_a, layer_b, claim_a, claim_b, file, line }
  ],
  layers_skipped: [...]
}
</step>

<step name="severity_classify">
Apply hard allowlist for `--fix` mode:
- TRIVIAL only: typo corrections, stale dates, broken relative paths, factually-wrong-and-mechanically-correctable values
- MINOR / MAJOR / CRITICAL: report only, never patched

This is enforced in code (not "agent's discretion") per D-2.
</step>

<step name="report_or_fix">
If `--fix` not set:
  Write report to ${output_path}/DRIFT.md with severity-grouped sections.
  Print summary: "{N} drift findings — {trivial}/{minor}/{major}/{critical}".

If `--fix` set:
  For each finding with severity=trivial:
    Spawn rcode-noor to apply the patch
    Commit atomically: `fix(drift): {what was stale} → {what's true now}`
  For severity > trivial:
    Add to report only; do NOT patch.
  Re-scan after fixes (bounded loop, max 3 passes) until trivial findings are 0
  or 3 passes elapsed.
</step>

<step name="commit">
If --fix produced commits, summarize: "Fixed {N} trivial drifts across {M} commits."
If no --fix, only the report file is written; commit it under
`docs(drift): scan {ISO-date}` only when `commit_docs` is true.
</step>

</process>

<guardrails>
- NEVER patch items above trivial severity, even if user passes --force
- NEVER spawn parallel writer agents — drift fixes must be sequential to avoid
  conflicting edits
- Bounded fix loop: max 3 passes
- If layers_skipped is non-empty, report MUST clearly state which drift could
  not be detected
</guardrails>

<success_criteria>
- [ ] DRIFT.md (or audits/feature-drift-{ISO}.md) written with severity sections
- [ ] When --fix set: only trivial items patched, each as atomic commit
- [ ] When layers missing: report clearly states limited scope
- [ ] Bounded loop terminates within 3 passes
</success_criteria>
```

The workflow above is the source of truth — the executor writes this content verbatim to the file, no creative restructuring.
</action>

<acceptance_criteria>
- File `rcode/workflows/feature-drift.md` exists
- File contains literal strings: `<purpose>`, `<step name="parse_args">`, `<step name="load_artifacts">`, `<step name="scan_drift">`, `<step name="severity_classify">`, `<step name="report_or_fix">`, `--fix`, `--mode=feature-drift`, `severity=trivial`, `bounded loop`, `max 3 passes`
- File contains the literal commit-message template `fix(drift):`
</acceptance_criteria>
</task>

<task id="6.1.2">
<title>Create rcode/commands/feature-drift.md slash-command registration</title>
<read_first>
- rcode/commands/docs-update.md (template — copy frontmatter + execution_context shape)
- rcode/commands/audit-fix.md (another template reference)
</read_first>

<action>
Write `rcode/commands/feature-drift.md` with this exact content:

```markdown
---
name: rcode-feature-drift
description: "Detect drift between PRD, epics, stories, and code. Severity-tagged report; --fix patches trivial items only. Reuses verifier-loop pattern from /rcode-docs-update."
argument-hint: "[--fix] [--scope phase|project] [phase-number]"
allowed-tools: Read, Write, Bash, Glob, Grep, Task, AskUserQuestion
---

<objective>
Execute feature-drift workflow
</objective>

<execution_context>
@.rcode/workflows/feature-drift.md
</execution_context>

<process>
Execute the feature-drift workflow from @.rcode/workflows/feature-drift.md end-to-end.
</process>
```
</action>

<acceptance_criteria>
- File `rcode/commands/feature-drift.md` exists
- File frontmatter contains: `name: rcode-feature-drift`, `allowed-tools:`, `argument-hint:`
- File body contains: `@.rcode/workflows/feature-drift.md`
</acceptance_criteria>
</task>

<task id="6.1.3">
<title>Extend rcode-docs-auditor agent with --mode=feature-drift</title>
<read_first>
- rcode/agents/rcode-docs-auditor.md (current agent — must understand existing structure before extending)
- .planning/phases/6-feature-doc-drift-auto-heal/6-CONTEXT.md (D-4 rationale)
</read_first>

<action>
Modify `rcode/agents/rcode-docs-auditor.md`. Add a new section after the existing operating instructions, named `<mode_feature_drift>`. Section content:

```markdown
<mode_feature_drift>
**Activated when:** invoked with `--mode=feature-drift` argument or when
`mode: feature-drift` is present in the orchestrator prompt.

**Inputs:**
- PRD content (may be null — handle gracefully)
- Epics content (may be null)
- Stories content (may be null)
- Code surface paths (always present)
- present_layers[] — which layers were found

**Output: structured JSON** (not prose). Schema:

```json
{
  "drift": [
    {
      "id": "drift-001",
      "severity": "trivial|minor|major|critical",
      "layer_a": "prd|epics|stories|code",
      "layer_b": "prd|epics|stories|code",
      "claim_a": "<text from layer_a>",
      "claim_b": "<text from layer_b>",
      "file": "<path>",
      "line": <number-or-null>,
      "fix_hint": "<if trivial: exact replacement; else null>"
    }
  ],
  "layers_skipped": ["..."]
}
```

**Severity rules (HARD):**
- trivial = typo, stale date, broken relative path, mechanically-correctable
  factual error (e.g., "API returns JSON" when code returns YAML)
- minor = wording divergence that doesn't change meaning
- major = scope/behavior claim mismatch
- critical = security/data-loss-relevant claim mismatch

**Never:**
- Compare layers that aren't both present (use `present_layers[]`)
- Speculate about intent — only flag observable drift
- Recommend patches above trivial severity
</mode_feature_drift>
```

Insert this section AFTER the agent's primary operating instructions but BEFORE any closing `</agent>` or final tags. If the file uses no closing tags, append at end.
</action>

<acceptance_criteria>
- File `rcode/agents/rcode-docs-auditor.md` exists (was already there)
- File contains literal string `<mode_feature_drift>`
- File contains literal string `--mode=feature-drift`
- File contains literal string `severity": "trivial|minor|major|critical"`
- File contains literal string `present_layers[]`
- Original agent content preserved (no removed sections)
</acceptance_criteria>
</task>
