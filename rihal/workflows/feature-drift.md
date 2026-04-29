# Workflow: rihal-feature-drift

<purpose>
Detect drift between PRD, epics, stories, and code. Report severity-tagged
findings; optionally fix trivial items in-place via opt-in `--fix` flag.

Closes the gap between feature-documentation layers that no other rihal tool
spans (`docs-update` covers project docs, `correct-course` covers PRD-vs-code
only, `memory-audit` reports but doesn't fix). Mirrors the writer+verifier
loop pattern established by `docs-update`.
</purpose>

<required_reading>
@.rihal/references/output-format.md
</required_reading>

<process>

<step name="parse_args">
Extract from $ARGUMENTS:
- `--fix` flag — opt-in auto-fix for trivial items only (severity allowlist enforced in code)
- `--scope <phase|project>` — phase scope reads phase-local docs; project scope reads root docs
- Optional positional phase number (only required when scope=phase)

Default scope: project (root `.planning/PRD.md`, `.planning/epics/`, `.planning/stories/`).

```bash
FIX_MODE=false
if [[ "$ARGUMENTS" =~ (^|[[:space:]])--fix($|[[:space:]]) ]]; then
  FIX_MODE=true
fi
```
</step>

<step name="load_artifacts">
Locate and read the layers that exist; track which layers are absent.

For project scope:
- PRD: `.planning/PRD.md` (or `.planning/REQUIREMENTS.md` as fallback)
- Epics: `.planning/epics/*.md`
- Stories: `.planning/stories/*.md`
- Code surface: `src/`, `lib/`, `packages/`, `app/` (best-effort directory discovery)

For phase scope (phase number passed):
- PRD: `.planning/phases/{N}-*/PRD.md` (or per-phase REQUIREMENTS.md)
- Epics: `.planning/phases/{N}-*/epics/*.md`
- Stories: `.planning/phases/{N}-*/stories/*.md`
- Code surface: same as project scope, plus any phase-specific `files_modified` from prior SPRINT.md

For each missing artifact, log a warning to stdout and continue. This is
**fail-open with notice** per Phase 6 D-3: never block scanning when an
upstream layer is absent — report partial scope clearly.

Track `present_layers[]` (subset of `["prd","epics","stories","code"]`).
</step>

<step name="scan_drift">
Spawn `rihal-docs-auditor` with `--mode=feature-drift`. Pass:
- artifact contents (from previous step)
- `present_layers[]` so the auditor doesn't claim drift between absent layers
- code surface paths

Auditor returns structured JSON:

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
      "fix_hint": "<exact replacement string when severity=trivial; otherwise null>"
    }
  ],
  "layers_skipped": ["..."]
}
```

Parse the JSON. If parsing fails or the `drift` field is absent, treat the
auditor's response as a malfunction and abort with a clear error pointing
the user at the agent definition.
</step>

<step name="severity_classify">
Hard allowlist for `--fix` mode — enforced in code, not by agent discretion.

Trivial only:
- typo correction (single-word misspelling, lowercase/uppercase letter case)
- stale ISO date (e.g., "2024-12-31" when current date is later)
- broken relative path (e.g., docs reference `./foo.md` but file moved)
- factually-wrong-and-mechanically-correctable values (e.g., "API returns JSON" when code returns YAML — only when `fix_hint` carries the exact replacement)

Anything else (minor / major / critical) is **report-only** — never patched
even if `--fix` is set. This is the safety promise of D-2; do not weaken it.
</step>

<step name="report_or_fix">
**If `FIX_MODE=false`:**

Determine output path:
- Inside a phase context: `${phase_dir}/DRIFT.md`
- Otherwise: `.planning/audits/feature-drift-${ISO-date}.md`

Write the report grouped by severity (critical / major / minor / trivial),
each section listing the findings with: layer pair, claim mismatch, file:line.
Print summary: `{N} drift findings — {trivial}/{minor}/{major}/{critical}`.

**If `FIX_MODE=true`:**

Bounded fix loop, max 3 passes:

```
pass = 0
while pass < 3:
  pass += 1
  trivial_findings = drift.filter(d => d.severity == "trivial")
  if trivial_findings is empty: break

  for each trivial finding:
    spawn rihal-noor (writer) with the fix_hint payload
    after the writer returns, run:
      git add <file>
      git commit -m "fix(drift): <what was stale> → <what's true now>"

  re-run scan_drift (the auditor) to detect any new drift surfaced by the fixes
```

For findings with severity > trivial: add to the report only; never patch.

After the loop, write the final report (same path as report-only mode), and
print: `Fixed {N} trivial drifts across {N} commits. Report: {path}`.
</step>

<step name="commit">
If `--fix` produced commits, those were already atomic per fix — no further
work is needed.

The report file itself is committed only when `commit_docs` is true:

```bash
COMMIT_DOCS=$(node ".rihal/bin/rihal-tools.cjs" config-get commit_docs 2>/dev/null || echo "false")
if [[ "$COMMIT_DOCS" == "true" ]]; then
  git add "${REPORT_PATH}"
  git commit -m "docs(drift): scan ${ISO_DATE}"
fi
```
</step>

</process>

<guardrails>
- NEVER patch items above trivial severity, even if user passes a `--force` flag (don't even accept --force here)
- NEVER spawn parallel writer agents — drift fixes must be sequential to avoid conflicting edits to the same file
- Bounded fix loop: max 3 passes. If trivial findings remain after 3 passes, abort the loop and report them as unresolvable
- If `layers_skipped` is non-empty, the report MUST clearly state which drift could not be detected (so the absence of findings doesn't read as "no drift exists")
- The hard severity allowlist (trivial only for --fix) is enforced in this workflow's code path, not delegated to the agent. Do not move the check into the agent.
</guardrails>

<success_criteria>
- [ ] DRIFT.md (or `audits/feature-drift-{ISO}.md`) written with severity-grouped sections
- [ ] When `--fix` set: only trivial items patched, each as atomic commit with `fix(drift):` message prefix
- [ ] When layers missing: report clearly states limited scope (`layers_skipped` block prominent)
- [ ] Bounded loop terminates within 3 passes
- [ ] Report-only mode (no `--fix`) preserves zero file modifications outside the report itself
</success_criteria>
