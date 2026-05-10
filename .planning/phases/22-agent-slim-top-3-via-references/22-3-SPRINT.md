---
id: 22-3
phase: 22-agent-slim-top-3-via-references
sprint: 22.3
type: execute
wave: 2
depends_on: [22-1]
files_modified:
  - rihal/agents/rihal-research-synthesizer.md
autonomous: true
requirements: [GH-712]

must_haves:
  truths:
    - rihal-research-synthesizer.md is ≤80 lines after the slim
    - The agent's observable behaviour is identical — it still executes the same 8-step synthesis flow and returns the same structured outputs, now loaded from the reference file
    - The @-include line resolves to the playbook created in Sprint 22-1
  artifacts:
    - rihal/agents/rihal-research-synthesizer.md (slimmed, ≤80 lines)
  key_links:
    - Depends on rihal/references/research-synthesis-playbook.md from Sprint 22-1
    - Can run in parallel with Sprint 22-2 and 22-4 — different files, no overlap
---

<objective>
Slim rihal/agents/rihal-research-synthesizer.md from 254 lines to ≤80 lines by replacing the `<execution_flow>`, `<output_format>`, `<structured_returns>`, `<success_criteria>`, and Constraints blocks with a single @-include line pointing to the reference file created in Sprint 22-1. No behaviour change — all 8 synthesis steps and return formats are still executed via the reference file.

Purpose: 84% line reduction on the second-heaviest agent. Closes GH-712 contribution for this agent.
Output: rihal/agents/rihal-research-synthesizer.md at ≤40 lines.
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
rihal/references/research-synthesis-playbook.md
</files>

<action>
Before modifying the agent, confirm the reference file exists and contains the expected content:

```bash
test -f rihal/references/research-synthesis-playbook.md || { echo "BLOCKER: reference file missing — run Sprint 22-1 first"; exit 1; }
grep -c "## Step" rihal/references/research-synthesis-playbook.md
grep -q "SYNTHESIS COMPLETE\|SYNTHESIS BLOCKED" rihal/references/research-synthesis-playbook.md \
  && echo "structured returns present" || echo "BLOCKER: structured returns missing from reference"
```

If the file is missing, step count is not 8, or structured returns are absent, STOP. Sprint 22-1 must complete first.
</action>

<verify>
<automated>test -f /home/hanzla/development/rihal-code/rihal/references/research-synthesis-playbook.md && echo "READY"</automated>
Expected: prints READY.
</verify>

<done>
- Reference file confirmed present with 8 steps and structured return formats before any edits are made
</done>

<evidence>
lines: rihal/references/research-synthesis-playbook.md — created in Sprint 22-1
</evidence>

---

### Task 2 — Rewrite rihal-research-synthesizer.md as slim stub
**Type:** auto
**Duration estimate:** 20-25 min

<files>
rihal/agents/rihal-research-synthesizer.md (254 lines — current source of truth, READ FIRST)
</files>

<action>
Read rihal/agents/rihal-research-synthesizer.md in full before making any edits.

The slim stub must contain ONLY these sections in this order:

1. **YAML frontmatter** (lines 1-6 verbatim — name, description, tools, color unchanged)
2. **Blank line**
3. **Existing @-includes** (lines 8-9: response-style and karpathy-guidelines) — keep exactly as-is
4. **New @-include** for the playbook: `@.rihal/references/research-synthesis-playbook.md`
5. **Blank line**
6. **`<role>` block** (lines 13-32) — keep verbatim. This includes: identity sentence, who spawns the agent, core responsibilities list, CRITICAL Mandatory Initial Read notice
7. **`<downstream_consumer>` block** (lines 34-46) — keep verbatim. Includes the table showing how rihal-roadmapper uses the SUMMARY.md sections, and the "Be opinionated" directive

What to REMOVE from the agent file (all of these now live in the reference file):
- The entire `<execution_flow>` block (lines 48-148)
- The entire `<output_format>` block (lines 150-161)
- The entire `<structured_returns>` block (lines 163-222)
- The entire `<success_criteria>` block (lines 224-246)
- The Constraints section (lines 248-254)

The resulting stub (frontmatter 6 lines + blank + 2 includes + new include + blank + role ~20 lines + downstream_consumer ~13 lines) totals approximately 40 lines — well under the ≤80 target.

ALWAYS use the Write tool to overwrite the file — never use Bash/sed/awk.

The exact @-include line to add (after existing includes, before first blank line and `<role>`):
```
@.rihal/references/research-synthesis-playbook.md
```
</action>

<verify>
<automated>wc -l /home/hanzla/development/rihal-code/rihal/agents/rihal-research-synthesizer.md</automated>
Expected: ≤80 lines (target ~40 lines).

```bash
grep "@.rihal/references/research-synthesis-playbook.md" rihal/agents/rihal-research-synthesizer.md | wc -l
```
Expected: 1.

```bash
grep -c "cat .planning/research/STACK.md\|rihal-tools.cjs.*commit\|SYNTHESIS COMPLETE\|SYNTHESIS BLOCKED\|output_format\|success_criteria" rihal/agents/rihal-research-synthesizer.md
```
Expected: 0 (execution commands, return formats, output format spec, and success criteria are gone from the agent stub — all live in the reference file).
</verify>

<done>
- rihal-research-synthesizer.md is ≤80 lines (target ~40)
- @-include line for research-synthesis-playbook.md is present
- `<role>` and `<downstream_consumer>` blocks preserved verbatim
- `<execution_flow>`, `<output_format>`, `<structured_returns>`, `<success_criteria>`, Constraints are NOT in the agent stub
- SYNTHESIS COMPLETE / SYNTHESIS BLOCKED return formats are in the reference file, not the stub
- YAML frontmatter is unchanged
</done>

<evidence>
lines: rihal/agents/rihal-research-synthesizer.md:1-254 — full file read before rewrite; lines 48-254 (execution_flow + output_format + structured_returns + success_criteria + constraints) are the content being removed; lines 1-46 (frontmatter + includes + role + downstream_consumer) are the content kept
</evidence>

---

### Task 3 — Commit the slimmed agent
**Type:** auto
**Duration estimate:** 5 min

<files>
rihal/agents/rihal-research-synthesizer.md
</files>

<action>
Stage and commit only the agent file:

```bash
git add rihal/agents/rihal-research-synthesizer.md

git commit -m "refactor(agents): slim research-synthesizer 254→≤40 lines via @-include (#712)"
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
- Only rihal-research-synthesizer.md in the diff
</done>

<evidence>
lines: rihal/agents/rihal-research-synthesizer.md — the single file being committed
</evidence>

</tasks>

<verification>
Final checks after all tasks complete:

```bash
# Line count gate
actual=$(wc -l < rihal/agents/rihal-research-synthesizer.md)
[ "$actual" -le 80 ] && echo "PASS: $actual lines" || echo "FAIL: $actual lines — must be ≤80"

# @-include present
grep -q "@.rihal/references/research-synthesis-playbook.md" rihal/agents/rihal-research-synthesizer.md \
  && echo "PASS: @-include present" || echo "FAIL: @-include missing"

# Frontmatter intact
head -6 rihal/agents/rihal-research-synthesizer.md | grep -q "rihal-research-synthesizer" \
  && echo "PASS: frontmatter intact" || echo "FAIL: frontmatter broken"

# Execution commands NOT in agent stub (belong in reference file)
grep -q "cat .planning/research/STACK.md" rihal/agents/rihal-research-synthesizer.md \
  && echo "FAIL: execution commands still in agent stub" || echo "PASS: commands moved to reference"

# Structured returns NOT in agent stub (belong in reference file)
grep -q "SYNTHESIS COMPLETE\|SYNTHESIS BLOCKED" rihal/agents/rihal-research-synthesizer.md \
  && echo "FAIL: structured returns still in agent stub" || echo "PASS: structured returns moved to reference"

# Structured returns ARE in reference file
grep -q "SYNTHESIS COMPLETE" rihal/references/research-synthesis-playbook.md \
  && echo "PASS: structured returns in reference file" || echo "FAIL: structured returns missing from reference"

# downstream_consumer block present in stub (must stay)
grep -q "downstream_consumer" rihal/agents/rihal-research-synthesizer.md \
  && echo "PASS: downstream_consumer retained" || echo "FAIL: downstream_consumer missing from stub"
```
</verification>

<success_criteria>
- [ ] rihal/agents/rihal-research-synthesizer.md is ≤80 lines (target ~40)
- [ ] @-include line @.rihal/references/research-synthesis-playbook.md is present
- [ ] `<role>` and `<downstream_consumer>` retained in agent stub
- [ ] `<execution_flow>`, `<output_format>`, `<structured_returns>`, `<success_criteria>`, Constraints removed from agent stub (all in reference file)
- [ ] SYNTHESIS COMPLETE / SYNTHESIS BLOCKED formats are in the reference file, not the stub
- [ ] YAML frontmatter unchanged
- [ ] Committed with message referencing #712
</success_criteria>

<output>
Create `.planning/phases/22-agent-slim-top-3-via-references/22-3-SUMMARY.md` when complete.
</output>
