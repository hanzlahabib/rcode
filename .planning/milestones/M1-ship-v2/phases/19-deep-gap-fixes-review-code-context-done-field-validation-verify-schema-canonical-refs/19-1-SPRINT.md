---
phase: 19
sprint: 19.1
type: execute
autonomous: true
wave: 1
gap_closure: true
requirements: []

must_haves:
  truths:
    - "verify-phase.md reads REVIEW.md and fails VERIFICATION if critical/high counts are non-zero"
    - "plan.md planner prompt reads <code_context> from CONTEXT.md"
    - "plan.md planner spec includes <done> field in task schema"
    - "rcode/templates/VALIDATION.md exists and is non-empty"
    - "plan.md <verify> spec includes <automated> as mandatory child element with example"
    - "autonomous.md minimal CONTEXT.md template includes <canonical_refs> section"
  artifacts:
    - path: "rcode/workflows/verify-phase.md"
      provides: "reads REVIEW.md critical/high counts before writing VERIFICATION verdict"
    - path: "rcode/workflows/plan.md"
      provides: "<code_context> reading + <done> field in planner spec"
    - path: "rcode/templates/VALIDATION.md"
      provides: "non-empty validation template for Dimension 8e gate"
    - path: "rcode/workflows/autonomous.md"
      provides: "minimal CONTEXT.md with <canonical_refs> section"
  key_links:
    - from: "GH #492"
      to: "verify-phase.md REVIEW.md integration"
      why: "code review findings must feed VERIFICATION verdict"
    - from: "GH #493"
      to: "plan.md code_context reading"
      why: "discuss-phase writes code_context; planner must consume it"
    - from: "GH #494"
      to: "plan.md <done> field in planner spec"
      why: "Dimension 2 checks <done>; planner must write it"
    - from: "GH #495"
      to: "rcode/templates/VALIDATION.md"
      why: "Dimension 8e hard-blocks when VALIDATION.md missing"
    - from: "GH #496"
      to: "plan.md <verify><automated> schema"
      why: "Dimension 8a checks <automated>; planner must write it"
    - from: "GH #497"
      to: "autonomous.md canonical_refs"
      why: "planner reads canonical_refs; minimal stub must provide section"
---
