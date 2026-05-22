---
id: 23-1
phase: 23-agent-slim-remaining-24-via-reference-clusters
sprint: 23.1
type: execute
wave: 1
depends_on: []
files_modified: []
creates:
  - rcode/references/persona-engineer-shared.md
  - rcode/references/auditor-shared-checklists.md
  - rcode/references/researcher-shared.md
autonomous: true
requirements: [GH-713]

must_haves:
  truths:
    - Three new cluster reference files exist in rcode/references/ with extracted shared content
    - Each file is self-contained — an executor reading only it gets the full shared rules for that cluster
    - No agent files are modified in this sprint (pure extraction sprint)
    - Both rcode/references/ and .rcode/references/ copies are present for each new file
  artifacts:
    - rcode/references/persona-engineer-shared.md
    - rcode/references/auditor-shared-checklists.md
    - rcode/references/researcher-shared.md
    - .rcode/references/persona-engineer-shared.md
    - .rcode/references/auditor-shared-checklists.md
    - .rcode/references/researcher-shared.md
  key_links:
    - Sprint 23-2 depends on persona-engineer-shared.md and auditor-shared-checklists.md existing
    - Sprint 23-3 depends on researcher-shared.md existing
    - Sprint 23-4 has no cluster file dependency (planner/sprint-checker are unique-content agents)
    - The @-include path agents use is @.rcode/references/<filename>.md (not rcode/references/)
---

<objective>
Create three cluster reference files by extracting the SHARED content that repeats across the engineer-persona cluster, the auditor cluster, and the researcher cluster. This sprint is extraction only — no agent files are touched.

Purpose: Establishes the shared-content foundations that Wave 2 sprints (23-2 and 23-3) will @-include. Without these files Wave 2 cannot run.
Output: Three new .md files in rcode/references/ (and mirrored to .rcode/references/).
</objective>

<execution_context>
@.rcode/workflows/execute.md
@.rcode/templates/summary.md
</execution_context>

<context>
@.planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-CONTEXT.md
@rcode/references/agent-shared-rules.md
</context>

<tasks>

### Task 1 — Create persona-engineer-shared.md (Cluster A)
**Type:** auto
**Duration estimate:** 30-40 min

<files>
Sources to read (all three must be read before writing):
  - rcode/agents/rcode-haitham.md (143L) — lines 40-144
  - rcode/agents/rcode-omar.md (138L) — lines 23-138
  - rcode/agents/rcode-yousef.md (137L) — lines 23-137
Destination to create: rcode/references/persona-engineer-shared.md
</files>

<action>
Read all three engineer-persona agent files before writing a single line. The goal is to extract ONLY the content that is SHARED (structurally identical or semantically identical) across all three. Unique content (the specific heuristics named, the specific emoji, the specific capabilities table entries, the specific examples) stays in the agent stub and is NOT moved to this file.

Shared content to extract into persona-engineer-shared.md:

**Section 1 — Communication discipline (shared across all three)**
All three have a "STRICTLY FORBIDDEN from starting with 'Great', 'Certainly', 'Okay', 'Sure'" rule and a "never end with 'Let me know if you have questions'" rule and a "no emojis beyond [glyph]" rule and a "never make architecture or product decisions" equivalent. Write these as a generic block titled `## Communication Discipline` — reference them without the persona-specific glyph (each stub keeps its own glyph).

**Section 2 — Decision framework structure (shared pattern)**
All three use "Five named heuristics. Cite by name." as their decision framework meta-rule. Extract the META-RULE pattern: how to apply a named heuristic, how to cite it when refusing. Do NOT copy any specific heuristic (Three-paths check, Match-existing-pattern, Critical-path trace) — those stay in individual stubs. Write as `## Named-Heuristic Protocol`.

**Section 3 — Anti-pattern refuse-list format (shared pattern)**
All three have an Anti-Patterns section with "State the rule by name when refusing." as the meta-instruction. Extract that meta-instruction and format template only. Write as `## Anti-Pattern Enforcement Protocol`.

**Section 4 — Workflow meta-pattern (shared steps that all three share)**
All three open their Workflow with: (1) Read the actual code before any proposal, (2) Grep/find existing patterns before inventing new ones, (3) Cite the framework heuristic by name when refusing. Extract these three universal steps as `## Engineer Workflow Invariants`.

**Section 5 — Constraints boilerplate (shared across all three)**
All three have the exact same operational constraints:
- MUST `Read` before proposing a change
- File:line citations for every specific claim
- Cite the framework heuristic by name when refusing or recommending
- STRICTLY FORBIDDEN from starting with "Great", "Certainly", "Okay", "Sure"
- Never end with "Let me know if you have questions"
- No emojis beyond [persona glyph]
- Never make [out-of-lane] decisions

Write the non-glyph-specific ones verbatim as `## Shared Operational Constraints`. The "no emojis beyond [glyph]" constraint stays in the stub because the glyph differs.

**What NOT to include in this file:**
- The persona identity paragraph (unique to each)
- The capabilities table (unique to each)
- The specific named heuristics (unique to each)
- The specific examples (happy/edge/negative — unique to each)
- The specific redirects table (partially unique)
- The persona emoji glyph

File preamble to write at top of persona-engineer-shared.md:
```
# Engineer Persona Shared Rules

Loaded by `rcode-haitham`, `rcode-omar`, and `rcode-yousef` via `@-include`.
Contains the shared communication discipline, heuristic protocol, and
operational constraints that all three engineer personas inherit.

Persona-specific content (identity, capabilities, named heuristics,
examples, redirects) lives in each agent's own file.
```
</action>

<verify>
<automated>
wc -l /home/hanzla/development/rcode/rcode/references/persona-engineer-shared.md && grep -c "## " /home/hanzla/development/rcode/rcode/references/persona-engineer-shared.md && test -f /home/hanzla/development/rcode/.rcode/references/persona-engineer-shared.md && echo "mirror OK"
</automated>
</verify>

<done>
- rcode/references/persona-engineer-shared.md exists and has at least 5 sections
- .rcode/references/persona-engineer-shared.md is a copy (same content, same wc -l)
- File contains NO persona-specific heuristic names (no "Three-paths check", "Critical-path trace", "Match-existing-pattern")
- File contains Communication Discipline, Named-Heuristic Protocol, Anti-Pattern Enforcement Protocol, Engineer Workflow Invariants, Shared Operational Constraints sections
</done>

<evidence>
lines: rcode/agents/rcode-haitham.md:40-143 — identity + principles + decision framework + anti-patterns + capabilities + workflow + constraints (unique + shared content mixed)
lines: rcode/agents/rcode-omar.md:23-138 — same structural pattern, different named heuristics
lines: rcode/agents/rcode-yousef.md:23-137 — same structural pattern, different named heuristics
grep: rg "STRICTLY FORBIDDEN from starting" rcode/agents/ → 3 hits (haitham:67, omar:62, yousef:66) — confirms identical shared rule
grep: rg "Five named heuristics. Cite by name." rcode/agents/ → 3 hits (haitham:49, omar:45, yousef:48) — confirms shared meta-pattern
creates: rcode/references/persona-engineer-shared.md — no existing file at this path; no existing file covers engineer-persona shared rules (agent-shared-rules.md covers universal rules, not persona-cluster rules)
</evidence>

---

### Task 2 — Create auditor-shared-checklists.md (Cluster B)
**Type:** auto
**Duration estimate:** 35-45 min

<files>
Sources to read (all six must be read before writing):
  - rcode/agents/rcode-nyquist-auditor.md (182L)
  - rcode/agents/rcode-docs-auditor.md (182L)
  - rcode/agents/rcode-ui-auditor.md (124L)
  - rcode/agents/rcode-security-auditor.md (122L)
  - rcode/agents/rcode-security-adversary.md (127L)
  - rcode/agents/rcode-edge-case-hunter.md (121L)
Destination to create: rcode/references/auditor-shared-checklists.md
</files>

<action>
Read all six auditor agent files before writing. Extract only the SHARED content — structural patterns that appear in multiple agents in identical or near-identical form.

Shared content to extract into auditor-shared-checklists.md:

**Section 1 — Four pressure points meta-structure**
Five of the six auditors (docs, ui, security, security-adversary, edge-case-hunter) open their "How you think" block with "Every [X] has four pressure points:". The meta-pattern is identical even though the points differ. Extract the meta-instruction: "Structure your audit output around four pressure points for the audit type. Every finding must connect to one of the four." Write as `## Four-Pressure-Points Audit Structure`.

**Section 2 — Evidence-based findings format (shared across all six)**
All six require file:line citations. The nyquist-auditor uses test evidence. The docs-auditor uses code-vs-doc evidence. The security auditor uses control-vs-standard evidence. All share: NO "this code seems to have issues" — every finding cites a specific location. Extract this as `## Evidence Requirements for Audit Findings`.

**Section 3 — Severity classification (shared 4 of 6)**
Docs-auditor, edge-case-hunter, security-auditor, and code-reviewer share a Blocker/Major/Minor severity model (or Critical/Major/Minor/Trivial variant). Security-adversary and nyquist-auditor use different classification systems. Extract the SHARED Blocker/Major/Minor template as `## Standard Severity Classification` with a note that agents using a different scheme (nyquist, security-adversary) ignore this section.

**Section 4 — Audit scope discipline (shared across all)**
All auditors share: "You do not write/fix/implement. You identify/audit/flag. Route fixes to the appropriate agent." Extract this as `## Audit Role Boundary`.

**Section 5 — Structured output format (shared pattern)**
All auditors produce structured output with a consistent header: "Coverage/Scope summary → [type-specific sections] → Required fixes → Optional improvements". Extract the meta-structure (not the content) as `## Audit Output Structure`.

**Section 6 — Shared operational constraints (shared boilerplate)**
All six share:
- No emojis beyond [persona glyph]
- No pleasantries or closing offers
- Audit against standards/evidence, not personal preference
- Distinguish presence from correctness
Write as `## Shared Auditor Constraints`.

**What NOT to include:**
- Specific audit checklists (OWASP, WCAG, etc. — these are agent-specific)
- Specific pressure points content (shared structure, not shared content)
- The nyquist execution_flow (entirely unique — gap analysis loop)
- The docs-auditor mode_feature_drift and mode_phase_status blocks (unique extensions)
- Specific examples (unique to each)

File preamble:
```
# Auditor Shared Checklists

Loaded by rcode-nyquist-auditor, rcode-docs-auditor, rcode-ui-auditor,
rcode-security-auditor, rcode-security-adversary, and rcode-edge-case-hunter
via `@-include`. Contains the shared audit methodology, evidence requirements,
severity model, and role boundary that all auditors inherit.

Auditor-specific content (domain checklists, specific pressure points,
execution flow, examples) lives in each agent's own file.
```
</action>

<verify>
<automated>
wc -l /home/hanzla/development/rcode/rcode/references/auditor-shared-checklists.md && test -f /home/hanzla/development/rcode/.rcode/references/auditor-shared-checklists.md && echo "mirror OK" && grep "Audit Role Boundary\|Evidence Requirements\|Severity Classification" /home/hanzla/development/rcode/rcode/references/auditor-shared-checklists.md
</automated>
</verify>

<done>
- rcode/references/auditor-shared-checklists.md exists with at least 5 sections
- .rcode/references/auditor-shared-checklists.md is a copy
- Contains: Four-Pressure-Points Audit Structure, Evidence Requirements for Audit Findings, Standard Severity Classification, Audit Role Boundary, Audit Output Structure, Shared Auditor Constraints
- Does NOT contain OWASP checklists, WCAG checklists, nyquist gap-analysis loop, or docs-auditor JSON schemas
</done>

<evidence>
lines: rcode/agents/rcode-docs-auditor.md:23-28 — "Every documentation audit has four pressure points" pattern (shared structure)
lines: rcode/agents/rcode-security-auditor.md:23-28 — identical "four pressure points" pattern
lines: rcode/agents/rcode-edge-case-hunter.md:23-28 — identical pattern
grep: rg "do not write\|do not implement\|You do not" rcode/agents/rcode-docs-auditor.md rcode/agents/rcode-security-auditor.md rcode/agents/rcode-edge-case-hunter.md rcode/agents/rcode-security-adversary.md → 4 hits confirming shared role-boundary rule
grep: rg "No pleasantries or closing offers" rcode/agents/ → 6 hits (all auditors share this constraint)
creates: rcode/references/auditor-shared-checklists.md — no existing file; agent-shared-rules.md covers universal rules only, not auditor-cluster rules
</evidence>

---

### Task 3 — Create researcher-shared.md (Cluster C)
**Type:** auto
**Duration estimate:** 25-35 min

<files>
Sources to read (all four must be read before writing):
  - rcode/agents/rcode-phase-researcher.md (129L)
  - rcode/agents/rcode-project-researcher.md (128L)
  - rcode/agents/rcode-advisor-researcher.md (116L)
  - rcode/agents/rcode-profiler.md (117L)
Destination to create: rcode/references/researcher-shared.md
</files>

<action>
Read all four researcher-cluster agents before writing. Extract only SHARED content.

Shared content to extract into researcher-shared.md:

**Section 1 — Evidence-drives-conclusions methodology**
All four researchers share the discipline: gather evidence first, form conclusions from evidence. Do NOT start with a hypothesis and find supporting evidence. The phase-researcher calls it "Prescriptive-not-exploratory." The project-researcher calls it "Evidence-drives-conclusions." The advisor-researcher calls it "gather evidence, form conclusions." The profiler calls it "Data-grounded." Extract the SHARED meta-principle as `## Research Methodology: Evidence First`.

**Section 2 — Confidence labeling (shared 3 of 4)**
Phase-researcher, project-researcher, and advisor-researcher all use HIGH/MEDIUM/LOW confidence labels for findings. The profiler uses "MEDIUM confidence" in examples. Extract the shared confidence-labeling protocol as `## Confidence Labeling Protocol` — how to apply labels, what each means, when to use LOW.

**Section 3 — Mandatory Initial Read protocol (shared across all four)**
All four researchers share: "If the prompt contains a `<files_to_read>` block, you MUST use the `Read` tool to load every file listed there before performing any other actions." Extract this verbatim as `## Mandatory Initial Read Protocol`.

**Section 4 — Output discipline: prescriptive not exploratory**
Phase-researcher: "Use X not Consider X or Y." Project-researcher: "Be comprehensive but opinionated. 'Use X because Y' not 'Options are X, Y, Z.'" Advisor-researcher: produces single comparison table per area. Profiler: "Insight-not-decision." All four share the meta-rule of being decisive, not presenting menus. Extract as `## Output Discipline: Be Decisive`.

**Section 5 — Scope discipline (shared anti-pattern)**
All four researchers share: do not expand scope, do not make decisions (that's someone else's lane), do not explore beyond the assigned area/phase. Extract as `## Scope Discipline for Researchers`.

**Section 6 — Shared constraints boilerplate**
All four share:
- Don't present output beyond what was asked
- Don't invent findings — ground in actual data/code/evidence
- Route decisions to the appropriate decision-maker
Write as `## Shared Researcher Constraints`.

**What NOT to include:**
- Phase-researcher's RESEARCH.md output format (unique)
- Project-researcher's 5-file output structure (SUMMARY.md, STACK.md, etc.) — unique
- Advisor-researcher's comparison table format (unique)
- Profiler's persona/segmentation methodology (unique)
- Any agent-specific workflow steps (the how differs; the meta-discipline is shared)
- Calibration tiers (advisor-researcher and assumptions-analyzer specific)

File preamble:
```
# Researcher Shared Rules

Loaded by rcode-phase-researcher, rcode-project-researcher,
rcode-advisor-researcher, and rcode-profiler via `@-include`.
Contains the shared research methodology, confidence labeling,
evidence discipline, and scope constraints all researchers inherit.

Agent-specific output formats, workflows, and domain rules live
in each agent's own file.
```
</action>

<verify>
<automated>
wc -l /home/hanzla/development/rcode/rcode/references/researcher-shared.md && test -f /home/hanzla/development/rcode/.rcode/references/researcher-shared.md && echo "mirror OK" && grep "Mandatory Initial Read\|Confidence Labeling\|Evidence First" /home/hanzla/development/rcode/rcode/references/researcher-shared.md
</automated>
</verify>

<done>
- rcode/references/researcher-shared.md exists with at least 5 sections
- .rcode/references/researcher-shared.md is a copy
- Contains: Research Methodology Evidence First, Confidence Labeling Protocol, Mandatory Initial Read Protocol, Output Discipline Be Decisive, Scope Discipline for Researchers, Shared Researcher Constraints
- Does NOT contain any agent's output format schema or agent-specific workflow steps
</done>

<evidence>
lines: rcode/agents/rcode-phase-researcher.md:93-96 — "Prescriptive-not-exploratory" and "Confidence-labeled" named rules (shared meta-pattern)
lines: rcode/agents/rcode-project-researcher.md:88-91 — "Evidence-drives-conclusions" and "Confident-but-honest" named rules (semantically identical to phase-researcher pattern)
lines: rcode/agents/rcode-phase-researcher.md:19-21 — "If the prompt contains a <files_to_read> block, you MUST use the Read tool" (verbatim identical in project-researcher:17-19)
grep: rg "files_to_read" rcode/agents/rcode-phase-researcher.md rcode/agents/rcode-project-researcher.md rcode/agents/rcode-assumptions-analyzer.md → 3 hits confirming shared mandatory-read protocol
grep: rg "HIGH confidence\|MEDIUM confidence\|LOW confidence" rcode/agents/ → hits in phase-researcher, project-researcher, advisor-researcher confirming shared confidence labeling
creates: rcode/references/researcher-shared.md — no existing file; no existing reference covers researcher-cluster shared rules
</evidence>

---

### Task 4 — Mirror all three files to .rcode/references/
**Type:** auto
**Duration estimate:** 5-10 min

<files>
Sources:
  - rcode/references/persona-engineer-shared.md (just created)
  - rcode/references/auditor-shared-checklists.md (just created)
  - rcode/references/researcher-shared.md (just created)
Destinations:
  - .rcode/references/persona-engineer-shared.md
  - .rcode/references/auditor-shared-checklists.md
  - .rcode/references/researcher-shared.md
</files>

<action>
The @-include paths that agents use at runtime point to `.rcode/references/` (with the leading dot), not `rcode/references/`. The `rcode/references/` directory is the source-of-truth copy that gets committed. The `.rcode/references/` copy is the runtime copy the agent loader resolves.

Copy each file:
```bash
cp rcode/references/persona-engineer-shared.md .rcode/references/persona-engineer-shared.md
cp rcode/references/auditor-shared-checklists.md .rcode/references/auditor-shared-checklists.md
cp rcode/references/researcher-shared.md .rcode/references/researcher-shared.md
```

Verify content is identical (diff should be empty):
```bash
diff rcode/references/persona-engineer-shared.md .rcode/references/persona-engineer-shared.md
diff rcode/references/auditor-shared-checklists.md .rcode/references/auditor-shared-checklists.md
diff rcode/references/researcher-shared.md .rcode/references/researcher-shared.md
```

Do NOT use absolute paths in the cp commands — use paths relative to the repo root (the working directory).
</action>

<verify>
<automated>
diff /home/hanzla/development/rcode/rcode/references/persona-engineer-shared.md /home/hanzla/development/rcode/.rcode/references/persona-engineer-shared.md && diff /home/hanzla/development/rcode/rcode/references/auditor-shared-checklists.md /home/hanzla/development/rcode/.rcode/references/auditor-shared-checklists.md && diff /home/hanzla/development/rcode/rcode/references/researcher-shared.md /home/hanzla/development/rcode/.rcode/references/researcher-shared.md && echo "all mirrors identical"
</automated>
</verify>

<done>
- All three diffs return empty (files are byte-for-byte identical)
- .rcode/references/ directory now has all three new files alongside existing references
</done>

<evidence>
lines: .planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-CONTEXT.md:67-68 — "Each cluster reference file goes in rcode/references/ (source) AND .rcode/references/ (runtime copy)"
grep: rg "@.rcode/references/" rcode/agents/rcode-integration-checker.md → confirms @.rcode/references/ is the runtime include path format used by all agents
</evidence>

---

### Task 5 — Commit cluster reference files
**Type:** auto
**Duration estimate:** 5 min

<files>
Files to stage and commit:
  - rcode/references/persona-engineer-shared.md
  - rcode/references/auditor-shared-checklists.md
  - rcode/references/researcher-shared.md
  - .rcode/references/persona-engineer-shared.md
  - .rcode/references/auditor-shared-checklists.md
  - .rcode/references/researcher-shared.md
</files>

<action>
Stage only the six new reference files. Do NOT use `git add -A` or `git add .`. Stage each file individually:

```bash
git add rcode/references/persona-engineer-shared.md
git add rcode/references/auditor-shared-checklists.md
git add rcode/references/researcher-shared.md
git add -f .rcode/references/persona-engineer-shared.md
git add -f .rcode/references/auditor-shared-checklists.md
git add -f .rcode/references/researcher-shared.md
```

Use `-f` for the `.rcode/` copies in case `.rcode/` is in `.gitignore`.

Commit message:
```
feat(agents): create cluster reference files for engineer, auditor, researcher personas (#713)
```
</action>

<verify>
<automated>
git log --oneline -1
</automated>
</verify>

<done>
- Commit exists with the reference files
- `git show --stat HEAD` lists all six files
- No agent stub files appear in the commit (those come in Wave 2)
</done>

<evidence>
lines: .planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-CONTEXT.md:71 — "Commit per cluster wave, not per agent"
grep: rg "commit_planning" /home/hanzla/development/rcode/.rcode/config.yaml — read to determine if git add -f is needed for .rcode/ files
</evidence>

</tasks>

<verification>
```bash
# All three source files exist
test -f rcode/references/persona-engineer-shared.md && \
test -f rcode/references/auditor-shared-checklists.md && \
test -f rcode/references/researcher-shared.md && \
echo "source files OK"

# All three runtime copies exist
test -f .rcode/references/persona-engineer-shared.md && \
test -f .rcode/references/auditor-shared-checklists.md && \
test -f .rcode/references/researcher-shared.md && \
echo "runtime copies OK"

# No agent stubs modified in this sprint
git diff HEAD~1 HEAD --name-only | grep "rcode/agents/" && echo "FAIL: agent stubs modified" || echo "OK: no agent stubs touched"
```
</verification>

<success_criteria>
- [ ] rcode/references/persona-engineer-shared.md created with preamble + 5 sections
- [ ] rcode/references/auditor-shared-checklists.md created with preamble + 6 sections
- [ ] rcode/references/researcher-shared.md created with preamble + 6 sections
- [ ] All three mirrored byte-for-byte to .rcode/references/
- [ ] Zero agent stub files modified
- [ ] One commit: "feat(agents): create cluster reference files for engineer, auditor, researcher personas (#713)"
</success_criteria>

<output>
Create `.planning/phases/23-agent-slim-remaining-24-via-reference-clusters/23-1-SUMMARY.md`
</output>
