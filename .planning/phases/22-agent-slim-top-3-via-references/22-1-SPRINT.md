---
id: 22-1
phase: 22-agent-slim-top-3-via-references
sprint: 22.1
type: execute
wave: 1
depends_on: []
files_modified:
  - rihal/references/integration-verification-playbook.md
  - rihal/references/research-synthesis-playbook.md
  - rihal/references/codebase-mapping-process.md
autonomous: true
requirements: [GH-712]

must_haves:
  truths:
    - Three new reference files exist in rihal/references/ with the extracted static content
    - Each reference file is self-contained — an executor reading only that file gets the full playbook
    - No content is duplicated between agent stubs and reference files after this sprint
  artifacts:
    - rihal/references/integration-verification-playbook.md
    - rihal/references/research-synthesis-playbook.md
    - rihal/references/codebase-mapping-process.md
  key_links:
    - Sprint 22-2, 22-3, 22-4 (Wave 2) depend on these files existing before they run
    - The @-include paths used by agents must be: @.rihal/references/<filename>.md (single-line, no quotes)
---

<objective>
Create three reference files in rihal/references/ by extracting the static playbook content from the three heaviest agents. This is a pure extraction — no behaviour change, no rewriting. Content moves verbatim from agent files into reference files. Wave 2 sprints (22-2, 22-3, 22-4) will then replace that content in the agents with a single @-include line.

Purpose: Establishes the reference files that Wave 2 depends on. Agent files are NOT modified in this sprint.
Output: Three new .md files under rihal/references/.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/phases/22-agent-slim-top-3-via-references/22-CONTEXT.md
@rihal/references/agent-shared-rules.md
</context>

<tasks>

### Task 1 — Create integration-verification-playbook.md
**Type:** auto
**Duration estimate:** 25-35 min

<files>
Source to read: rihal/agents/rihal-integration-checker.md (lines 64–457)
Destination to create: rihal/references/integration-verification-playbook.md
</files>

<action>
Read rihal/agents/rihal-integration-checker.md in full before writing.

Create rihal/references/integration-verification-playbook.md with the following structure:

```
# Integration Verification Playbook

Loaded by `rihal-integration-checker` via `@-include`. Contains the full
six-step verification process, structured output template, critical rules,
and success criteria.

---
```

Then copy the following blocks verbatim from the agent file (do NOT copy the XML tags themselves, only their inner content):

**Block A — `<verification_process>` body (lines 65–361):**
- Step 1: Build Export/Import Map (bash loop over SUMMARYs + provides/consumes map example)
- Step 2: Verify Export Usage (check_export_used() bash function)
- Step 3: Verify API Coverage (find API routes + check_api_consumed() function)
- Step 4: Verify Auth Protection (grep patterns + check_auth_protection() function)
- Step 5: Verify E2E Flows (verify_auth_flow(), verify_data_flow(), verify_form_flow() functions)
- Step 6: Compile Integration Report (YAML wiring status + flow status templates)

**Block B — `<output>` body (lines 364–419):**
The full structured markdown return template (Integration Check Complete, Wiring Summary, API Coverage, Auth Protection, E2E Flows, Detailed Findings, Requirements Integration Map).

**Block C — `<critical_rules>` body (lines 422–433):**
The five check-connections rules (Check connections not existence; Trace full paths; Check both directions; Be specific about breaks; Return structured data).

**Block D — `<success_criteria>` body (lines 436–448):**
The checkbox list (Export/import map built, all exports checked, API routes checked, auth verified, E2E flows traced, etc.).

**Block E — Constraints section (lines 450–457):**
The five constraint bullet points verbatim.

Separate the blocks with a `---` divider. Do NOT include:
- The XML tags (`<verification_process>`, `<output>`, `<critical_rules>`, `<success_criteria>`) themselves
- The YAML frontmatter, `<role>`, `<core_principle>`, or `<inputs>` blocks (those stay in the agent stub)

ALWAYS use the Write tool — never heredoc or Bash to write the file.
</action>

<verify>
<automated>wc -l /home/hanzla/development/rihal-code/rihal/references/integration-verification-playbook.md && grep -c "## Step" /home/hanzla/development/rihal-code/rihal/references/integration-verification-playbook.md</automated>
Expected: file exists, line count > 300, grep returns 6 (six steps present).
</verify>

<done>
- rihal/references/integration-verification-playbook.md exists
- Contains all 6 steps verbatim from the source agent
- Contains all bash functions: check_export_used, check_api_consumed, check_auth_protection, verify_auth_flow, verify_data_flow, verify_form_flow
- YAML report templates (wiring + flows) are present
- `<output>` return template (Integration Check Complete / Requirements Integration Map) is present
- `<critical_rules>` five rules are present
- `<success_criteria>` checkbox list is present
- Constraints section is present
</done>

<evidence>
lines: rihal/agents/rihal-integration-checker.md:64-457 — verification_process (64-361), output (363-419), critical_rules (421-433), success_criteria (435-448), constraints (450-457) all being extracted
creates: rihal/references/integration-verification-playbook.md — no existing file at this path (`ls rihal/references/ | grep integration` → 0 hits)
</evidence>

---

### Task 2 — Create research-synthesis-playbook.md
**Type:** auto
**Duration estimate:** 20-25 min

<files>
Source to read: rihal/agents/rihal-research-synthesizer.md (lines 48–254)
Destination to create: rihal/references/research-synthesis-playbook.md
</files>

<action>
Read rihal/agents/rihal-research-synthesizer.md in full before writing.

Create rihal/references/research-synthesis-playbook.md with the following structure:

```
# Research Synthesis Playbook

Loaded by `rihal-research-synthesizer` via `@-include`. Contains the full
eight-step synthesis process, output format specification, structured return
formats, and success criteria.

---
```

Then copy the following blocks verbatim from the agent file (do NOT copy the XML tags themselves, only their inner content):

**Block A — `<execution_flow>` body (lines 49–148):**
- Step 1: Read Research Files (bash cat commands for 4 files + parse instructions)
- Step 2: Synthesize Executive Summary (3 guiding questions)
- Step 3: Extract Key Findings (per-file extraction instructions)
- Step 4: Derive Roadmap Implications (phase structure, research flags)
- Step 5: Assess Confidence (confidence table template)
- Step 6: Write SUMMARY.md (Write tool mandate + template reference)
- Step 7: Commit All Research (rihal-tools.cjs commit command)
- Step 8: Return Summary

**Block B — `<output_format>` body (lines 151–161):**
The output format specification (template path, key sections list).

**Block C — `<structured_returns>` body (lines 164–222):**
The full SYNTHESIS COMPLETE and SYNTHESIS BLOCKED markdown return formats.

**Block D — `<success_criteria>` body (lines 225–246):**
The checkbox list + quality indicators (Synthesized not concatenated; Opinionated; Actionable; Honest).

**Block E — Constraints section (lines 248–254):**
The five constraint bullet points verbatim.

Separate the blocks with a `---` divider. Do NOT include:
- The XML tags (`<execution_flow>`, `<output_format>`, `<structured_returns>`, `<success_criteria>`) themselves
- The YAML frontmatter, `<role>`, or `<downstream_consumer>` blocks (those stay in the agent stub)

ALWAYS use the Write tool — never heredoc or Bash.
</action>

<verify>
<automated>wc -l /home/hanzla/development/rihal-code/rihal/references/research-synthesis-playbook.md && grep -c "## Step" /home/hanzla/development/rihal-code/rihal/references/research-synthesis-playbook.md</automated>
Expected: file exists, line count > 150, grep returns 8 (eight steps present).
</verify>

<done>
- rihal/references/research-synthesis-playbook.md exists
- Contains all 8 steps verbatim from the source agent
- Step 6 retains the "ALWAYS use the Write tool" mandate (not a hint — it is a behavioural rule)
- Step 7 retains the exact rihal-tools.cjs commit command
- `<output_format>` specification (template path + key sections) is present
- SYNTHESIS COMPLETE and SYNTHESIS BLOCKED return formats are present
- `<success_criteria>` checkbox list + quality indicators are present
- Constraints section is present
</done>

<evidence>
lines: rihal/agents/rihal-research-synthesizer.md:48-254 — execution_flow (48-148), output_format (150-161), structured_returns (163-222), success_criteria (224-246), constraints (248-254) all being extracted
creates: rihal/references/research-synthesis-playbook.md — no existing file at this path (`ls rihal/references/ | grep research-synthesis` → 0 hits)
</evidence>

---

### Task 3 — Create codebase-mapping-process.md
**Type:** auto
**Duration estimate:** 15-20 min

<files>
Source to read: rihal/agents/rihal-codebase-mapper.md (lines 79–244)
Destination to create: rihal/references/codebase-mapping-process.md
</files>

<action>
Read rihal/agents/rihal-codebase-mapper.md lines 79–244 (the entire `<process>` block through end of file).

Create rihal/references/codebase-mapping-process.md with the following structure:

```
# Codebase Mapping Process

Loaded by `rihal-codebase-mapper` (Dalil) via `@-include`. Contains the full
four-step mapping process: parsing focus area, discovering source roots,
exploring the codebase with focus-specific bash commands, writing documents
with mandatory Scan Scope section, and returning confirmation.

---
```

Then copy the ENTIRE body of `<process>` from the agent file — all four `<step>` elements:
- step name="parse_focus" (lines 81-89): focus area → document mapping table
- step name="discover_source_roots" (lines 91-131): MANDATORY FIRST STEP — find, language detection, monorepo detection, topic-phrase sweep bash commands
- step name="explore_codebase" (lines 133-198): tech/arch/quality/concerns bash blocks
- step name="write_documents" (lines 200-229): naming, template filling, MANDATORY Scan Scope template, blind-spot acknowledgment
- step name="return_confirmation" (lines 231-244): format template with On-Demand Rule Files table

Do NOT include:
- The outer `<process>` and `</process>` XML tags themselves
- Anything outside the process block (frontmatter, role, why_this_matters, philosophy sections)

Copy the `<step>` XML tags and their content verbatim — they structure the document for the executor and must be preserved exactly as they appear in the source.

ALWAYS use the Write tool — never heredoc or Bash.
</action>

<verify>
<automated>wc -l /home/hanzla/development/rihal-code/rihal/references/codebase-mapping-process.md && grep -c "step name=" /home/hanzla/development/rihal-code/rihal/references/codebase-mapping-process.md</automated>
Expected: file exists, line count > 140, grep returns 5 (opening tags for 5 steps including return_confirmation).
</verify>

<done>
- rihal/references/codebase-mapping-process.md exists
- Contains all 5 step blocks verbatim from the source agent
- The MANDATORY Scan Scope markdown template is present in write_documents step
- The `$SOURCE_ROOTS` / `$LANGUAGES` variable references are preserved verbatim
- On-Demand Rule Files table is present in return_confirmation step
</done>

<evidence>
lines: rihal/agents/rihal-codebase-mapper.md:79-244 — the entire `<process>` block being extracted
creates: rihal/references/codebase-mapping-process.md — no existing file at this path (`ls rihal/references/ | grep codebase-mapping` → 0 hits)
</evidence>

---

### Task 4 — Commit the three reference files
**Type:** auto
**Duration estimate:** 5 min

<files>
rihal/references/integration-verification-playbook.md
rihal/references/research-synthesis-playbook.md
rihal/references/codebase-mapping-process.md
</files>

<action>
Stage and commit only these three new files. Do not stage any other files.

```bash
git add rihal/references/integration-verification-playbook.md \
        rihal/references/research-synthesis-playbook.md \
        rihal/references/codebase-mapping-process.md

git commit -m "feat(references): extract verification/synthesis/mapping playbooks for agent slim (#712)"
```

Commit message requirements:
- Must reference #712
- Must NOT contain AI attribution ("Co-Authored-By: Claude", "Generated with Claude Code", etc.)
- Use conventional commit format: feat(references): ...
</action>

<verify>
<automated>git log --oneline -1 | grep "#712" && git diff HEAD~1 --name-only | grep "rihal/references/"</automated>
Expected: most recent commit message contains "#712", diff shows the three reference files.
</verify>

<done>
- All three reference files committed in a single commit
- Commit message references #712
- No other files included in the commit
</done>

<evidence>
creates: rihal/references/integration-verification-playbook.md, rihal/references/research-synthesis-playbook.md, rihal/references/codebase-mapping-process.md
</evidence>

</tasks>

<verification>
After all four tasks complete:

```bash
# All three files exist
test -f rihal/references/integration-verification-playbook.md && echo "OK: integration playbook"
test -f rihal/references/research-synthesis-playbook.md && echo "OK: research synthesis playbook"
test -f rihal/references/codebase-mapping-process.md && echo "OK: codebase mapping process"

# Content sanity checks
grep -c "## Step" rihal/references/integration-verification-playbook.md  # expect 6
grep -c "## Step" rihal/references/research-synthesis-playbook.md         # expect 8
grep -c "step name=" rihal/references/codebase-mapping-process.md         # expect 5

# Extended content checks for integration playbook
grep -q "SYNTHESIS COMPLETE\|Integration Check Complete" rihal/references/integration-verification-playbook.md \
  && echo "OK: output template present in integration playbook"
grep -q "SYNTHESIS COMPLETE" rihal/references/research-synthesis-playbook.md \
  && echo "OK: structured returns present in synthesis playbook"

# Agent files are UNCHANGED (Wave 2 modifies them)
wc -l rihal/agents/rihal-integration-checker.md   # still 456
wc -l rihal/agents/rihal-research-synthesizer.md  # still 254
wc -l rihal/agents/rihal-codebase-mapper.md        # still 244
```
</verification>

<success_criteria>
- [ ] rihal/references/integration-verification-playbook.md exists with all 6 verification steps, output template, critical rules, success criteria, and constraints
- [ ] rihal/references/research-synthesis-playbook.md exists with all 8 synthesis steps, output format, structured returns (SYNTHESIS COMPLETE / BLOCKED), success criteria, and constraints
- [ ] rihal/references/codebase-mapping-process.md exists with all 5 process steps
- [ ] All three files committed in one commit referencing #712
- [ ] Agent files are unchanged (Wave 2 is blocked on this sprint, not this one)
- [ ] No behaviour change — content is verbatim extraction, not rewriting
</success_criteria>

<output>
Create `.planning/phases/22-agent-slim-top-3-via-references/22-1-SUMMARY.md` when complete.
</output>
