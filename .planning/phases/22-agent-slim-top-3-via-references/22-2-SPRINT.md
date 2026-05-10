---
id: 22-2
phase: 22-agent-slim-top-3-via-references
sprint: 22.2
type: execute
wave: 2
depends_on: [22-1]
files_modified:
  - rihal/agents/rihal-integration-checker.md
autonomous: true
requirements: [GH-712]

must_haves:
  truths:
    - rihal-integration-checker.md is ≤80 lines after the slim
    - The agent's observable behaviour is identical — it still runs the same 6-step verification, loads steps and output template from the reference file
    - The @-include line resolves to the playbook created in Sprint 22-1
  artifacts:
    - rihal/agents/rihal-integration-checker.md (slimmed, ≤80 lines)
  key_links:
    - Depends on rihal/references/integration-verification-playbook.md from Sprint 22-1
    - install.js copies agents to ~/.claude/agents/ — @-include path must be @.rihal/references/integration-verification-playbook.md
---

<objective>
Slim rihal/agents/rihal-integration-checker.md from 456 lines to ≤80 lines by replacing the `<verification_process>`, `<output>`, `<critical_rules>`, `<success_criteria>`, and Constraints blocks with a single @-include line pointing to the reference file created in Sprint 22-1. No behaviour change — all steps and the output template are still executed, they now load from the reference file.

Purpose: 88% line reduction on the heaviest agent. Closes GH-712 contribution for this agent.
Output: rihal/agents/rihal-integration-checker.md at ≤55 lines.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/phases/22-agent-slim-top-3-via-references/22-CONTEXT.md
</context>

<tasks>

### Task 1 — Verify Sprint 22-1 reference file exists
**Type:** auto
**Duration estimate:** 2 min

<files>
rihal/references/integration-verification-playbook.md
</files>

<action>
Before modifying the agent, confirm the reference file exists and contains the expected content:

```bash
test -f rihal/references/integration-verification-playbook.md || { echo "BLOCKER: reference file missing — run Sprint 22-1 first"; exit 1; }
grep -c "## Step" rihal/references/integration-verification-playbook.md
grep -q "Integration Check Complete\|Requirements Integration Map" rihal/references/integration-verification-playbook.md \
  && echo "output template present" || echo "BLOCKER: output template missing from reference"
```

If the file is missing, step count is not 6, or the output template is absent, STOP. Do not proceed. Sprint 22-1 must complete first.
</action>

<verify>
<automated>test -f /home/hanzla/development/rihal-code/rihal/references/integration-verification-playbook.md && echo "READY"</automated>
Expected: prints READY.
</verify>

<done>
- Reference file confirmed present with 6 steps and the output template before any edits are made
</done>

<evidence>
lines: rihal/references/integration-verification-playbook.md — created in Sprint 22-1, verified to exist before proceeding
</evidence>

---

### Task 2 — Rewrite rihal-integration-checker.md as slim stub
**Type:** auto
**Duration estimate:** 25-35 min

<files>
rihal/agents/rihal-integration-checker.md (456 lines — current source of truth, READ FIRST)
</files>

<action>
Read rihal/agents/rihal-integration-checker.md in full before making any edits.

The slim stub must contain ONLY these sections in this order:

1. **YAML frontmatter** (lines 1-6 verbatim — do not change name, description, tools, color)
2. **Blank line**
3. **Existing @-includes** (lines 8-9: response-style and karpathy-guidelines) — keep exactly as-is
4. **New @-include** for the playbook: `@.rihal/references/integration-verification-playbook.md`
5. **Blank line**
6. **`<role>` block** (lines 13-22) — keep verbatim including the CRITICAL Mandatory Initial Read notice and the Critical mindset paragraph
7. **`<core_principle>` block** (lines 24-35) — keep verbatim (Existence ≠ Integration + 4 bullet points)
8. **`<inputs>` block** (lines 37-62) — keep verbatim (Required Context section with all sub-bullets)

What to REMOVE from the agent file (all of these now live in the reference file):
- The entire `<verification_process>` block (lines 64-361)
- The entire `<output>` block (lines 363-419)
- The entire `<critical_rules>` block (lines 421-433)
- The entire `<success_criteria>` block (lines 435-448)
- The Constraints section (lines 450-456)

The resulting stub (frontmatter 6 lines + blank + 2 includes + new include + blank + role ~10 lines + core_principle ~12 lines + inputs ~26 lines) totals approximately 55 lines — well under the ≤80 target.

ALWAYS use the Write tool to overwrite the file — never use Bash/sed/awk for this.

The exact @-include line to add (line 4 of the stub, after existing includes):
```
@.rihal/references/integration-verification-playbook.md
```

No quotes, no angle brackets — just the raw path prefixed with @.
</action>

<verify>
<automated>wc -l /home/hanzla/development/rihal-code/rihal/agents/rihal-integration-checker.md</automated>
Expected: ≤80 lines (target ~55 lines).

```bash
grep "@.rihal/references/integration-verification-playbook.md" rihal/agents/rihal-integration-checker.md | wc -l
```
Expected: 1 (the include line is present exactly once).

```bash
grep -c "check_export_used\|verify_auth_flow\|check_api_consumed\|Integration Check Complete\|critical_rules\|success_criteria" rihal/agents/rihal-integration-checker.md
```
Expected: 0 (all playbook content — bash functions, output template, rules, criteria — are gone from the agent stub).
</verify>

<done>
- rihal-integration-checker.md is ≤80 lines (target ~55)
- @-include line for integration-verification-playbook.md is present
- `<role>`, `<core_principle>`, `<inputs>` blocks all preserved verbatim
- `<verification_process>`, `<output>`, `<critical_rules>`, `<success_criteria>`, Constraints are NOT in the agent stub
- YAML frontmatter is unchanged
</done>

<evidence>
lines: rihal/agents/rihal-integration-checker.md:1-456 — full file read before rewrite; lines 64-456 (verification_process + output + critical_rules + success_criteria + constraints) are the content being removed; lines 1-62 (frontmatter + includes + role + core_principle + inputs) are the content kept
</evidence>

---

### Task 3 — Commit the slimmed agent
**Type:** auto
**Duration estimate:** 5 min

<files>
rihal/agents/rihal-integration-checker.md
</files>

<action>
Stage and commit only the agent file:

```bash
git add rihal/agents/rihal-integration-checker.md

git commit -m "refactor(agents): slim integration-checker 456→≤55 lines via @-include (#712)"
```

Commit message requirements:
- Must reference #712
- Must NOT contain AI attribution
- Use conventional commit format: refactor(agents): ...
</action>

<verify>
<automated>git log --oneline -1 | grep "#712"</automated>
Expected: most recent commit message contains "#712".
</verify>

<done>
- Slimmed agent file committed with message referencing #712
- Only rihal-integration-checker.md in the diff (no other files)
</done>

<evidence>
lines: rihal/agents/rihal-integration-checker.md — the single file being committed
</evidence>

</tasks>

<verification>
Final checks after all tasks complete:

```bash
# Line count gate
actual=$(wc -l < rihal/agents/rihal-integration-checker.md)
[ "$actual" -le 80 ] && echo "PASS: $actual lines" || echo "FAIL: $actual lines — must be ≤80"

# @-include present
grep -q "@.rihal/references/integration-verification-playbook.md" rihal/agents/rihal-integration-checker.md \
  && echo "PASS: @-include present" || echo "FAIL: @-include missing"

# Frontmatter intact
head -6 rihal/agents/rihal-integration-checker.md | grep -q "rihal-integration-checker" \
  && echo "PASS: frontmatter intact" || echo "FAIL: frontmatter broken"

# Bash functions NOT in agent stub (they belong in reference file)
grep -q "check_export_used\|verify_auth_flow" rihal/agents/rihal-integration-checker.md \
  && echo "FAIL: bash functions still in agent stub" || echo "PASS: functions moved to reference"

# Output template NOT in agent stub (belongs in reference file)
grep -q "Integration Check Complete\|Requirements Integration Map" rihal/agents/rihal-integration-checker.md \
  && echo "FAIL: output template still in agent stub" || echo "PASS: output template moved to reference"

# Bash functions ARE in reference file
grep -q "check_export_used" rihal/references/integration-verification-playbook.md \
  && echo "PASS: functions in reference file" || echo "FAIL: functions missing from reference"

# Output template IS in reference file
grep -q "Integration Check Complete" rihal/references/integration-verification-playbook.md \
  && echo "PASS: output template in reference file" || echo "FAIL: output template missing from reference"
```
</verification>

<success_criteria>
- [ ] rihal/agents/rihal-integration-checker.md is ≤80 lines (target ~55)
- [ ] @-include line @.rihal/references/integration-verification-playbook.md is present
- [ ] `<role>`, `<core_principle>`, `<inputs>` retained in agent stub
- [ ] `<verification_process>`, `<output>`, `<critical_rules>`, `<success_criteria>`, Constraints removed from agent stub (all in reference file)
- [ ] YAML frontmatter unchanged (name, description, tools, color identical to pre-slim)
- [ ] Committed with message referencing #712
</success_criteria>

<output>
Create `.planning/phases/22-agent-slim-top-3-via-references/22-2-SUMMARY.md` when complete.
</output>
