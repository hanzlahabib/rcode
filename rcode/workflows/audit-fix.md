<purpose>
Autonomous audit-to-fix pipeline. Runs an audit, parses findings, classifies each as
auto-fixable vs manual-only, spawns executor agents for fixable issues, runs tests
after each fix, and commits atomically with finding IDs for traceability.
</purpose>

@.rcode/references/karpathy-guidelines.md

<available_agent_types>
- rcode-executor — executes a specific, scoped code change
</available_agent_types>

## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:
- Print the usage block below
- STOP — do not proceed

**Usage:**
```
/rcode-audit-fix [--max N] [--severity high|medium|all] [--dry-run] [--source audit|<report-file-path>]
```

**Examples:**
```
/rcode-audit-fix
/rcode-audit-fix --max 10 --severity high
/rcode-audit-fix --dry-run
/rcode-audit-fix --source ./seo-audit-report.md
/rcode-audit-fix --source ~/Downloads/accessibility-scan.txt --max 15
```

<process>

<step name="parse-arguments">
Extract flags from the user's invocation:

- `--max N` — maximum findings to fix (default: **5**)
- `--severity high|medium|all` — minimum severity to process (default: **medium**)
- `--dry-run` — classify findings without fixing (shows classification table only)
- `--source <audit|file-path>` — which audit to run (default: **audit-uat**)

Resolve `--source`:
- If it matches a known internal audit keyword (`audit-uat`), use the internal-audit path — proceed to `run-audit` unchanged.
- Otherwise, treat it as a file path. If the file exists (`test -f "$SOURCE"`), this is an **external audit report** — proceed to `run-audit`'s external-report branch.
- If it matches no keyword AND the file doesn't exist, stop with an error:
```
Error: Unsupported audit source "{source}". Supported keywords: audit-uat. Or pass a path to an existing external audit report file.
```
</step>

<step name="run-audit">
Invoke the source audit command and capture output.

For `audit-uat` source:
```bash
INIT=$(node ".rcode/bin/rcode-tools.cjs" init audit-uat 2>/dev/null || echo "{}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Read existing UAT and verification files to extract findings:
- Glob: `.planning/phases/*/*-UAT.md`
- Glob: `.planning/phases/*/*-VERIFICATION.md`

Parse each finding into a structured record:
- **ID** — sequential identifier (F-01, F-02, ...)
- **description** — concise summary of the issue
- **severity** — high, medium, or low
- **file_refs** — specific file paths referenced in the finding

**For an external report source** (a file path was given instead of a known audit keyword): Read the file directly — it's arbitrary prose from a third-party tool (SEO audit, accessibility scan, security scan, EEAT review, etc.), not rcode's own structured format. Extract findings by reading the report's actual content, not by assuming any particular structure:
- **ID** — assign sequentially (F-01, F-02, ...) since external reports rarely carry stable IDs
- **description** — the finding as stated in the report, condensed to one line
- **severity** — infer from the report's own language (its own "Critical/High/Medium/Low" labels, or wording like "urgent"/"minor") — default to **medium** if the report gives no severity signal at all; never invent a severity the source text doesn't support
- **file_refs** — any file/page paths the finding names; leave empty for findings about external-facing content with no obvious file target (e.g. "add NAP info to footer", "missing alt text site-wide") — classification in the next step will route empty-file-ref findings toward manual-only unless a specific location can be reasonably inferred from the codebase (e.g. grep for the component that renders the footer)
- Do not fabricate findings the report doesn't contain, and do not skip findings just because they lack a clean file reference — surface them as manual-only instead of dropping them
</step>

<step name="classify-findings">
For each finding, classify as one of:

- **auto-fixable** — clear code change, specific file referenced, testable fix
- **manual-only** — requires design decisions, ambiguous scope, architectural changes, user input needed
- **skip** — severity below the `--severity` threshold

**Classification heuristics** (err on manual-only when uncertain):

Auto-fixable signals:
- References a specific file path + line number
- Describes a missing test or assertion
- Missing export, wrong import path, typo in identifier
- Clear single-file change with obvious expected behavior

Manual-only signals:
- Uses words like "consider", "evaluate", "design", "rethink"
- Requires new architecture or API changes
- Ambiguous scope or multiple valid approaches
- Requires user input or design decisions
- Cross-cutting concerns affecting multiple subsystems
- Performance or scalability issues without clear fix

**When uncertain, always classify as manual-only.**
</step>

<step name="present-classification">
Display the classification table:

```
## Audit-Fix Classification

| # | Finding | Severity | Classification | Reason |
|---|---------|----------|---------------|--------|
| F-01 | Missing export in index.ts | high | auto-fixable | Specific file, clear fix |
| F-02 | No error handling in payment flow | high | manual-only | Requires design decisions |
| F-03 | Test stub with 0 assertions | medium | auto-fixable | Clear test gap |
```

If `--dry-run` was specified, **stop here and exit**. The classification table is the
final output — do not proceed to fixing.
</step>

<step name="fix-loop">
For each **auto-fixable** finding (up to `--max`, ordered by severity desc):

**a. Spawn executor agent:**
```
Task(
  prompt="Fix finding {ID}: {description}. Files: {file_refs}. Make the minimal change to resolve this specific finding. Do not refactor surrounding code.",
  subagent_type="rcode-executor"
)
```

**b. Run tests:**
```bash
npm test 2>&1 | tail -20
```

**c. If tests pass** — commit atomically:
```bash
git add {changed_files}
git commit -m "fix({scope}): resolve {ID} — {description}"
```
The commit message **must** include the finding ID (e.g., F-01) for traceability.

**d. If tests fail** — revert changes, mark finding as `fix-failed`, and **stop the pipeline**:
```bash
git checkout -- {changed_files} 2>/dev/null
```
Log the failure reason and stop processing — do not continue to the next finding.
A test failure indicates the codebase may be in an unexpected state, so the pipeline
must halt to avoid cascading issues. Remaining auto-fixable findings will appear in the
report as `not-attempted`.
</step>

<step name="report">
Present the final summary:

```
## Audit-Fix Complete

**Source:** {audit_command}
**Findings:** {total} total, {auto} auto-fixable, {manual} manual-only
**Fixed:** {fixed_count}/{auto} auto-fixable findings
**Failed:** {failed_count} (reverted)

| # | Finding | Status | Commit |
|---|---------|--------|--------|
| F-01 | Missing export | Fixed | abc1234 |
| F-03 | Test stub | Fix failed | (reverted) |

### Manual-only findings (require developer attention):
- F-02: No error handling in payment flow — requires design decisions
```
</step>

</process>

<success_criteria>
- Auto-fixable findings processed sequentially until --max reached or a test failure stops the pipeline
- Tests pass after each committed fix (no broken commits)
- Failed fixes are reverted cleanly (no partial changes left)
- Pipeline stops after the first test failure (no cascading fixes)
- Every commit message contains the finding ID
- Manual-only findings are surfaced for developer attention
- --dry-run produces a useful standalone classification table
</success_criteria>

## Success Criteria

- [ ] All auto-fixable findings processed sequentially; each committed with its finding ID in the commit message
- [ ] Tests pass after each committed fix — no broken commits in git history
- [ ] Failed fixes reverted cleanly with no partial changes left in the working tree
- [ ] Pipeline stops after the first test failure (non-cascading)
- [ ] Manual-only findings listed separately for developer attention
- [ ] `--dry-run` produces a standalone classification table with finding IDs and fixability verdicts

## On Error

If arguments are invalid, missing files, or subagent fails:
- Validate inputs match expected format
- Check that required files exist
- Retry with clearer arguments or report the specific error to the user


## On Completion

/rcode-audit — re-run audit to verify fixes applied correctly
/rcode-review — review the auto-applied changes
/rcode-progress — see overall project state

## ▶ Next Up

- /rcode-verify-phase {phase}
- /rcode-audit {phase}
- /rcode-progress

## Next Up

- `/rcode-verify-work` — verify that auto-fixed issues no longer reproduce
- `/rcode-code-review` — review the generated fixes before shipping
