---
phase: 18
sprint: 18.1
type: execute
autonomous: true
wave: 1
gap_closure: true
requirements: []

must_haves:
  truths:
    - "plan.md downstream_consumer spec lists <files> as mandatory task field"
    - "plan.md deep_work_rules documents <files>, <verify>, and <interfaces> with examples"
    - "plan.md quality_gate checks for <files> and <verify> on every task"
    - "execute.md has a run_verify_commands step before code_review_gate"
    - "rcode/templates/summary.md has Patterns Established, Provides, Requires, Affects sections"
    - "execute-sprint.md create_summary step instructs filling knowledge-transfer sections"
    - "plan.md research step reads prior Provides sections"
  artifacts:
    - path: "rcode/workflows/plan.md"
      provides: "<files>, <verify>, <interfaces> fields in planner spec + quality gate"
    - path: "rcode/workflows/execute.md"
      provides: "run_verify_commands step"
    - path: "rcode/templates/summary.md"
      provides: "4 new knowledge-transfer sections"
    - path: "rcode/workflows/execute-sprint.md"
      provides: "create_summary knowledge-transfer instructions"
  key_links:
    - from: "GH #488"
      to: "plan.md <files> field"
      why: "per-task file scoping"
    - from: "GH #489"
      to: "plan.md <verify> + execute.md run_verify_commands"
      why: "executable task verification"
    - from: "GH #490"
      to: "plan.md <interfaces> field"
      why: "embedded code signatures"
    - from: "GH #491"
      to: "summary.md + execute-sprint.md"
      why: "knowledge-transfer fields"
---
