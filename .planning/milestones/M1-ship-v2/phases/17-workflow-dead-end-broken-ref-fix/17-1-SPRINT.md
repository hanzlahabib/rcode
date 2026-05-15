---
phase: 17
sprint: 17.1
type: execute
autonomous: true
wave: 1
gap_closure: true
requirements: []

must_haves:
  truths:
    - "Every dead-end workflow has an On Completion section with at least one /rihal-* suggestion"
    - "grep -rL 'On Completion' rihal/workflows/add-todo.md rihal/workflows/debug.md rihal/workflows/diff.md rihal/workflows/session-report.md rihal/workflows/show.md rihal/workflows/audit-fix.md rihal/workflows/memory-distill.md rihal/workflows/review-adversarial.md rihal/workflows/workstream.md | wc -l returns 0"
    - "rihal/workflows/scan.md contains an On Completion section"
    - "rihal/workflows/verify-work.md contains execute and next routing after gap closure"
    - "rihal/workflows/create-prd.md exists as a thin stub"
    - "rihal/workflows/edit-prd.md exists as a thin stub"
    - "rihal/workflows/validate-prd.md exists as a thin stub"
    - "rihal/workflows/create-architecture.md exists as a thin stub"
    - "rihal/workflows/scaffold-project.md exists as a thin stub"
    - "rihal/workflows/retrospective.md exists as a thin stub"
    - "rihal/workflows/help.md contains check-implementation-readiness and karpathy-audit entries"
  artifacts:
    - path: "rihal/workflows/add-todo.md"
      provides: "On Completion section"
    - path: "rihal/workflows/debug.md"
      provides: "On Completion section"
    - path: "rihal/workflows/diff.md"
      provides: "On Completion section"
    - path: "rihal/workflows/session-report.md"
      provides: "On Completion section"
    - path: "rihal/workflows/show.md"
      provides: "On Completion section"
    - path: "rihal/workflows/audit-fix.md"
      provides: "On Completion section"
    - path: "rihal/workflows/memory-distill.md"
      provides: "On Completion section"
    - path: "rihal/workflows/review-adversarial.md"
      provides: "On Completion section"
    - path: "rihal/workflows/workstream.md"
      provides: "On Completion section"
    - path: "rihal/workflows/scan.md"
      provides: "On Completion section"
    - path: "rihal/workflows/verify-work.md"
      provides: "Gap-closure routing to execute"
    - path: "rihal/workflows/create-prd.md"
      provides: "Thin stub — delegates to skill"
    - path: "rihal/workflows/edit-prd.md"
      provides: "Thin stub — delegates to skill"
    - path: "rihal/workflows/validate-prd.md"
      provides: "Thin stub — delegates to skill"
    - path: "rihal/workflows/create-architecture.md"
      provides: "Thin stub — delegates to skill"
    - path: "rihal/workflows/scaffold-project.md"
      provides: "Thin stub — delegates to skill"
    - path: "rihal/workflows/retrospective.md"
      provides: "Thin stub — delegates to skill"
    - path: "rihal/workflows/help.md"
      provides: "11 orphaned workflow entries added"
  key_links:
    - from: "init.md RIHLA.md gap"
      to: "fixed in f1b30ac"
      why: "reference"
    - from: "execute.md add-tests gap"
      to: "fixed in prior commit"
      why: "reference"
---

# Sprint 17.1 — Workflow Dead-End & Broken-Ref Fix

## Background

Audit (2026-05-01) surfaced three classes of gaps in rihal/workflows/:

- **Dead ends (9):** workflows that complete but offer no next step — user stranded
- **Missing chains (2):** workflows that should route forward but don't
- **Broken refs (6):** /rihal-X commands referenced in do.md/autonomous.md/help.md but no workflow .md exists
- **Orphaned (11):** workflows that exist and work but appear in no routing table — undiscoverable

Already fixed before this phase:
- `init.md`: RIHLA.md missing on returning state (f1b30ac)
- `execute.md`: add-tests never offered at phase completion (prior commit)

## Wave 1 — Dead ends: append "On Completion" to 9 workflows

Append the following block verbatim to the END of each workflow file listed (after the final step / success_criteria, before any closing process tags):

---

**`rihal/workflows/add-todo.md`** — append:

```markdown
## On Completion

/rihal-check-todos — review all open todos
/rihal-next — get suggested next action
/rihal-progress — see overall roadmap status
```

---

**`rihal/workflows/debug.md`** — append:

```markdown
## On Completion

/rihal-code-review {phase} — review the fix before committing
/rihal-verify-work {phase} — re-run UAT after the fix
/rihal-execute {phase} --gaps-only — re-run just the failing plans
```

---

**`rihal/workflows/diff.md`** — append:

```markdown
## On Completion

/rihal-plan {phase} — plan fixes for changes seen in the diff
/rihal-execute {phase} — execute the phase
/rihal-progress — see full roadmap status
```

---

**`rihal/workflows/session-report.md`** — append:

```markdown
## On Completion

/rihal-progress — see full roadmap status
/rihal-next — get suggested next action
/rihal-resume-work — pick up where you left off
```

---

**`rihal/workflows/show.md`** — append:

```markdown
## On Completion

/rihal-execute {phase} — execute this phase
/rihal-plan {phase} — revise the plan
/rihal-progress — see full roadmap
```

---

**`rihal/workflows/audit-fix.md`** — append:

```markdown
## On Completion

/rihal-audit — re-run audit to verify fixes applied correctly
/rihal-code-review — review the auto-applied changes
/rihal-progress — see overall project state
```

---

**`rihal/workflows/memory-distill.md`** — append:

```markdown
## On Completion

/rihal-memory-audit — audit all memory files for staleness
/rihal-next — get suggested next action
/rihal-resume-work — continue with current work context
```

---

**`rihal/workflows/review-adversarial.md`** — append:

```markdown
## On Completion

/rihal-plan {phase} --reviews — incorporate findings into next plan
/rihal-code-review-fix — apply suggested fixes
/rihal-council — escalate contested findings to the full council
```

---

**`rihal/workflows/workstream.md`** — append:

```markdown
## On Completion

/rihal-plan {next_phase} — plan next phase in this workstream
/rihal-next — get suggested next action
/rihal-progress — see all workstreams and phases
```

---

## Wave 2 — Missing chains in existing workflows (2 files)

**`rihal/workflows/scan.md`** — append at the very end:

```markdown
## On Completion

/rihal-council {your question} — strategic question about what was found
/rihal-plan {N} — plan fixes for discovered issues
/rihal-explore — go deeper with socratic analysis
/rihal-next — get suggested next action
```

**`rihal/workflows/verify-work.md`** — find the final step (Step that presents gap closure / success). After the gap-resolved block, add:

```markdown
## On Completion

When gaps resolved and re-verified:
  /rihal-execute {phase} --gaps-only — re-execute just the gap plans
  /rihal-progress — see updated phase status

When all gaps pass:
  /rihal-next — advance to next phase
  /rihal-plan {next} — plan the next phase
  /rihal-add-tests {phase} — generate tests for this phase
```

---

## Wave 3 — Thin workflow stubs for broken refs (6 new files)

Create each file. Find the correct skill tier by checking:
```bash
find .rihal/skills/actions -path "*rihal-{name}*" -name "workflow.md" 2>/dev/null | head -1
```

**`rihal/workflows/create-prd.md`**:
```markdown
# Workflow: rihal-create-prd

<purpose>
Create a Product Requirements Document from scratch through guided facilitation. Delegates to the rihal-create-prd skill.
</purpose>

## Execution

Read the installed skill:

```bash
find .rihal/skills/actions -path "*rihal-create-prd/workflow.md" 2>/dev/null | head -1
```

Then follow the workflow at that path. If not found:
```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rihal-validate-prd — validate the PRD for completeness
/rihal-create-milestone — build the milestone roadmap from the PRD
/rihal-edit-prd — revise the PRD
```

**`rihal/workflows/edit-prd.md`**:
```markdown
# Workflow: rihal-edit-prd

<purpose>
Update an existing PRD with revisions or clarifications. Delegates to the rihal-edit-prd skill.
</purpose>

## Execution

```bash
find .rihal/skills/actions -path "*rihal-edit-prd/workflow.md" 2>/dev/null | head -1
```

Follow the workflow at that path.

## On Completion

/rihal-validate-prd — validate after edits
/rihal-plan — re-plan phases from the updated PRD
```

**`rihal/workflows/validate-prd.md`**:
```markdown
# Workflow: rihal-validate-prd

<purpose>
Validate an existing PRD for completeness and consistency. Delegates to the rihal-validate-prd skill.
</purpose>

## Execution

```bash
find .rihal/skills/actions -path "*rihal-validate-prd/workflow.md" 2>/dev/null | head -1
```

Follow the workflow at that path.

## On Completion

/rihal-create-milestone — build roadmap from the validated PRD
/rihal-edit-prd — fix validation findings
```

**`rihal/workflows/create-architecture.md`**:
```markdown
# Workflow: rihal-create-architecture

<purpose>
Write an Architecture Decision Record (ADR) or system design document. Delegates to the rihal-create-architecture skill.
</purpose>

## Execution

```bash
find .rihal/skills/actions -path "*rihal-create-architecture/workflow.md" 2>/dev/null | head -1
```

Follow the workflow at that path.

## On Completion

/rihal-plan — plan phases from the architecture
/rihal-council — review the architecture with the full council
```

**`rihal/workflows/scaffold-project.md`**:
```markdown
# Workflow: rihal-scaffold-project

<purpose>
Scaffold a new project from the official Rihal template repo. Delegates to the rihal-scaffold-project skill.
</purpose>

## Execution

```bash
find .rihal/skills/actions -path "*rihal-scaffold-project/workflow.md" 2>/dev/null | head -1
```

Follow the workflow at that path.

## On Completion

/rihal-init — configure Rihal for the scaffolded project
/rihal-new-project {name} — design the project with full facilitation
```

**`rihal/workflows/retrospective.md`**:
```markdown
# Workflow: rihal-retrospective

<purpose>
Run an epic retrospective and produce owned action items. Delegates to the rihal-retrospective skill.
</purpose>

## Execution

```bash
find .rihal/skills/actions -path "*rihal-retrospective/workflow.md" 2>/dev/null | head -1
```

Follow the workflow at that path.

## On Completion

/rihal-correct-course — act on retrospective findings
/rihal-plan {next} — plan the next phase with retro learnings applied
/rihal-note — capture retro summary in memory
```

---

## Wave 4 — Wire orphaned workflows into help.md (1 file)

**`rihal/workflows/help.md`** — add 11 entries to appropriate sections.

Find the ENGINEERING RIGOR section in help.md and add after existing entries:
```
| `/rihal-check-implementation-readiness` | Check if a feature is ready to implement before writing code. |
| `/rihal-karpathy-audit` | Audit code against Karpathy engineering guidelines. |
| `/rihal-diagnose-issues` | Triage and diagnose systemic issues in the codebase. |
```

Find the PLANNING section and add:
```
| `/rihal-discuss-phase-power` | Deep-dive phase discussion with full research + assumptions analysis. |
```

Find or create a MEMORY section and add:
```
| `/rihal-memory-init` | Initialize the memory bank for a project (first-time setup). |
| `/rihal-memory-update` | Update a specific memory entry. |
| `/rihal-memory-audit` | Audit all memory files for staleness and gaps. |
| `/rihal-memory-distill` | Distill verbose memory into concise, LLM-friendly summaries. |
```

Find the PROJECT SETUP section and add:
```
| `/rihal-new-project-research` | Research phase for new project (subcommand of new-project). |
| `/rihal-new-project-roadmap` | Roadmap creation phase for new project (subcommand of new-project). |
```

Find the REVIEW section and add:
```
| `/rihal-review-edge-case-hunter` | Hunt for edge cases and boundary conditions before execution. |
```

---

## Commit Strategy

All changes in a single commit:
```
fix(workflows): close dead-end, broken-ref, and orphan gaps — phase 17
```

Stage explicitly:
- All 9 dead-end workflow files
- scan.md and verify-work.md
- 6 new stub workflow files
- help.md

## Acceptance Criteria

- [ ] 9 dead-end workflows each have an `## On Completion` section
- [ ] scan.md has `## On Completion`
- [ ] verify-work.md has gap-closure routing with execute + add-tests
- [ ] 6 thin stubs created and contain `## On Completion`
- [ ] help.md has 11 new entries (check-implementation-readiness, karpathy-audit, diagnose-issues, discuss-phase-power, memory-init, memory-update, memory-audit, memory-distill, new-project-research, new-project-roadmap, review-edge-case-hunter)
- [ ] No existing workflow logic removed or altered
- [ ] Single commit with correct type/scope
