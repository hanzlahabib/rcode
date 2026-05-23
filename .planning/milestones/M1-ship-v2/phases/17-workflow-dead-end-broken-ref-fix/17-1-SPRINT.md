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
    - "Every dead-end workflow has an On Completion section with at least one /rcode-* suggestion"
    - "grep -rL 'On Completion' rcode/workflows/add-todo.md rcode/workflows/debug.md rcode/workflows/diff.md rcode/workflows/session-report.md rcode/workflows/show.md rcode/workflows/audit-fix.md rcode/workflows/memory-distill.md rcode/workflows/review-adversarial.md rcode/workflows/workstream.md | wc -l returns 0"
    - "rcode/workflows/scan.md contains an On Completion section"
    - "rcode/workflows/verify-work.md contains execute and next routing after gap closure"
    - "rcode/workflows/create-prd.md exists as a thin stub"
    - "rcode/workflows/edit-prd.md exists as a thin stub"
    - "rcode/workflows/validate-prd.md exists as a thin stub"
    - "rcode/workflows/create-architecture.md exists as a thin stub"
    - "rcode/workflows/scaffold-project.md exists as a thin stub"
    - "rcode/workflows/retrospective.md exists as a thin stub"
    - "rcode/workflows/help.md contains check-implementation-readiness and karpathy-audit entries"
  artifacts:
    - path: "rcode/workflows/add-todo.md"
      provides: "On Completion section"
    - path: "rcode/workflows/debug.md"
      provides: "On Completion section"
    - path: "rcode/workflows/diff.md"
      provides: "On Completion section"
    - path: "rcode/workflows/session-report.md"
      provides: "On Completion section"
    - path: "rcode/workflows/show.md"
      provides: "On Completion section"
    - path: "rcode/workflows/audit-fix.md"
      provides: "On Completion section"
    - path: "rcode/workflows/memory-distill.md"
      provides: "On Completion section"
    - path: "rcode/workflows/review-adversarial.md"
      provides: "On Completion section"
    - path: "rcode/workflows/workstream.md"
      provides: "On Completion section"
    - path: "rcode/workflows/scan.md"
      provides: "On Completion section"
    - path: "rcode/workflows/verify-work.md"
      provides: "Gap-closure routing to execute"
    - path: "rcode/workflows/create-prd.md"
      provides: "Thin stub — delegates to skill"
    - path: "rcode/workflows/edit-prd.md"
      provides: "Thin stub — delegates to skill"
    - path: "rcode/workflows/validate-prd.md"
      provides: "Thin stub — delegates to skill"
    - path: "rcode/workflows/create-architecture.md"
      provides: "Thin stub — delegates to skill"
    - path: "rcode/workflows/scaffold-project.md"
      provides: "Thin stub — delegates to skill"
    - path: "rcode/workflows/retrospective.md"
      provides: "Thin stub — delegates to skill"
    - path: "rcode/workflows/help.md"
      provides: "11 orphaned workflow entries added"
  key_links:
    - from: "init.md JOURNEY.md gap"
      to: "fixed in f1b30ac"
      why: "reference"
    - from: "execute.md add-tests gap"
      to: "fixed in prior commit"
      why: "reference"
---

# Sprint 17.1 — Workflow Dead-End & Broken-Ref Fix

## Background

Audit (2026-05-01) surfaced three classes of gaps in rcode/workflows/:

- **Dead ends (9):** workflows that complete but offer no next step — user stranded
- **Missing chains (2):** workflows that should route forward but don't
- **Broken refs (6):** /rcode-X commands referenced in do.md/autonomous.md/help.md but no workflow .md exists
- **Orphaned (11):** workflows that exist and work but appear in no routing table — undiscoverable

Already fixed before this phase:
- `init.md`: JOURNEY.md missing on returning state (f1b30ac)
- `execute.md`: add-tests never offered at phase completion (prior commit)

## Wave 1 — Dead ends: append "On Completion" to 9 workflows

Append the following block verbatim to the END of each workflow file listed (after the final step / success_criteria, before any closing process tags):

---

**`rcode/workflows/add-todo.md`** — append:

```markdown
## On Completion

/rcode-check-todos — review all open todos
/rcode-next — get suggested next action
/rcode-progress — see overall roadmap status
```

---

**`rcode/workflows/debug.md`** — append:

```markdown
## On Completion

/rcode-review {phase} — review the fix before committing
/rcode-verify-work {phase} — re-run UAT after the fix
/rcode-execute {phase} --gaps-only — re-run just the failing plans
```

---

**`rcode/workflows/diff.md`** — append:

```markdown
## On Completion

/rcode-plan {phase} — plan fixes for changes seen in the diff
/rcode-execute {phase} — execute the phase
/rcode-progress — see full roadmap status
```

---

**`rcode/workflows/session-report.md`** — append:

```markdown
## On Completion

/rcode-progress — see full roadmap status
/rcode-next — get suggested next action
/rcode-resume-work — pick up where you left off
```

---

**`rcode/workflows/show.md`** — append:

```markdown
## On Completion

/rcode-execute {phase} — execute this phase
/rcode-plan {phase} — revise the plan
/rcode-progress — see full roadmap
```

---

**`rcode/workflows/audit-fix.md`** — append:

```markdown
## On Completion

/rcode-audit — re-run audit to verify fixes applied correctly
/rcode-review — review the auto-applied changes
/rcode-progress — see overall project state
```

---

**`rcode/workflows/memory-distill.md`** — append:

```markdown
## On Completion

/rcode-memory-audit — audit all memory files for staleness
/rcode-next — get suggested next action
/rcode-resume-work — continue with current work context
```

---

**`rcode/workflows/review-adversarial.md`** — append:

```markdown
## On Completion

/rcode-plan {phase} --reviews — incorporate findings into next plan
/rcode-review-fix — apply suggested fixes
/rcode-council — escalate contested findings to the full council
```

---

**`rcode/workflows/workstream.md`** — append:

```markdown
## On Completion

/rcode-plan {next_phase} — plan next phase in this workstream
/rcode-next — get suggested next action
/rcode-progress — see all workstreams and phases
```

---

## Wave 2 — Missing chains in existing workflows (2 files)

**`rcode/workflows/scan.md`** — append at the very end:

```markdown
## On Completion

/rcode-council {your question} — strategic question about what was found
/rcode-plan {N} — plan fixes for discovered issues
/rcode-explore — go deeper with socratic analysis
/rcode-next — get suggested next action
```

**`rcode/workflows/verify-work.md`** — find the final step (Step that presents gap closure / success). After the gap-resolved block, add:

```markdown
## On Completion

When gaps resolved and re-verified:
  /rcode-execute {phase} --gaps-only — re-execute just the gap plans
  /rcode-progress — see updated phase status

When all gaps pass:
  /rcode-next — advance to next phase
  /rcode-plan {next} — plan the next phase
  /rcode-add-tests {phase} — generate tests for this phase
```

---

## Wave 3 — Thin workflow stubs for broken refs (6 new files)

Create each file. Find the correct skill tier by checking:
```bash
find .rcode/skills/actions -path "*rcode-{name}*" -name "workflow.md" 2>/dev/null | head -1
```

**`rcode/workflows/create-prd.md`**:
```markdown
# Workflow: rcode-create-prd

<purpose>
Create a Product Requirements Document from scratch through guided facilitation. Delegates to the rcode-create-prd skill.
</purpose>

## Execution

Read the installed skill:

```bash
find .rcode/skills/actions -path "*rcode-create-prd/workflow.md" 2>/dev/null | head -1
```

Then follow the workflow at that path. If not found:
```
Skill not installed — run: npx @hanzlaa/rcode install
```

## On Completion

/rcode-validate-prd — validate the PRD for completeness
/rcode-create-milestone — build the milestone roadmap from the PRD
/rcode-edit-prd — revise the PRD
```

**`rcode/workflows/edit-prd.md`**:
```markdown
# Workflow: rcode-edit-prd

<purpose>
Update an existing PRD with revisions or clarifications. Delegates to the rcode-edit-prd skill.
</purpose>

## Execution

```bash
find .rcode/skills/actions -path "*rcode-edit-prd/workflow.md" 2>/dev/null | head -1
```

Follow the workflow at that path.

## On Completion

/rcode-validate-prd — validate after edits
/rcode-plan — re-plan phases from the updated PRD
```

**`rcode/workflows/validate-prd.md`**:
```markdown
# Workflow: rcode-validate-prd

<purpose>
Validate an existing PRD for completeness and consistency. Delegates to the rcode-validate-prd skill.
</purpose>

## Execution

```bash
find .rcode/skills/actions -path "*rcode-validate-prd/workflow.md" 2>/dev/null | head -1
```

Follow the workflow at that path.

## On Completion

/rcode-create-milestone — build roadmap from the validated PRD
/rcode-edit-prd — fix validation findings
```

**`rcode/workflows/create-architecture.md`**:
```markdown
# Workflow: rcode-create-architecture

<purpose>
Write an Architecture Decision Record (ADR) or system design document. Delegates to the rcode-create-architecture skill.
</purpose>

## Execution

```bash
find .rcode/skills/actions -path "*rcode-create-architecture/workflow.md" 2>/dev/null | head -1
```

Follow the workflow at that path.

## On Completion

/rcode-plan — plan phases from the architecture
/rcode-council — review the architecture with the full council
```

**`rcode/workflows/scaffold-project.md`**:
```markdown
# Workflow: rcode-scaffold-project

<purpose>
Scaffold a new project from the official rcode template repo. Delegates to the rcode-scaffold-project skill.
</purpose>

## Execution

```bash
find .rcode/skills/actions -path "*rcode-scaffold-project/workflow.md" 2>/dev/null | head -1
```

Follow the workflow at that path.

## On Completion

/rcode-init — configure rcode for the scaffolded project
/rcode-new-project {name} — design the project with full facilitation
```

**`rcode/workflows/retrospective.md`**:
```markdown
# Workflow: rcode-retrospective

<purpose>
Run an epic retrospective and produce owned action items. Delegates to the rcode-retrospective skill.
</purpose>

## Execution

```bash
find .rcode/skills/actions -path "*rcode-retrospective/workflow.md" 2>/dev/null | head -1
```

Follow the workflow at that path.

## On Completion

/rcode-correct-course — act on retrospective findings
/rcode-plan {next} — plan the next phase with retro learnings applied
/rcode-note — capture retro summary in memory
```

---

## Wave 4 — Wire orphaned workflows into help.md (1 file)

**`rcode/workflows/help.md`** — add 11 entries to appropriate sections.

Find the ENGINEERING RIGOR section in help.md and add after existing entries:
```
| `/rcode-check-implementation-readiness` | Check if a feature is ready to implement before writing code. |
| `/rcode-karpathy-audit` | Audit code against Karpathy engineering guidelines. |
| `/rcode-diagnose-issues` | Triage and diagnose systemic issues in the codebase. |
```

Find the PLANNING section and add:
```
| `/rcode-discuss-phase-power` | Deep-dive phase discussion with full research + assumptions analysis. |
```

Find or create a MEMORY section and add:
```
| `/rcode-memory-init` | Initialize the memory bank for a project (first-time setup). |
| `/rcode-memory-update` | Update a specific memory entry. |
| `/rcode-memory-audit` | Audit all memory files for staleness and gaps. |
| `/rcode-memory-distill` | Distill verbose memory into concise, LLM-friendly summaries. |
```

Find the PROJECT SETUP section and add:
```
| `/rcode-new-project-research` | Research phase for new project (subcommand of new-project). |
| `/rcode-new-project-roadmap` | Roadmap creation phase for new project (subcommand of new-project). |
```

Find the REVIEW section and add:
```
| `/rcode-review-edge-case-hunter` | Hunt for edge cases and boundary conditions before execution. |
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
