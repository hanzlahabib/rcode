---
id: 23-4
phase: 23-agent-slim-remaining-24-via-reference-clusters
sprint: 23.4
type: execute
wave: 2
depends_on: [23-1]
files_modified:
  - rihal/agents/rihal-planner.md
  - rihal/agents/rihal-sprint-checker.md
creates:
  - rihal/references/planner-playbook.md
  - rihal/references/sprint-checker-playbook.md
autonomous: true
requirements: [GH-713]

must_haves:
  truths:
    - rihal-planner.md slims from 239L to ≤100L via planner-playbook.md @-include
    - rihal-sprint-checker.md slims from 148L to ≤100L via sprint-checker-playbook.md @-include
    - Both playbook files are self-contained: an executor reading only the playbook gets the full methodology
    - The stub retains: role, spawned-by, mandatory output markers (sprint-checker), core guardrails
    - planner-playbook.md covers: Quick Reference, On-Demand Rule Files, SPRINT.md Frontmatter Template, Dependency Graph Rules, Codebase Discovery, File-existence verification, Plan Structure, Common Planning Mistakes, Constraints
    - sprint-checker-playbook.md covers: project_context, upstream_input, core_principle, verification_dimensions, Execution (Slim), Mandatory output markers, On-Demand Rule Files, Constraints
  artifacts:
    - rihal/references/planner-playbook.md
    - rihal/references/sprint-checker-playbook.md
    - .rihal/references/planner-playbook.md
    - .rihal/references/sprint-checker-playbook.md
    - rihal/agents/rihal-planner.md (≤100 lines)
    - rihal/agents/rihal-sprint-checker.md (≤100 lines)
  key_links:
    - planner-playbook.md is the content the rihal-planner agent is built around — every executor who reads rihal-planner.md will also pull this in
    - sprint-checker-playbook.md contains the mandatory output markers (issues:/verified_files:) that the orchestrator malfunction guard checks — these must be preserved verbatim in the playbook
    - Sprint 23-4 runs in parallel with 23-2 and 23-3 (different file ownership — no overlap)
---

<objective>
Slim the two plan-quality agents: rihal-planner (239L — largest in Phase 23) and rihal-sprint-checker (148L). Both have unique, specialized content with no cross-agent sharing possible. Each gets its own playbook file in rihal/references/.

The planner playbook is the most content-dense of all 24 agents: it contains the full sprint planning methodology (Quick Reference, task anatomy, sizing rules, TDD guidance, discovery levels, dependency graph rules, codebase discovery protocol, file-existence verification protocol, plan structure template, common mistakes, constraints). All of this moves to planner-playbook.md.

The sprint-checker playbook contains: project_context loading, upstream_input handling, core_principle, verification_dimensions list, execution steps, mandatory output markers, on-demand rule files. All of this moves to sprint-checker-playbook.md.

Purpose: Complete the final two agents in Phase 23. Close #713.
Output: 2 playbook files + 2 slimmed stubs.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-CONTEXT.md
@rihal/references/agent-shared-rules.md
@rihal/references/integration-verification-playbook.md
</context>

<tasks>

### Task 1 — Extract planner-playbook.md from rihal-planner.md
**Type:** auto
**Duration estimate:** 35-45 min

<files>
Source: rihal/agents/rihal-planner.md (239L)
Destination: rihal/references/planner-playbook.md (NEW)
</files>

<action>
Read rihal/agents/rihal-planner.md in full before writing a single line of the playbook. The planner is 239 lines — the largest agent in Phase 23. The content below lines 31 (after the `<role>` block closes) is the playbook content.

**Content to move to planner-playbook.md:**

From rihal/agents/rihal-planner.md, move these sections verbatim:

1. `## Quick Reference` block (lines 33-64) — Context Fidelity, Discovery Levels, Task Anatomy, Task Types table, Task Sizing, TDD vs Standard
2. `## On-Demand Rule Files` table (lines 66-84) — the 5-row table linking to agent-rules files
3. `## SPRINT.md Frontmatter Template` block (lines 86-104) — the full YAML template with comments
4. `## Dependency Graph Rules` block (lines 106-121) — dependency graph logic, wave assignment, vertical vs horizontal slices
5. `## Codebase Discovery (BLOCKER — added after issue #649)` block (lines 123-154) — the full discovery protocol including the evidence table and hard stops
6. `## File-existence verification (BLOCKER — added in v3.1.0 after #441)` block (lines 156-178) — the full file-existence verification protocol
7. `## Plan Structure` block (lines 180-220) — the full plan structure template
8. `## Common Planning Mistakes to Avoid` block (lines 222-232) — the 7 numbered mistakes
9. `## Constraints` block (lines 234-239) — the 5 constraint bullets

**Preamble to write at top of planner-playbook.md:**
```
# Planner Playbook

Loaded by `rihal-planner` via `@-include`. Contains the full sprint
planning methodology: quick reference, task anatomy, SPRINT.md
templates, dependency graph rules, codebase discovery protocol,
file-existence verification, plan structure template, and constraints.

The agent stub holds the role definition, scope-driven sizing rules,
hierarchical ID format, and output routing.
```

**What to KEEP in the rihal-planner.md stub (NOT moved to playbook):**
- YAML frontmatter (lines 1-6) — unchanged
- The four @-include lines at top (lines 8-11) — existing references
- The `<role>` block (lines 13-31) — this is the core dispatcher content:
  - "Rihal sprint planner" identity
  - Mandatory Initial Read rule
  - Scope-Driven Sizing (ticket/feature/phase/initiative)
  - CRITICAL over-splitting warning
  - Hierarchical IDs format (NN.S.TT)
  - Output instructions (SPRINT.md, register in state)
  - Core responsibilities summary

After removing moved content and adding the @-include, the stub should be ~35-45 lines.

**Exact edit steps:**
1. Write planner-playbook.md first (Task 1).
2. In Task 2, edit the stub (remove lines, add @-include).

Do NOT edit rihal-planner.md yet in this task — only create the playbook file.
</action>

<verify>
<automated>
wc -l /home/hanzla/development/rihal-code/rihal/references/planner-playbook.md && grep "Codebase Discovery\|File-existence verification\|SPRINT.md Frontmatter" /home/hanzla/development/rihal-code/rihal/references/planner-playbook.md | wc -l
</automated>
</verify>

<done>
- rihal/references/planner-playbook.md exists and is ≥ 150 lines (all the moved content is substantial)
- File contains: "Codebase Discovery", "File-existence verification", "SPRINT.md Frontmatter Template" headings (confirmed by grep count = 3)
- File starts with the preamble identifying it as loaded by rihal-planner
</done>

<evidence>
lines: rihal/agents/rihal-planner.md:33-239 — the full section from Quick Reference to end of file (207 lines of playbook content to extract)
lines: rihal/agents/rihal-planner.md:1-31 — YAML frontmatter + 4 @-includes + role block (31 lines to keep in stub)
creates: rihal/references/planner-playbook.md — no existing file; rihal-planner.md has never had a playbook extracted (Phase 22 did not cover it — confirmed by 22-CONTEXT.md scope)
</evidence>

---

### Task 2 — Extract sprint-checker-playbook.md from rihal-sprint-checker.md
**Type:** auto
**Duration estimate:** 25-35 min

<files>
Source: rihal/agents/rihal-sprint-checker.md (148L)
Destination: rihal/references/sprint-checker-playbook.md (NEW)
</files>

<action>
Read rihal/agents/rihal-sprint-checker.md in full before writing. Pay particular attention to the "Mandatory output markers" section — this contains the `issues:` / `verified_files:` YAML schema that the orchestrator malfunction guard checks. This section must be copied verbatim into the playbook with zero changes to format or content.

**Content to move to sprint-checker-playbook.md:**

1. `<project_context>` block (lines 33-45) — Project instructions loading, project skills loading
2. `<upstream_input>` block (lines 47-61) — CONTEXT.md sections table and Context Compliance dimension
3. `<core_principle>` block (lines 63-83) — Sprint completeness =/= Goal achievement, goal-backward verification, the difference table (rihal-verifier vs rihal-sprint-checker)
4. `<verification_dimensions>` block (lines 85-103) — the 12-dimension list including Evidence Grounding (issue #649)
5. `## Execution (Slim)` section (lines 105-114) — the 5-step execution process including the `rihal-tools.cjs plan validate-evidence` call
6. `## Mandatory output markers (per #440 / #445 fix)` section (lines 116-133) — COPY VERBATIM, including the YAML schema for `issues:` and `verified_files:`. This is load-bearing.
7. `## On-Demand Rule Files` table (lines 135-140) — the 2-row table
8. `## Constraints` section (lines 142-148) — the 3 constraint bullets

**CRITICAL COPY REQUIREMENT for Mandatory output markers:**
The issues:/verified_files: YAML schema is checked programmatically by the orchestrator malfunction guard. Every field name, indentation, and comment must be copied exactly as it appears in the source file. Do NOT reformat, do NOT change field order, do NOT add or remove fields.

**Preamble to write at top of sprint-checker-playbook.md:**
```
# Sprint Checker Playbook

Loaded by `rihal-sprint-checker` via `@-include`. Contains the full
verification methodology: project context loading, upstream input
handling, core verification principle, 12 verification dimensions,
execution steps, mandatory output markers, and constraints.

CRITICAL: The "Mandatory output markers" section is load-bearing.
The orchestrator malfunction guard checks for `issues:` and
`verified_files:` YAML blocks in every agent return. Copy this
section verbatim — no reformatting.
```

**What to KEEP in rihal-sprint-checker.md stub (NOT moved):**
- YAML frontmatter (lines 1-5) — unchanged
- The two @-include lines (lines 8-9) — existing references
- The `<role>` block (lines 11-31) — who you are, spawned by, what you verify, critical mindset reminder
  - "You are a Rihal sprint checker."
  - Spawned by context
  - Goal-backward verification description
  - Mandatory Initial Read
  - Critical mindset: sprints describe intent, you verify they deliver, list of 6 failure modes

After removing moved content and adding the @-include, the stub should be ~35-40 lines.

Do NOT edit rihal-sprint-checker.md yet in this task — only create the playbook file.
</action>

<verify>
<automated>
wc -l /home/hanzla/development/rihal-code/rihal/references/sprint-checker-playbook.md && grep "issues:\|verified_files:\|Mandatory output markers" /home/hanzla/development/rihal-code/rihal/references/sprint-checker-playbook.md | wc -l
</automated>
</verify>

<done>
- rihal/references/sprint-checker-playbook.md exists and is ≥ 100 lines
- Contains "Mandatory output markers" heading and both `issues:` and `verified_files:` YAML blocks (grep count = 3)
- YAML schema indentation matches the source file exactly
</done>

<evidence>
lines: rihal/agents/rihal-sprint-checker.md:33-148 — all playbook-movable content (116 lines)
lines: rihal/agents/rihal-sprint-checker.md:116-133 — mandatory output markers section with YAML schema (load-bearing, copy verbatim)
lines: rihal/agents/rihal-sprint-checker.md:1-31 — YAML frontmatter + @-includes + role block (31 lines to keep in stub)
creates: rihal/references/sprint-checker-playbook.md — no existing file; confirmed by searching rihal/references/ listing in session context
</evidence>

---

### Task 3 — Slim rihal-planner.md and rihal-sprint-checker.md stubs
**Type:** auto
**Duration estimate:** 25-35 min

<files>
Files to modify:
  - rihal/agents/rihal-planner.md (239L → target ≤50L)
  - rihal/agents/rihal-sprint-checker.md (148L → target ≤45L)
Files that must exist before starting (created in Tasks 1-2):
  - rihal/references/planner-playbook.md
  - rihal/references/sprint-checker-playbook.md
</files>

<action>
Before editing either agent, verify the playbook file exists and contains the content that was moved:
```bash
test -f rihal/references/planner-playbook.md && echo "planner-playbook OK"
test -f rihal/references/sprint-checker-playbook.md && echo "sprint-checker-playbook OK"
```

**Slim rihal-planner.md:**

1. Read the current file (confirm nothing has changed since the planning read).
2. Remove lines 33-239 (everything after the `<role>` closing tag).
   - That is: Quick Reference, On-Demand Rule Files table, SPRINT.md Frontmatter Template, Dependency Graph Rules, Codebase Discovery, File-existence verification, Plan Structure, Common Planning Mistakes, Constraints.
3. Add @-include line after the existing 4 @-include lines (after line 11, before the blank line before `<role>`):
   ```
   @.rihal/references/planner-playbook.md
   ```
4. Run `wc -l rihal/agents/rihal-planner.md`. Expected: ~35-40 lines.

**Verify stub integrity:**
- grep "Scope-Driven Sizing" rihal/agents/rihal-planner.md → should still appear (it's in the role block)
- grep "Hierarchical IDs" rihal/agents/rihal-planner.md → should still appear (it's in the role block)
- grep "Quick Reference" rihal/agents/rihal-planner.md → should NOT appear (moved to playbook)

**Slim rihal-sprint-checker.md:**

1. Read the current file.
2. Remove lines 33-148 (everything after the `<role>` closing tag).
   - That is: project_context block, upstream_input block, core_principle block, verification_dimensions block, Execution (Slim), Mandatory output markers, On-Demand Rule Files, Constraints.
3. Add @-include line after the existing 2 @-include lines (after line 9, before the blank line before `<role>`):
   ```
   @.rihal/references/sprint-checker-playbook.md
   ```
4. Run `wc -l rihal/agents/rihal-sprint-checker.md`. Expected: ~35-40 lines.

**Verify stub integrity:**
- grep "issues:\|verified_files:" rihal/agents/rihal-sprint-checker.md → should NOT appear (moved to playbook — the stub doesn't need to repeat the schema; it @-includes it)
- grep "Goal-backward verification" rihal/agents/rihal-sprint-checker.md → should still appear (in role block)
- grep "sprint-checker-playbook" rihal/agents/rihal-sprint-checker.md → must appear (the @-include)

**Edit approach:** Use the Edit tool with exact line ranges identified above. Read the files first to confirm line numbers match expectations (the agent may have minor differences from the planning-time read). Never rewrite entire files.
</action>

<verify>
<automated>
wc -l rihal/agents/rihal-planner.md rihal/agents/rihal-sprint-checker.md && grep "@.rihal/references/planner-playbook.md" rihal/agents/rihal-planner.md && grep "@.rihal/references/sprint-checker-playbook.md" rihal/agents/rihal-sprint-checker.md
</automated>
</verify>

<done>
- rihal-planner.md: wc -l ≤ 50
- rihal-sprint-checker.md: wc -l ≤ 50
- rihal-planner.md contains: @.rihal/references/planner-playbook.md
- rihal-sprint-checker.md contains: @.rihal/references/sprint-checker-playbook.md
- rihal-planner.md still contains "Scope-Driven Sizing" and "Hierarchical IDs" (role block intact)
- rihal-sprint-checker.md still contains "Goal-backward verification" (role block intact)
</done>

<evidence>
lines: rihal/agents/rihal-planner.md:33-239 — the blocks to remove (207 lines; all moved to planner-playbook.md in Task 1)
lines: rihal/agents/rihal-planner.md:1-31 — the lines to keep (YAML + @-includes + role block)
lines: rihal/agents/rihal-sprint-checker.md:33-148 — the blocks to remove (116 lines; all moved to sprint-checker-playbook.md in Task 2)
lines: rihal/agents/rihal-sprint-checker.md:1-31 — the lines to keep
</evidence>

---

### Task 4 — Mirror playbooks and commit
**Type:** auto
**Duration estimate:** 10 min

<files>
Files to mirror and commit:
  New source files:
    - rihal/references/planner-playbook.md
    - rihal/references/sprint-checker-playbook.md
  Runtime copies to create:
    - .rihal/references/planner-playbook.md
    - .rihal/references/sprint-checker-playbook.md
  Modified agent stubs:
    - rihal/agents/rihal-planner.md
    - rihal/agents/rihal-sprint-checker.md
</files>

<action>
Mirror the two playbooks to .rihal/references/:
```bash
cp rihal/references/planner-playbook.md .rihal/references/planner-playbook.md
cp rihal/references/sprint-checker-playbook.md .rihal/references/sprint-checker-playbook.md
```

Verify mirrors are identical:
```bash
diff rihal/references/planner-playbook.md .rihal/references/planner-playbook.md && echo "planner OK"
diff rihal/references/sprint-checker-playbook.md .rihal/references/sprint-checker-playbook.md && echo "sprint-checker OK"
```

Stage all 6 files:
```bash
git add rihal/references/planner-playbook.md
git add rihal/references/sprint-checker-playbook.md
git add -f .rihal/references/planner-playbook.md
git add -f .rihal/references/sprint-checker-playbook.md
git add rihal/agents/rihal-planner.md
git add rihal/agents/rihal-sprint-checker.md
```

Verify staging with `git diff --cached --stat` — expected: 6 files.

Commit message:
```
feat(agents): slim rihal-planner + rihal-sprint-checker via playbook extraction (#713)
```
</action>

<verify>
<automated>
git log --oneline -1 && git show --stat HEAD | grep -E "planner|sprint-checker"
</automated>
</verify>

<done>
- Commit exists referencing #713
- `git show --stat HEAD` shows 6 files: planner-playbook.md, sprint-checker-playbook.md, .rihal mirror copies, and 2 agent stubs
</done>

<evidence>
lines: .planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-CONTEXT.md:67-68 — both rihal/references/ and .rihal/references/ required
lines: .planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-CONTEXT.md:71 — "Commit per cluster wave, not per agent"
</evidence>

</tasks>

<verification>
```bash
# Final line count check for both plan-quality agents
wc -l rihal/agents/rihal-planner.md rihal/agents/rihal-sprint-checker.md
# Expected: both ≤ 50 lines

# Playbooks exist in both locations
test -f rihal/references/planner-playbook.md && \
test -f rihal/references/sprint-checker-playbook.md && \
test -f .rihal/references/planner-playbook.md && \
test -f .rihal/references/sprint-checker-playbook.md && \
echo "all 4 playbook paths OK"

# Mandatory output markers preserved in sprint-checker-playbook
grep "issues:\|verified_files:" rihal/references/sprint-checker-playbook.md | wc -l
# Expected: ≥ 2

# planner-playbook contains the critical blocker sections
grep "Codebase Discovery\|File-existence verification\|SPRINT.md Frontmatter" \
  rihal/references/planner-playbook.md | wc -l
# Expected: 3

# Stubs are slim
wc -l rihal/agents/rihal-planner.md     # ≤ 50
wc -l rihal/agents/rihal-sprint-checker.md  # ≤ 50
```
</verification>

<success_criteria>
- [ ] rihal/references/planner-playbook.md created (≥ 150 lines — all 7 Quick Reference sub-sections + plan structure + mistakes + constraints)
- [ ] rihal/references/sprint-checker-playbook.md created (≥ 100 lines — all 8 content blocks)
- [ ] Both playbooks mirrored byte-for-byte to .rihal/references/
- [ ] rihal-planner.md ≤ 50 lines with @.rihal/references/planner-playbook.md @-include
- [ ] rihal-sprint-checker.md ≤ 50 lines with @.rihal/references/sprint-checker-playbook.md @-include
- [ ] sprint-checker-playbook.md contains verbatim issues:/verified_files: YAML schema
- [ ] planner-playbook.md contains "Codebase Discovery (BLOCKER)" section with issue #649 evidence protocol
- [ ] One commit with all 6 files, references #713
</success_criteria>

<output>
Create `.planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-4-SUMMARY.md`
</output>
