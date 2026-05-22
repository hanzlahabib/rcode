---
sprint: 22-2
phase: 22-agent-slim-top-3-via-references
status: complete
commit: 87ea48a
---

## Sprint 22-2 Summary

**Objective:** Slim rcode/agents/rcode-integration-checker.md from 456 lines to ≤80 lines via @-include.

**Result:** 456 lines → 61 lines (87% reduction, target was ≤80/~55).

## Tasks Completed

| Task | Description | Status |
|------|-------------|--------|
| 1 | Verify Sprint 22-1 reference file exists (6 steps + output template) | done |
| 2 | Rewrite rcode-integration-checker.md as slim stub | done |
| 3 | Commit slimmed agent referencing #712 | done |

## Verification Results

- PASS: 61 lines (≤80 gate)
- PASS: @.rcode/references/integration-verification-playbook.md @-include present
- PASS: frontmatter intact (name, description, tools, color unchanged)
- PASS: bash functions (check_export_used, verify_auth_flow, etc.) not in agent stub
- PASS: output template (Integration Check Complete, Requirements Integration Map table) not in agent stub
- PASS: bash functions confirmed in reference file
- PASS: output template confirmed in reference file

Note: The grep check for "Requirements Integration Map" in the agent stub produces a false positive — the `<inputs>` block (kept verbatim per spec) contains a prose bullet "Requirements with no cross-phase wiring MUST be flagged in the Requirements Integration Map". This is expected input-context text, not the output template. The actual output template (the markdown report structure) lives exclusively in the reference file.

## Content Kept in Agent Stub

- YAML frontmatter (lines 1-6, unchanged)
- @.rcode/references/response-style.md
- @.rcode/references/karpathy-guidelines.md
- @.rcode/references/integration-verification-playbook.md (new)
- `<role>` block — identity, mandatory initial read notice, critical mindset
- `<core_principle>` block — Existence ≠ Integration with 4 connection types
- `<inputs>` block — Required Context with all sub-bullets

## Content Moved to Reference File (Sprint 22-1)

- `<verification_process>` — 6 steps with bash functions (lines 64-361)
- `<output>` — full markdown report template (lines 363-419)
- `<critical_rules>` — 5 rules (lines 421-433)
- `<success_criteria>` — 11 checklist items (lines 435-448)
- Constraints section (lines 450-456)

## Commit

- `87ea48a` — refactor(agents): slim integration-checker 456→61 lines via @-include (#712)
- Files changed: rcode/agents/rcode-integration-checker.md only
