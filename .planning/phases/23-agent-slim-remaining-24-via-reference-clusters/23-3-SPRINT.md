---
id: 23-3
phase: 23-agent-slim-remaining-24-via-reference-clusters
sprint: 23.3
type: execute
wave: 2
depends_on: [23-1]
files_modified:
  - rihal/agents/rihal-phase-researcher.md
  - rihal/agents/rihal-project-researcher.md
  - rihal/agents/rihal-advisor-researcher.md
  - rihal/agents/rihal-profiler.md
  - rihal/agents/rihal-executor.md
  - rihal/agents/rihal-debugger.md
  - rihal/agents/rihal-verifier.md
  - rihal/agents/rihal-remediation-planner.md
  - rihal/agents/rihal-code-reviewer.md
  - rihal/agents/rihal-code-fixer.md
  - rihal/agents/rihal-roadmapper.md
  - rihal/agents/rihal-assumptions-analyzer.md
  - rihal/agents/rihal-ux-designer.md
creates:
  - rihal/references/executor-playbook.md
  - rihal/references/debugger-playbook.md
  - rihal/references/verifier-playbook.md
  - rihal/references/remediation-planner-playbook.md
  - rihal/references/code-reviewer-playbook.md
  - rihal/references/code-fixer-playbook.md
  - rihal/references/roadmapper-playbook.md
  - rihal/references/assumptions-analyzer-playbook.md
  - rihal/references/ux-designer-playbook.md
autonomous: true
requirements: [GH-713]

must_haves:
  truths:
    - All 4 researcher agents slim to ≤100 lines by @-including researcher-shared.md
    - All 9 execution/specialist agents have unique playbook files extracted to rihal/references/
    - All 13 agent stubs contain exactly one @-include to their playbook or cluster file
    - Every playbook file mirrors to .rihal/references/ so agents can resolve @-includes at runtime
  artifacts:
    - rihal/agents/rihal-phase-researcher.md (≤100 lines)
    - rihal/agents/rihal-project-researcher.md (≤100 lines)
    - rihal/agents/rihal-advisor-researcher.md (≤100 lines)
    - rihal/agents/rihal-profiler.md (≤100 lines)
    - rihal/references/executor-playbook.md
    - rihal/references/debugger-playbook.md
    - rihal/references/verifier-playbook.md
    - rihal/references/remediation-planner-playbook.md
    - rihal/references/code-reviewer-playbook.md
    - rihal/references/code-fixer-playbook.md
    - rihal/references/roadmapper-playbook.md
    - rihal/references/assumptions-analyzer-playbook.md
    - rihal/references/ux-designer-playbook.md
  key_links:
    - Sprint 23-1 must be complete (researcher-shared.md must exist)
    - Sprint 23-3 and 23-2 run in parallel (different file ownership — no overlap)
    - Sprint 23-4 runs in parallel with 23-3 and 23-2 (planner/sprint-checker only)
---

<objective>
Slim 13 agents in two sub-clusters.

Sub-cluster C (researchers, 4 agents): phase-researcher, project-researcher, advisor-researcher, profiler. Each gets @.rihal/references/researcher-shared.md added and shared blocks removed.

Sub-cluster D (execution/specialist agents, 9 agents): executor, debugger, verifier, remediation-planner, code-reviewer, code-fixer, roadmapper, assumptions-analyzer, ux-designer. These are too different for a shared cluster file. Each gets its own playbook extracted to rihal/references/<agent>-playbook.md and the heavy content moved there. The stub keeps only the role definition, @-includes, and dispatch routing.

Purpose: Slim 13 more agents from 116-140L to ≤100L each. Close #713 requirement for these clusters.
Output: 4 modified researcher stubs + 9 new playbook files + 9 modified execution/specialist stubs.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-CONTEXT.md
@rihal/references/agent-shared-rules.md
@rihal/references/researcher-shared.md
@rihal/references/integration-verification-playbook.md
</context>

<tasks>

### Task 1 — Slim researcher agents (Cluster C)
**Type:** auto
**Duration estimate:** 35-45 min

<files>
Files to modify:
  - rihal/agents/rihal-phase-researcher.md (129L currently)
  - rihal/agents/rihal-project-researcher.md (128L currently)
  - rihal/agents/rihal-advisor-researcher.md (116L currently)
  - rihal/agents/rihal-profiler.md (117L currently)
Reference to @-include: .rihal/references/researcher-shared.md (created in 23-1)
</files>

<action>
Read all four agent files before editing. Read researcher-shared.md to know exactly what moved to the reference.

**Blocks to REMOVE from each researcher agent (only those matching content in researcher-shared.md):**

For rihal-phase-researcher.md:
- The "Prescriptive-not-exploratory" rule STATEMENT (the named-rule definition line) — the rule name stays as a citation in the principles list, but the expanded description ("output 'Use X' not 'Consider X, Y, or Z.' The planner needs a decision, not a literature review") moves to the shared file
- The "Confidence-labeled" rule STATEMENT — same treatment as above
- The mandatory initial read block: "If the prompt contains a `<files_to_read>` block, you MUST use the `Read` tool to load every file listed there before performing any other actions." — moves to shared file
- The generic anti-patterns that are now in researcher-shared.md under Scope Discipline (e.g., "Never explore alternatives to locked decisions" — remove only the generic version; keep the phase-researcher-specific version if it exists)

For rihal-project-researcher.md:
- The "Evidence-drives-conclusions" expanded rule statement — the citation stays; the expanded explanation moves to shared
- The "Confident-but-honest" expanded rule statement — same
- The mandatory initial read block — identical to phase-researcher, moves to shared
- The `<philosophy>` section "Training Data = Hypothesis", "Honest Reporting", "Investigation, Not Confirmation" subsections — KEEP these if they contain unique project-researcher-specific guidance not in the shared file. Read researcher-shared.md first and compare carefully before removing.

For rihal-advisor-researcher.md:
- The mandatory initial read block — moves to shared
- Generic "Do NOT present output directly to user" instruction — if captured in researcher-shared.md under Output Discipline, remove from stub

For rihal-profiler.md:
- The "Data-grounded" generic definition — remove the generic meta-description; keep the profiler-specific formulation
- "Signal-vs-noise" generic meta-principle — same treatment
- "No pleasantries or closing offers" — remove if in shared constraints
- Generic "provide insight, not decisions" routing rule — if in researcher-shared.md under Scope Discipline

**IMPORTANT:** For each agent, after removing blocks, verify the remaining file still tells the agent what to DO (role, responsibilities, output format, workflow). If removing a block would leave an orphaned heading with no content, do NOT remove the block — instead keep it or merge it.

**Add @-include line** after the existing @-include lines near the top of each file:
```
@.rihal/references/researcher-shared.md
```

**Line count target:** Each file ≤100 lines. Run `wc -l` after each edit. If still over 100, identify additional shared content and check against researcher-shared.md before removing.

Process one file at a time.
</action>

<verify>
<automated>
wc -l rihal/agents/rihal-phase-researcher.md rihal/agents/rihal-project-researcher.md rihal/agents/rihal-advisor-researcher.md rihal/agents/rihal-profiler.md && grep -c "@.rihal/references/researcher-shared.md" rihal/agents/rihal-phase-researcher.md rihal/agents/rihal-project-researcher.md rihal/agents/rihal-advisor-researcher.md rihal/agents/rihal-profiler.md
</automated>
</verify>

<done>
- All 4 files: wc -l ≤ 100
- All 4 files contain: @.rihal/references/researcher-shared.md (grep count = 1 per file)
- phase-researcher still contains: "Downstream consumer" table, RESEARCH.md output sections
- project-researcher still contains: 5-file output list (SUMMARY.md, STACK.md, etc.)
- advisor-researcher still contains: comparison table format, calibration tiers, tool strategy
- profiler still contains: persona development workflow, usage flow analysis, segmentation methodology
</done>

<evidence>
lines: rihal/agents/rihal-phase-researcher.md:19-21 — mandatory initial read block (moves to shared)
lines: rihal/agents/rihal-project-researcher.md:17-19 — identical mandatory initial read block (confirms shared pattern)
lines: rihal/agents/rihal-phase-researcher.md:93-95 — "Prescriptive-not-exploratory" and "Confidence-labeled" named rules (shared meta-rules, definitions move to shared file)
lines: rihal/agents/rihal-project-researcher.md:88-92 — "Evidence-drives-conclusions", "Confident-but-honest" (shared meta-rules)
lines: rihal/agents/rihal-advisor-researcher.md:116 — current line count (116L, smallest in cluster)
</evidence>

---

### Task 2 — Extract playbooks for execution/specialist agents (Cluster D)
**Type:** auto
**Duration estimate:** 50-60 min

<files>
Agent files to read (all 9 before writing any playbook):
  - rihal/agents/rihal-executor.md (124L)
  - rihal/agents/rihal-debugger.md (140L)
  - rihal/agents/rihal-verifier.md (124L)
  - rihal/agents/rihal-remediation-planner.md (123L)
  - rihal/agents/rihal-code-reviewer.md (120L)
  - rihal/agents/rihal-code-fixer.md (120L)
  - rihal/agents/rihal-roadmapper.md (120L)
  - rihal/agents/rihal-assumptions-analyzer.md (117L)
  - rihal/agents/rihal-ux-designer.md (123L)
Playbook files to create (one per agent):
  - rihal/references/executor-playbook.md
  - rihal/references/debugger-playbook.md
  - rihal/references/verifier-playbook.md
  - rihal/references/remediation-planner-playbook.md
  - rihal/references/code-reviewer-playbook.md
  - rihal/references/code-fixer-playbook.md
  - rihal/references/roadmapper-playbook.md
  - rihal/references/assumptions-analyzer-playbook.md
  - rihal/references/ux-designer-playbook.md
</files>

<action>
These 9 agents are too different to share a single cluster file. Each gets its own playbook file in rihal/references/. The pattern follows the Phase 22 pilot:

1. Read the full agent file.
2. Identify the "heavy middle" — the detailed execution flow, specializations, extended principles, examples, and constraints. This is what moves to the playbook.
3. Write the playbook file with a preamble explaining what it contains.
4. The stub keeps: YAML frontmatter, @-include lines (existing + new playbook), role paragraph (who are you, core responsibilities), and any short dispatch/routing table.

**Per-agent extraction plan:**

**rihal-executor.md (124L → target ≤90L):**
Move to executor-playbook.md:
- "Project-specific constraints to load (every invocation)" section (lines 20-28) — the planning/.gitignore warning, config.yaml loading, context/active.md loading. This is a long mandatory-load block.
- "Execution Flow (Slim)" section (lines 30-39)
- "Deviation Rules (Slim)" section (lines 41-51)
- "Core Guardrails" section (lines 53-58)
- "Checkpoint Return Format (Exact)" block (lines 60-82)
- "Completion Format (Exact)" block (lines 84-91)
- "On-Demand Rule Files" table (lines 93-115)
Keep in stub: YAML frontmatter, @-include lines, `<role>` block, Constraints section (lines 118-125) — the 6 constraint lines are short and serve as fast-lookup reminders.

**rihal-debugger.md (140L → target ≤90L):**
Move to debugger-playbook.md:
- "Philosophy" section: "User = Reporter, You = Investigator" and "Meta-Debugging: Your Own Code" (lines 29-43)
- "Foundation Principles" section (lines 45-48)
- "Cognitive Biases to Avoid" table (lines 50-59)
- "Before Hypothesis Formation" section (lines 61-73)
- "On-Demand Rule Files" table (lines 75-85)
- "Investigation Disciplines" section (lines 87-93)
- "When to Restart" section (lines 95-110)
- "Checkpoint Return Format (Exact)" block (lines 112-131)
Keep in stub: YAML frontmatter, @-include lines, `<role>` block (lines 13-26), Constraints section (lines 133-140).

**rihal-verifier.md (124L → target ≤90L):**
Move to verifier-playbook.md:
- `<project_context>` block (lines 21-26)
- `<core_principle>` block (lines 28-35)
- "Verification Flow (Slim)" section (lines 37-53)
- "Final Status Tables" section (lines 55-71)
- "On-Demand Rule Files" table (lines 73-85)
- "Success Criteria" checklist (lines 101-115)
Keep in stub: YAML frontmatter, @-include lines, `<role>` block (lines 13-19), Critical Rules section (lines 87-99), Constraints section (lines 117-124).

**rihal-remediation-planner.md (123L → target ≤90L):**
Move to remediation-planner-playbook.md:
- "How you think" section (lines 24-27)
- "Specializations" section (lines 36-65): Plan Recovery, Blocker Resolution, Technical Debt Management, Resource Allocation
- "Workflow" steps (lines 73-80)
- "Examples" section (lines 89-107)
Keep in stub: YAML frontmatter, @-include lines, "Who you are" identity (lines 16-19), Response format prefix (lines 29-33), Principles with named rules (lines 65-72), Anti-Patterns/Refuse List (lines 81-88), Redirects (lines 109-113), Constraints (lines 115-123).

**rihal-code-reviewer.md (120L → target ≤90L):**
Move to code-reviewer-playbook.md:
- "How you think" section (lines 24-28)
- "Specializations" section (lines 39-59): Architectural Review, Code Quality, Test Coverage, Security Assessment
- "Workflow" steps (lines 70-76)
- "Examples" section (lines 88-103)
Keep in stub: YAML frontmatter, @-include lines, "Who you are" identity (lines 16-19), Response format (lines 30-33), Principles with named rules (lines 61-68), Anti-Patterns/Refuse List (lines 78-86), Redirects (lines 105-109), Constraints (lines 111-120).

**rihal-code-fixer.md (120L → target ≤90L):**
Move to code-fixer-playbook.md:
- "How you think" section (lines 22-25)
- "Specializations" section (lines 37-57): Style & Pattern Fixes, Refactoring, Test Improvements, Security Hardening
- "Workflow" steps (lines 68-74)
- "Examples" section (lines 83-103)
Keep in stub: YAML frontmatter, @-include lines, "Who you are" identity (lines 14-18), Response format (lines 27-30), Principles with named rules (lines 59-66), Anti-Patterns/Refuse List (lines 75-82), Redirects (lines 105-110), Constraints (lines 112-120).

**rihal-roadmapper.md (120L → target ≤90L):**
Move to roadmapper-playbook.md:
- `<downstream_consumer>` block (lines 34-43): the table showing how /rihal-plan uses ROADMAP.md outputs
- `<philosophy>` block (lines 45-76): Solo Developer workflow, Anti-Enterprise rules, On-Demand Rule Files table
- "Workflow" steps (lines 88-96)
- "Examples" section (lines 108-121)
Keep in stub: YAML frontmatter, @-include lines, `<role>` block (lines 13-33), Principles with named rules (lines 78-87), Anti-Patterns/Refuse List (lines 98-107).

**rihal-assumptions-analyzer.md (117L → target ≤90L):**
Move to assumptions-analyzer-playbook.md:
- `<calibration_tiers>` block (lines 36-53): full_maturity / standard / minimal_decisive tier definitions
- `<process>` block (lines 55-63): the 8-step analysis process
- `<output_format>` block (lines 65-88): the exact return structure template
- `<rules>` block (lines 90-100): the 8 rules
Keep in stub: YAML frontmatter, @-include lines, `<role>` block (lines 13-26), `<input>` block (lines 28-34), `<anti_patterns>` block (lines 102-111), Constraints section (lines 113-117).

**rihal-ux-designer.md (123L → target ≤90L):**
Move to ux-designer-playbook.md:
- "How you think" section (lines 23-28)
- "Specializations" section (lines 37-67): Usability Audits, Design System Work, Accessibility Strategy, Design-Driven Decisions
- "Workflow" steps (lines 78-85)
- "Examples" section (lines 94-106)
Keep in stub: YAML frontmatter, @-include lines, "Who you are" identity (lines 14-18), Response format (lines 29-33), Principles with named rules (lines 68-77), Anti-Patterns/Refuse List (lines 87-93), Redirects (lines 108-112), Constraints (lines 114-123).

**Playbook file preamble template** (customize per agent):
```
# [Agent Name] Playbook

Loaded by `rihal-[name]` via `@-include`. Contains the full execution
methodology, specializations, workflow steps, and examples.

The agent stub holds the role definition, principles, and routing logic.
```

**Mirror each playbook to .rihal/references/:**
After creating all 9 playbooks in rihal/references/, copy each to .rihal/references/:
```bash
for f in executor debugger verifier remediation-planner code-reviewer code-fixer roadmapper assumptions-analyzer ux-designer; do
  cp rihal/references/${f}-playbook.md .rihal/references/${f}-playbook.md
done
```
</action>

<verify>
<automated>
ls rihal/references/*-playbook.md | wc -l && ls .rihal/references/*-playbook.md | wc -l
</automated>
</verify>

<done>
- 9 playbook files in rihal/references/ (ls count = 9)
- 9 playbook files mirrored in .rihal/references/ (ls count = 9)
- Each playbook has a preamble identifying which agent loads it
- No playbook file is empty (each has substantive content moved from the agent)
</done>

<evidence>
lines: rihal/agents/rihal-executor.md:20-115 — project-specific constraints, execution flow, deviation rules, formats, on-demand table (all movable to playbook — 95 lines)
lines: rihal/agents/rihal-debugger.md:29-131 — philosophy, biases, before-hypothesis, investigation disciplines, restart protocol, checkpoint format (all movable — 102 lines)
lines: rihal/agents/rihal-assumptions-analyzer.md:36-100 — calibration tiers, process, output format, rules (all movable — 64 lines)
lines: rihal/references/integration-verification-playbook.md:1-10 — preamble format to follow for all 9 playbooks
creates: rihal/references/executor-playbook.md — no existing file; rihal/references/ has integration-verification-playbook.md as precedent (Phase 22)
</evidence>

---

### Task 3 — Slim execution/specialist agent stubs (Cluster D)
**Type:** auto
**Duration estimate:** 40-50 min

<files>
Files to modify (9 agent stubs):
  - rihal/agents/rihal-executor.md
  - rihal/agents/rihal-debugger.md
  - rihal/agents/rihal-verifier.md
  - rihal/agents/rihal-remediation-planner.md
  - rihal/agents/rihal-code-reviewer.md
  - rihal/agents/rihal-code-fixer.md
  - rihal/agents/rihal-roadmapper.md
  - rihal/agents/rihal-assumptions-analyzer.md
  - rihal/agents/rihal-ux-designer.md
</files>

<action>
For each agent, the playbook file was created in Task 2. Now remove the content that was moved to the playbook and add the @-include line.

**For each agent:**

1. Read the current agent file (verify Task 2 playbook exists and contains the moved content before removing from the stub).
2. Remove the blocks listed in Task 2's extraction plan for that agent.
3. Add @-include line after existing @-includes at the top:
   ```
   @.rihal/references/<agent-name>-playbook.md
   ```
4. Run `wc -l rihal/agents/rihal-<name>.md` — target ≤90 lines.
5. Verify the stub still has: YAML frontmatter, role definition, core responsibilities, @-includes, principles/named-rules, anti-patterns, constraints/redirects.

**Stub structure after slimming (target: ~60-90 lines):**
```
---
[YAML frontmatter]
---

@.rihal/references/response-style.md
@.rihal/references/[other-existing-includes].md
@.rihal/references/<agent-name>-playbook.md

<role>
[Who you are, core responsibilities, spawned by, mandatory initial read]
</role>

## Principles / Named Rules
[Named rules — cite by name when applying]

## Anti-Patterns / Refuse List
[What you never do]

## Redirects
[Who handles what]

## Constraints
[Short operational constraints]
```

**Edit approach:** Use the Edit tool for targeted removals. NEVER rewrite the entire file. Identify the start and end lines of each block to remove (verify with Read first), then remove them. Use `wc -l` after each removal to track progress.

Process one agent at a time. Do not start the next agent until the current one passes the wc -l check.

**IMPORTANT for rihal-executor.md:** The `<role>` block says "Mandatory Initial Read" — keep that. The "Project-specific constraints to load" section is the most important unique block to preserve if it did NOT move to executor-playbook.md. Read executor-playbook.md first to confirm what moved before editing the stub.
</action>

<verify>
<automated>
wc -l rihal/agents/rihal-executor.md rihal/agents/rihal-debugger.md rihal/agents/rihal-verifier.md rihal/agents/rihal-remediation-planner.md rihal/agents/rihal-code-reviewer.md rihal/agents/rihal-code-fixer.md rihal/agents/rihal-roadmapper.md rihal/agents/rihal-assumptions-analyzer.md rihal/agents/rihal-ux-designer.md
</automated>
</verify>

<done>
- All 9 agents: wc -l ≤ 100 (target ≤90)
- All 9 stubs contain the @.rihal/references/<name>-playbook.md @-include line
- Each stub still has its role paragraph, principles section, and constraints section
- No stub is empty or near-empty (minimum ~40 lines of meaningful content)
</done>

<evidence>
lines: rihal/agents/rihal-executor.md:1-125 — full current file; lines 20-115 are the heavy sections identified for extraction to executor-playbook.md
lines: rihal/agents/rihal-debugger.md:1-140 — full current file; lines 29-131 are extractable
lines: rihal/agents/rihal-assumptions-analyzer.md:1-117 — full current file; lines 36-100 are extractable
</evidence>

---

### Task 4 — Commit Cluster C (researchers) and Cluster D (execution/specialist)
**Type:** auto
**Duration estimate:** 10 min

<files>
Files to commit:
  Researcher stubs (4):
    - rihal/agents/rihal-phase-researcher.md
    - rihal/agents/rihal-project-researcher.md
    - rihal/agents/rihal-advisor-researcher.md
    - rihal/agents/rihal-profiler.md
  New playbook files (9 in rihal/references/):
    - rihal/references/executor-playbook.md
    - rihal/references/debugger-playbook.md
    - rihal/references/verifier-playbook.md
    - rihal/references/remediation-planner-playbook.md
    - rihal/references/code-reviewer-playbook.md
    - rihal/references/code-fixer-playbook.md
    - rihal/references/roadmapper-playbook.md
    - rihal/references/assumptions-analyzer-playbook.md
    - rihal/references/ux-designer-playbook.md
  Runtime copies (9 in .rihal/references/):
    - .rihal/references/executor-playbook.md
    - .rihal/references/debugger-playbook.md
    - .rihal/references/verifier-playbook.md
    - .rihal/references/remediation-planner-playbook.md
    - .rihal/references/code-reviewer-playbook.md
    - .rihal/references/code-fixer-playbook.md
    - .rihal/references/roadmapper-playbook.md
    - .rihal/references/assumptions-analyzer-playbook.md
    - .rihal/references/ux-designer-playbook.md
  Execution/specialist stubs (9):
    - rihal/agents/rihal-executor.md
    - rihal/agents/rihal-debugger.md
    - rihal/agents/rihal-verifier.md
    - rihal/agents/rihal-remediation-planner.md
    - rihal/agents/rihal-code-reviewer.md
    - rihal/agents/rihal-code-fixer.md
    - rihal/agents/rihal-roadmapper.md
    - rihal/agents/rihal-assumptions-analyzer.md
    - rihal/agents/rihal-ux-designer.md
</files>

<action>
Stage all 31 files using individual `git add` commands. Use `git add -f` for .rihal/ files:

```bash
# Researcher stubs
git add rihal/agents/rihal-phase-researcher.md
git add rihal/agents/rihal-project-researcher.md
git add rihal/agents/rihal-advisor-researcher.md
git add rihal/agents/rihal-profiler.md

# New playbook reference files (rihal/references/)
git add rihal/references/executor-playbook.md rihal/references/debugger-playbook.md \
  rihal/references/verifier-playbook.md rihal/references/remediation-planner-playbook.md \
  rihal/references/code-reviewer-playbook.md rihal/references/code-fixer-playbook.md \
  rihal/references/roadmapper-playbook.md rihal/references/assumptions-analyzer-playbook.md \
  rihal/references/ux-designer-playbook.md

# Runtime copies (.rihal/references/) — use -f in case .rihal/ is gitignored
git add -f .rihal/references/executor-playbook.md .rihal/references/debugger-playbook.md \
  .rihal/references/verifier-playbook.md .rihal/references/remediation-planner-playbook.md \
  .rihal/references/code-reviewer-playbook.md .rihal/references/code-fixer-playbook.md \
  .rihal/references/roadmapper-playbook.md .rihal/references/assumptions-analyzer-playbook.md \
  .rihal/references/ux-designer-playbook.md

# Execution/specialist stubs
git add rihal/agents/rihal-executor.md rihal/agents/rihal-debugger.md \
  rihal/agents/rihal-verifier.md rihal/agents/rihal-remediation-planner.md \
  rihal/agents/rihal-code-reviewer.md rihal/agents/rihal-code-fixer.md \
  rihal/agents/rihal-roadmapper.md rihal/agents/rihal-assumptions-analyzer.md \
  rihal/agents/rihal-ux-designer.md
```

Verify with `git diff --cached --stat` before committing. Expected: 31 files changed.

Commit message:
```
feat(agents): slim researcher cluster + extract execution agent playbooks (#713)
```
</action>

<verify>
<automated>
git log --oneline -1 && git show --stat HEAD | grep -c "rihal/"
</automated>
</verify>

<done>
- Commit exists referencing #713
- Commit shows at least 22 files changed (4 researcher stubs + 9 playbooks + 9 .rihal/ mirrors + 9 stubs)
</done>

<evidence>
lines: .planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-CONTEXT.md:71 — "Commit per cluster wave, not per agent"
</evidence>

</tasks>

<verification>
```bash
# Researcher agents ≤100 lines
wc -l rihal/agents/rihal-phase-researcher.md \
       rihal/agents/rihal-project-researcher.md \
       rihal/agents/rihal-advisor-researcher.md \
       rihal/agents/rihal-profiler.md

# @-include present in all 4 researcher stubs
grep -l "@.rihal/references/researcher-shared.md" \
  rihal/agents/rihal-phase-researcher.md \
  rihal/agents/rihal-project-researcher.md \
  rihal/agents/rihal-advisor-researcher.md \
  rihal/agents/rihal-profiler.md | wc -l
# Expected: 4

# Execution agents ≤100 lines
wc -l rihal/agents/rihal-executor.md \
       rihal/agents/rihal-debugger.md \
       rihal/agents/rihal-verifier.md \
       rihal/agents/rihal-remediation-planner.md \
       rihal/agents/rihal-code-reviewer.md \
       rihal/agents/rihal-code-fixer.md \
       rihal/agents/rihal-roadmapper.md \
       rihal/agents/rihal-assumptions-analyzer.md \
       rihal/agents/rihal-ux-designer.md

# Playbooks exist in both locations
ls rihal/references/*-playbook.md | wc -l
# Expected: 9 (plus the 3 from Phase 22)
ls .rihal/references/*-playbook.md | wc -l
# Expected: 9 (plus the 3 from Phase 22)
```
</verification>

<success_criteria>
- [ ] rihal-phase-researcher.md ≤ 100 lines with @.rihal/references/researcher-shared.md
- [ ] rihal-project-researcher.md ≤ 100 lines with @.rihal/references/researcher-shared.md
- [ ] rihal-advisor-researcher.md ≤ 100 lines with @.rihal/references/researcher-shared.md
- [ ] rihal-profiler.md ≤ 100 lines with @.rihal/references/researcher-shared.md
- [ ] 9 playbook files created in rihal/references/ (executor, debugger, verifier, remediation-planner, code-reviewer, code-fixer, roadmapper, assumptions-analyzer, ux-designer)
- [ ] All 9 playbooks mirrored to .rihal/references/
- [ ] All 9 execution/specialist stubs ≤ 100 lines with their playbook @-include line
- [ ] One commit with all changed files, references #713
</success_criteria>

<output>
Create `.planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-3-SUMMARY.md`
</output>
