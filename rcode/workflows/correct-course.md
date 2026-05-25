# Workflow: rcode-correct-course

<purpose>
Load original PRD and architecture docs, compare against current codebase implementation. Identify deviations, classify by type (scope drift, wrong architecture, missing acceptance criteria, tech debt), and produce ordered remediation plan with updated story file.
</purpose>


## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rcode-correct-course <argument-here>
```

**Examples:**
```
/rcode-correct-course example 1
/rcode-correct-course example 2
```

STOP — do not proceed.

<available_agent_types>
- `rcode-deviation-analyzer` — compares spec to implementation, classifies gaps
- `rcode-remediation-planner` — creates ordered fix plan
</available_agent_types>

## Step 0 — Initialize

```bash
INIT=$(node .rcode/bin/rcode-tools.cjs init correct-course "$ARGUMENTS" 2>/dev/null)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

If `INIT` is empty or `INIT.ok` is false, print error and exit:
```
Error: rcode-tools init failed. Verify .rcode/ is installed and state.json is valid.
```

Parse:
- `flags.prd` — path to original PRD/requirements document
- `flags.architecture` — path to original architecture document
- `deviation_report_path` — `.rcode/DEVIATION-REPORT.md`
- `remediation_plan_path` — `.planning/plans/corrections/SPRINT.md`

## Step 1 — Load Original Spec and Current Implementation

**If `flags.prd` provided:** Read PRD for:
- Acceptance Criteria (AC)
- Feature scope (in-scope, out-of-scope)
- User personas and use cases
- Non-functional requirements (performance, security, etc.)

**If `flags.architecture` provided:** Read architecture for:
- Key design decisions
- Technology choices and rationale
- Module/service boundaries
- Data flow and integrations

Scan current codebase for:
- Implemented features (by file/module)
- Test coverage for AC
- Architecture actual state
- Known TODOs, FIXMEs, tech debt comments

## Step 2 — Spawn Deviation Analyzer

Spawn `rcode-deviation-analyzer` subagent:

```
Task tool call:
  subagent_type: "rcode-deviation-analyzer"
  description: "Analyze deviations from spec"
  prompt: |
    Compare original spec to current implementation and classify deviations.
    
    **Original PRD:**
    {prd_contents}
    
    **Original Architecture:**
    {architecture_contents}
    
    **Current Implementation:**
    {codebase_analysis}
    
    **For each deviation, classify:**
    
    1. SCOPE DRIFT — Feature added that wasn't in original scope
       - Impact: Increases maintenance, scope creep
       - Fix: Isolate, evaluate for removal or acceptance
    
    2. WRONG ARCHITECTURE — Implementation doesn't match intended design
       - Impact: Performance, maintainability, scalability issues
       - Fix: Refactor to match architecture
    
    3. MISSING AC — Acceptance criteria not met by implementation
       - Impact: Feature incomplete, doesn't meet user needs
       - Fix: Implement missing AC
    
    4. TECH DEBT — Known code quality issues, shortcuts taken
       - Impact: Future maintenance burden
       - Fix: Schedule refactoring/rewrite
    
    Output: DEVIATION-REPORT.md with per-deviation analysis
```

## Step 3 — Spawn Remediation Planner

Spawn `rcode-remediation-planner` subagent:

```
Task tool call:
  subagent_type: "rcode-remediation-planner"
  description: "Create remediation plan"
  prompt: |
    Create an ordered remediation plan based on deviations.
    
    **Deviations to fix:**
    {deviations_from_report}
    
    **Ordering rules:**
    1. MISSING AC — highest priority (blocks acceptance)
    2. WRONG ARCHITECTURE — high priority (affects stability)
    3. SCOPE DRIFT — medium priority (re-evaluate)
    4. TECH DEBT — low priority (schedule in backlog)
    
    For each fix:
    - Specific task (not vague)
    - Estimated effort
    - Dependencies on other fixes
    - Rollback risk
    - Acceptance criteria for "fixed"
    
    Output: SPRINT.md that can be executed with /rcode-execute
```

## Step 4 — Generate Report and Plan

Write:
- `.rcode/DEVIATION-REPORT.md` (analysis)
- `.planning/plans/corrections/SPRINT.md` (execution plan)

Also update `.rcode/story-current.md` if exists:

Add section to story file:
```markdown
## Known Deviations

[Extracted from DEVIATION-REPORT.md]

### Scope Drift
- {list}

### Architecture Gaps
- {list}

### Missing AC
- {list}

### Tech Debt
- {list}

Remediation: See /rcode-correct-course for ordered fix plan
```

Print:
```
🧭 Deviation Analysis Complete

{deviation_count} deviations found:
  • {missing_ac_count} missing AC (critical)
  • {architecture_count} architecture gaps (high)
  • {scope_drift_count} scope drift (medium)
  • {tech_debt_count} tech debt (low)

Reports:
  • Deviation analysis: {deviation_report_path}
  • Remediation plan: {remediation_plan_path}

Run remediation with:
/rcode-execute {remediation_plan_path}
```

## Success Criteria

- DEVIATION-REPORT.md created with all deviations classified
- SPRINT.md created with ordered fix tasks
- Story file updated with deviation summary
- Deviations ordered by priority (AC → Architecture → Scope → Debt)

## On Error

- If PRD missing: skip scope/AC analysis, focus on architecture
- If architecture missing: skip architecture analysis, focus on features
- If agents fail: provide template deviation/remediation structure

## ▶ Next Up

- /rcode-execute {phase}
- /rcode-plan {phase}
- /rcode-progress
