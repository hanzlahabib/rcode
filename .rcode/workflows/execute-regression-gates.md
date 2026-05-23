<purpose>
Sub-steps of execute.md — regression_gate and schema_drift_gate. Runs post-execution regression checks and schema drift detection before advancing to verification.
</purpose>

<step name="regression_gate">
Run prior phases' test suites to catch cross-phase regressions BEFORE verification.

**Skip if:** This is the first phase (no prior phases), or no prior VERIFICATION.md files exist.

**Step 1: Discover prior phases' test files**
```bash
# Find all VERIFICATION.md files from prior phases in current milestone
PRIOR_VERIFICATIONS=$(find .planning/phases/ -name "*-VERIFICATION.md" ! -path "*${PHASE_NUMBER}*" 2>/dev/null | sort | tail -5)
```

**Step 2: Extract test file lists from prior verifications**

For each VERIFICATION.md found, look for test file references:
- Lines containing `test`, `spec`, or `__tests__` paths
- The "Test Suite" or "Automated Checks" section
- File patterns from `key-files.created` in corresponding SUMMARY.md files that match `*.test.*` or `*.spec.*`

Collect all unique test file paths into `REGRESSION_FILES`.

**Step 3: Run regression tests (if any found)**

```bash
# Detect test runner and run prior phase tests
if [ -f "package.json" ]; then
  # Node.js — use project's test runner
  npx jest ${REGRESSION_FILES} --passWithNoTests --no-coverage -q 2>&1 || npx vitest run ${REGRESSION_FILES} 2>&1
elif [ -f "Cargo.toml" ]; then
  cargo test 2>&1
elif [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
  python -m pytest ${REGRESSION_FILES} -q --tb=short 2>&1
fi
```

**Step 4: Report results**

If all tests pass:
```
✓ Regression gate: {N} prior-phase test files passed — no regressions detected
```
→ Proceed to verify_phase_goal

If any tests fail:
```
## ⚠ Cross-Phase Regression Detected

Phase {X} execution may have broken functionality from prior phases.

| Test File | Phase | Status | Detail |
|-----------|-------|--------|--------|
| {file} | {origin_phase} | FAILED | {first_failure_line} |

Options:
1. Fix regressions before verification (recommended)
2. Continue to verification anyway (regressions will compound)
3. Abort phase — roll back and re-plan
```

Use AskUserQuestion to present the options.
</step>

<step name="schema_drift_gate">
Post-execution schema drift detection. Catches false-positive verification where
build/types pass because TypeScript types come from config, not the live database.

**Run after execution completes but BEFORE verification marks success.**

```bash
SCHEMA_DRIFT=$(node ".rcode/bin/rihal-tools.cjs" verify schema-drift "${PHASE_NUMBER}" 2>/dev/null)
```

Parse JSON result for: `drift_detected`, `blocking`, `schema_files`, `orms`, `unpushed_orms`, `message`.

**If `drift_detected` is false:** Skip to verify_phase_goal.

**If `drift_detected` is true AND `blocking` is true:**

Check for override:
```bash
SKIP_SCHEMA=$(echo "${Rihal_SKIP_SCHEMA_CHECK:-false}")
```

**If `SKIP_SCHEMA` is `true`:**

Display:
```
⚠ Schema drift detected but Rihal_SKIP_SCHEMA_CHECK=true — bypassing gate.

Schema files changed: {schema_files}
ORMs requiring push: {unpushed_orms}

Proceeding to verification (database may be out of sync).
```
→ Continue to verify_phase_goal.

**If `SKIP_SCHEMA` is not `true`:**

BLOCK verification. Display:

```
## BLOCKED: Schema Drift Detected

Schema-relevant files changed during this phase but no database push command
was executed. Build and type checks pass because TypeScript types come from
config, not the live database — verification would produce a false positive.

Schema files changed: {schema_files}
ORMs requiring push: {unpushed_orms}

Required push commands:
{For each unpushed ORM, show the push command from the message}

Options:
1. Run push command now (recommended) — execute the push, then re-verify
2. Skip schema check (Rihal_SKIP_SCHEMA_CHECK=true) — bypass this gate
3. Abort — stop execution and investigate
```

If `TEXT_MODE` is true, present as a plain-text numbered list. Otherwise use AskUserQuestion.

**If user selects option 1:** Present the specific push command(s) to run. After user confirms execution, re-run the schema drift check. If it passes, continue to verify_phase_goal.

**If user selects option 2:** Set override and continue to verify_phase_goal.

**If user selects option 3:** Stop execution. Report partial completion.
</step>

