# execute - step 05: Code review gate, close parent artifacts

This step file was split verbatim out of `workflows/execute.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<step name="code_review_gate" required="true">
**This step is REQUIRED and must not be skipped.** Spawn `rcode-reviewer` to review the phase's source changes. Acts as a BLOCKING gate before the verifier when critical or high findings are present.

**Config gate (default ON):**
```bash
CODE_REVIEW_ENABLED=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.code_review_enabled 2>/dev/null || echo "true")
```

If `CODE_REVIEW_ENABLED` is `"false"`: display "Code review skipped (workflow.code_review_enabled=false)" and proceed to `close_parent_artifacts`.

**Resolve reviewer model:**
```bash
REVIEWER_MODEL=$(node ".rcode/bin/rcode-tools.cjs" resolve-model reviewer 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).model)}catch{console.log('')}})" || echo "sonnet")
REVIEWER_MODEL=${REVIEWER_MODEL:-sonnet}
REVIEWER_SKILLS=$(node ".rcode/bin/rcode-tools.cjs" agent-skills rcode-reviewer 2>/dev/null || echo "")
# Issue #652 — no leading zeros. Variable name kept for backward compat in this workflow.
PADDED="${PHASE_NUMBER}"
REVIEW_FILE="${PHASE_DIR}/${PADDED}-REVIEW.md"
```

**Spawn the reviewer agent:**
```
Task(
  description="Code review for phase {phase_number}",
  prompt="Review the source code changes for phase {phase_number}.
Phase directory: {phase_dir}
Phase goal: {goal from ROADMAP.md}

Read all plan files and summaries in the phase directory, then review the source files actually modified (from SUMMARY.md `key-files.created`/`modified`). Classify each finding by severity: critical, high, medium, or low.

Write the review to: ${REVIEW_FILE}

The file MUST begin with YAML frontmatter including:
---
status: clean | issues_found | skipped
phase: {phase_number}
critical: <count>
high: <count>
medium: <count>
low: <count>
generated: <ISO timestamp>
---

Group findings by severity. For each finding include: file path, line reference, description, recommended fix.

${REVIEWER_SKILLS}",
  subagent_type="rcode-reviewer",
  model="${REVIEWER_MODEL}"
)
```

**Error handling:** If the Task invocation fails or throws, display "Code review encountered an error (non-blocking): {error}" and proceed to `close_parent_artifacts`. A broken reviewer must never permanently block execution.

**Parse severity counts:**
```bash
# Fail-safe defaults — malformed/missing frontmatter must NOT bypass the gate (#602).
# Empty string compared against an integer in bash evaluates to false, which
# would silently let critical findings through. Default missing to a sentinel
# that fails the gate so a bad REVIEW.md is treated as "block, ask the user".
REVIEW_STATUS="malformed"
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0
REVIEW_PARSE_OK=false
if [[ -f "$REVIEW_FILE" ]]; then
  FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$REVIEW_FILE")
  PARSED_STATUS=$(echo "$FRONTMATTER" | grep "^status:" | head -1 | cut -d: -f2 | tr -d ' ')
  PARSED_CRIT=$(echo "$FRONTMATTER"   | grep "^critical:" | head -1 | cut -d: -f2 | tr -d ' ')
  PARSED_HIGH=$(echo "$FRONTMATTER"   | grep "^high:"     | head -1 | cut -d: -f2 | tr -d ' ')
  PARSED_MED=$(echo "$FRONTMATTER"    | grep "^medium:"   | head -1 | cut -d: -f2 | tr -d ' ')
  PARSED_LOW=$(echo "$FRONTMATTER"    | grep "^low:"      | head -1 | cut -d: -f2 | tr -d ' ')
  # Accept the parse only when status + all four counts are present AND counts
  # are pure digits. Anything else = malformed → block and ask.
  if [[ -n "$PARSED_STATUS" \
        && "$PARSED_CRIT" =~ ^[0-9]+$ \
        && "$PARSED_HIGH" =~ ^[0-9]+$ \
        && "$PARSED_MED"  =~ ^[0-9]+$ \
        && "$PARSED_LOW"  =~ ^[0-9]+$ ]]; then
    REVIEW_STATUS="$PARSED_STATUS"
    CRITICAL_COUNT="$PARSED_CRIT"
    HIGH_COUNT="$PARSED_HIGH"
    MEDIUM_COUNT="$PARSED_MED"
    LOW_COUNT="$PARSED_LOW"
    REVIEW_PARSE_OK=true
  fi
fi

# Malformed REVIEW.md = treat as a blocking finding. The gate must NEVER
# silently pass when it can't read the report (#602).
if [[ "$REVIEW_PARSE_OK" != "true" ]]; then
  echo "⛔ Code review gate: REVIEW.md missing or malformed at ${REVIEW_FILE}."
  echo "   Cannot determine severity counts. Treating as blocking — re-run the reviewer."
  CRITICAL_COUNT=1   # force the gate to block; user can override below
fi
```

**Blocking gate on critical/high:**

If `CRITICAL_COUNT > 0` OR `HIGH_COUNT > 0`, present the block banner and use AskUserQuestion:

```
## ⛔ Code Review Gate: Blocking Findings

Phase {phase_number} code review found:
  critical: ${CRITICAL_COUNT}
  high:     ${HIGH_COUNT}
  medium:   ${MEDIUM_COUNT}
  low:      ${LOW_COUNT}

Report: ${REVIEW_FILE}

Verifier is blocked until critical/high findings are resolved.
```

AskUserQuestion with options:
1. **"Run /rcode-review-fix first (recommended)"** — Stop. Print next command: `/rcode-review-fix ${PHASE_NUMBER}`. Do NOT spawn verifier.
2. **"Proceed to verifier anyway (high findings unresolved)"** — Log override and continue to `close_parent_artifacts` → `regression_gate` → `verify_phase_goal`.
3. **"Cancel execution"** — Stop. Report partial completion.

**Advisory line on medium/low only:**

If `CRITICAL_COUNT == 0` AND `HIGH_COUNT == 0` AND (`MEDIUM_COUNT > 0` OR `LOW_COUNT > 0`), display:
```
⚠ Code review found non-blocking findings (medium: ${MEDIUM_COUNT}, low: ${LOW_COUNT}).
  Report: ${REVIEW_FILE}
  Consider: /rcode-review-fix ${PHASE_NUMBER}
```
Then continue to `close_parent_artifacts`.

**Clean review:** If `REVIEW_STATUS == "clean"` (or all counts are zero), display "✓ Code review clean" and continue.

Only when the gate is clean or the user overrides do we proceed to close_parent_artifacts → regression_gate → verify_phase_goal.
</step>

<step name="close_parent_artifacts">
**For decimal/polish phases only (X.Y pattern):** Close the feedback loop by resolving parent UAT and debug artifacts.

**Skip if** phase number has no decimal (e.g., `3`, `04`) — only applies to gap-closure phases like `4.1`, `03.1`.

```bash
IS_GAP_CLOSURE_PHASE=$([[ "$PHASE_NUMBER" == *.* ]] && echo true || echo false)
```
${IS_GAP_CLOSURE_PHASE === 'true' ? '@.rcode/references/execute-close-parent-artifacts.md' : ''}
</step>

@.rcode/workflows/execute-regression-gates.md

@.rcode/workflows/execute-verify-phase-goal.md

Next: Read `.rcode/workflows/execute/steps/06-uat-roadmap.md` before starting it (skip it if its Read-when condition is false).
