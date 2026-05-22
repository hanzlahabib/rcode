---
id: 22-4
phase: 22-agent-slim-top-3-via-references
sprint: 22.4
type: execute
wave: 2
depends_on: [22-1]
files_modified:
  - rcode/agents/rcode-codebase-mapper.md
autonomous: true
requirements: [GH-712]

must_haves:
  truths:
    - rcode-codebase-mapper.md is ≤80 lines after the slim
    - The agent's observable behaviour is identical — all four process steps (parse_focus, discover_source_roots, explore_codebase, write_documents, return_confirmation) are still executed via the reference file
    - The @-include line resolves to the process file created in Sprint 22-1
  artifacts:
    - rcode/agents/rcode-codebase-mapper.md (slimmed, ≤80 lines)
  key_links:
    - Depends on rcode/references/codebase-mapping-process.md from Sprint 22-1
    - Can run in parallel with Sprint 22-2 and 22-3 — different files, no overlap
---

<objective>
Slim rcode/agents/rcode-codebase-mapper.md from 244 lines to ≤80 lines by replacing the `<process>` block with a single @-include line pointing to the reference file created in Sprint 22-1. No behaviour change — all process steps are still executed via the reference file.

Purpose: 67% line reduction on the third-heaviest agent. Closes GH-712 contribution for this agent.
Output: rcode/agents/rcode-codebase-mapper.md at ≤80 lines.
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/phases/22-agent-slim-top-3-via-references/22-CONTEXT.md
</context>

<tasks>

### Task 1 — Verify Sprint 22-1 reference file exists
**Type:** auto
**Duration estimate:** 2 min

<files>
rcode/references/codebase-mapping-process.md
</files>

<action>
Before modifying the agent, confirm the reference file exists:

```bash
test -f rcode/references/codebase-mapping-process.md || { echo "BLOCKER: reference file missing — run Sprint 22-1 first"; exit 1; }
grep -c "step name=" rcode/references/codebase-mapping-process.md
```

If the file is missing or step count is not 5, STOP. Sprint 22-1 must complete first.
</action>

<verify>
<automated>test -f /home/hanzla/development/rcode/rcode/references/codebase-mapping-process.md && echo "READY"</automated>
Expected: prints READY.
</verify>

<done>
- Reference file confirmed present with 5 process steps before any edits are made
</done>

<evidence>
lines: rcode/references/codebase-mapping-process.md — created in Sprint 22-1
</evidence>

---

### Task 2 — Rewrite rcode-codebase-mapper.md as slim stub
**Type:** auto
**Duration estimate:** 20-25 min

<files>
rcode/agents/rcode-codebase-mapper.md (244 lines — current source of truth, READ FIRST)
</files>

<action>
Read rcode/agents/rcode-codebase-mapper.md in full before making any edits.

Important: This agent has a slightly different @-include layout than the others. Current lines 9-11:
```
@.rcode/references/response-style.md
@.rcode/references/karpathy-guidelines-full.md
@.rcode/skills/agents/dalil-scout/SKILL.md
```
Note: lines 7-8 are both blank (two blank lines after frontmatter). The `@.rcode/skills/agents/dalil-scout/SKILL.md` include is on line 11.

The slim stub must contain exactly these sections in this order:

1. **YAML frontmatter** (lines 1-6 verbatim — name, description, tools, color unchanged; note color is cyan)
2. **Blank line**
3. **Existing @-includes** — keep all three exactly as-is:
   ```
   @.rcode/references/response-style.md
   @.rcode/references/karpathy-guidelines-full.md
   @.rcode/skills/agents/dalil-scout/SKILL.md
   ```
4. **New @-include** for the process: `@.rcode/references/codebase-mapping-process.md`
5. **Blank line**
6. **`<role>` block** (lines 13-30) — keep verbatim. This includes: Dalil identity + Arabic name meaning, Voice directive (continuity beat + sign-off pattern), Honesty about scope paragraph, focus areas list (tech/arch/quality/concerns → output files), CRITICAL Mandatory Initial Read notice
7. **`<why_this_matters>` block** (lines 32-63) — keep verbatim. The table mapping phase types to codebase documents loaded by /rcode-plan, the /rcode-execute reference note, and the 5 "what this means for your output" bullet points
8. **`<philosophy>` block** (lines 65-77) — keep verbatim. Four rules: document quality over brevity, always include file paths, write current state only, be prescriptive not descriptive

What to REMOVE from the agent file:
- The entire `<process>` block (lines 79-244) — this is now in the reference file

The resulting file must be ≤80 lines.

ALWAYS use the Write tool to overwrite the file — never use Bash/sed/awk.

The exact @-include line to add (after the three existing @-includes, before the blank line and `<role>`):
```
@.rcode/references/codebase-mapping-process.md
```
</action>

<verify>
<automated>wc -l /home/hanzla/development/rcode/rcode/agents/rcode-codebase-mapper.md</automated>
Expected: ≤80 lines.

```bash
grep "@.rcode/references/codebase-mapping-process.md" rcode/agents/rcode-codebase-mapper.md | wc -l
```
Expected: 1.

```bash
grep -c "discover_source_roots\|explore_codebase\|write_documents" rcode/agents/rcode-codebase-mapper.md
```
Expected: 0 (process step names are gone from the agent stub — they live in the reference file).

```bash
# All three original @-includes still present
grep -c "@.rcode/references/response-style.md\|@.rcode/references/karpathy-guidelines-full.md\|@.rcode/skills/agents/dalil-scout/SKILL.md" rcode/agents/rcode-codebase-mapper.md
```
Expected: 3.
</verify>

<done>
- rcode-codebase-mapper.md is ≤80 lines
- @-include line for codebase-mapping-process.md is present
- All three original @-includes (response-style, karpathy-guidelines-full, dalil-scout SKILL.md) preserved
- <role>, <why_this_matters>, <philosophy> blocks all retained verbatim
- <process> step bodies (bash commands, Scan Scope template, document templates) NOT in agent stub
- YAML frontmatter is unchanged (including color: cyan)
- Dalil voice directives ("Dalil here — starting the scan.", "— Dalil") are in the role block, NOT in the process — verify they remain in the stub
</done>

<evidence>
lines: rcode/agents/rcode-codebase-mapper.md:1-244 — full file read before rewrite; lines 79-244 (`<process>` block) are the content being removed (grep "step name=" → 5 hits in that range confirms scope); dalil-scout @-include confirmed at line 11 (two blank lines after frontmatter at lines 7-8)
</evidence>

---

### Task 3 — Commit the slimmed agent
**Type:** auto
**Duration estimate:** 5 min

<files>
rcode/agents/rcode-codebase-mapper.md
</files>

<action>
Stage and commit only the agent file:

```bash
git add rcode/agents/rcode-codebase-mapper.md

git commit -m "refactor(agents): slim codebase-mapper 244→≤80 lines via @-include (#712)"
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
- Only rcode-codebase-mapper.md in the diff
</done>

<evidence>
lines: rcode/agents/rcode-codebase-mapper.md — the single file being committed
</evidence>

</tasks>

<verification>
Final checks after all tasks complete:

```bash
# Line count gate
actual=$(wc -l < rcode/agents/rcode-codebase-mapper.md)
[ "$actual" -le 80 ] && echo "PASS: $actual lines" || echo "FAIL: $actual lines — must be ≤80"

# @-include present
grep -q "@.rcode/references/codebase-mapping-process.md" rcode/agents/rcode-codebase-mapper.md \
  && echo "PASS: @-include present" || echo "FAIL: @-include missing"

# All three original @-includes preserved
grep -q "@.rcode/references/response-style.md" rcode/agents/rcode-codebase-mapper.md \
  && echo "PASS: response-style include" || echo "FAIL: response-style include missing"
grep -q "@.rcode/skills/agents/dalil-scout/SKILL.md" rcode/agents/rcode-codebase-mapper.md \
  && echo "PASS: dalil-scout include" || echo "FAIL: dalil-scout include missing"

# Process bash blocks NOT in agent stub
grep -q "discover_source_roots\|explore_codebase" rcode/agents/rcode-codebase-mapper.md \
  && echo "FAIL: process step names still in agent stub" || echo "PASS: steps moved to reference"

# Dalil voice identity retained in role block
grep -q "Dalil here — starting the scan\|— Dalil" rcode/agents/rcode-codebase-mapper.md \
  && echo "PASS: Dalil voice retained in role" || echo "FAIL: Dalil voice missing from stub"

# Frontmatter intact (cyan colour)
head -6 rcode/agents/rcode-codebase-mapper.md | grep -q "cyan" \
  && echo "PASS: frontmatter intact" || echo "FAIL: frontmatter changed"
```
</verification>

<success_criteria>
- [ ] rcode/agents/rcode-codebase-mapper.md is ≤80 lines
- [ ] @-include line @.rcode/references/codebase-mapping-process.md is present
- [ ] All three original @-includes (response-style, karpathy-guidelines-full, dalil-scout SKILL.md) preserved
- [ ] <role>, <why_this_matters>, <philosophy> blocks all retained
- [ ] <process> step bodies (bash commands, Scan Scope template) removed from agent stub
- [ ] Dalil voice directives present in role block
- [ ] YAML frontmatter unchanged (color: cyan)
- [ ] Committed with message referencing #712
</success_criteria>

<output>
Create `.planning/phases/22-agent-slim-top-3-via-references/22-4-SUMMARY.md` when complete.
</output>
