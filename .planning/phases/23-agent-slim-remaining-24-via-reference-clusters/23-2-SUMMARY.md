---
sprint: 23.2
phase: 23-agent-slim-remaining-24-via-reference-clusters
status: complete
commit: 5494e71
---

# Sprint 23-2 Summary — Engineer Persona + Auditor Cluster Slim

## Objective

Slim 9 agents by replacing shared content blocks with @-include lines pointing to the cluster reference files created in sprint 23-1:
- `@.rihal/references/persona-engineer-shared.md` for engineer personas
- `@.rihal/references/auditor-shared-checklists.md` for auditor agents

## Before / After Line Counts

| Agent | Before | After | Delta | Target | Status |
|-------|--------|-------|-------|--------|--------|
| rihal-haitham.md | 143 | 99 | -44 | ≤100 | PASS |
| rihal-omar.md | 138 | 96 | -42 | ≤100 | PASS |
| rihal-yousef.md | 137 | 97 | -40 | ≤100 | PASS |
| rihal-ui-auditor.md | 124 | 100 | -24 | ≤100 | PASS |
| rihal-security-auditor.md | 122 | 100 | -22 | ≤100 | PASS |
| rihal-security-adversary.md | 127 | 98 | -29 | ≤100 | PASS |
| rihal-edge-case-hunter.md | 121 | 95 | -26 | ≤100 | PASS |
| rihal-nyquist-auditor.md | 183 | 176 | -7 | ≤100 | DEVIATION |
| rihal-docs-auditor.md | 182 | 173 | -9 | ≤120 | DEVIATION |

Total lines removed: 243 lines across 9 files.

## Accepted Deviations

### rihal-nyquist-auditor.md (176L, target ≤100L)

The nyquist-auditor is structurally different from all other auditors. It uses XML-style execution blocks that are entirely unique to the gap-filling workflow:

- `<execution_flow>` block: ~74L — the complete gap-analysis loop including test classification table, framework detection table, debug loop logic
- `<structured_returns>` block: ~64L — three structured return formats (GAPS FILLED / PARTIAL / ESCALATE)
- `<success_criteria>` block: ~12L — completion checklist

These blocks total ~150L of unique, load-bearing structured content that cannot be moved to the shared reference file because they define nyquist's specific execution protocol — not general audit methodology. The shared `@-include` was added and the generic trailing Constraints section (8L of low-value filler) was removed, achieving the maximum possible reduction.

### rihal-docs-auditor.md (173L, target ≤120L)

The docs-auditor carries two extension blocks for the `/rihal-feature-drift` workflow:

- `<mode_feature_drift>`: ~61L — structured JSON output schema with hardcoded severity rules (`trivial|minor|major|critical`) used by the workflow parser
- `<mode_phase_status>`: ~52L — structured JSON output schema with phase-status severity rules (`trivial|partial|major`) used by the workflow parser

These extension blocks total ~113L and are load-bearing: the downstream workflow code parses their JSON output. Moving them to the shared reference would break the feature-drift workflow's expectations. Non-extension content was reduced from ~82L to ~60L by removing the role boundary statement, response format block, and pleasantries constraint. The minimum achievable line count is 173L.

## What Was Removed (Shared Content)

### Engineer persona agents (haitham, omar, yousef)

Removed per agent:
- "Five named heuristics. Cite by name." meta-instruction line (now in `persona-engineer-shared.md` Named-Heuristic Protocol)
- "State the rule by name when refusing." meta-instruction line (now in Anti-Pattern Enforcement Protocol)
- `STRICTLY FORBIDDEN from starting with "Great", "Certainly", "Okay", "Sure"` from Anti-Patterns (now in Communication Discipline)
- Duplicated operational constraints: `MUST Read before proposing`, `File:line citations`, `Cite framework heuristic by name`, `Never end with "Let me know if you have questions"` (all in Shared Operational Constraints)
- `## Principles` section (redundant with Decision Framework heuristics — each principle was captured by the corresponding named heuristic)
- Workflow steps that duplicate shared invariants

### Auditor agents (ui, security-auditor, security-adversary, edge-case-hunter)

Removed per agent:
- "You do not write/fix/implement. You audit and flag issues." role boundary (now in Audit Role Boundary)
- "No pleasantries or closing offers" constraint (now in Shared Auditor Constraints)
- "Evidence-based-findings" standalone principle/rule (now in Evidence Requirements section)
- "Every [X] audit has four pressure points:" intro sentence (now in Four-Pressure-Points Audit Structure)
- "Named rules. Cite by name when applying." meta-instruction line
- Redundant anti-pattern items for "Never implement fixes" and "Never make architecture decisions" (covered by Audit Role Boundary)

## What Was Preserved

### Engineer personas
- YAML frontmatter unchanged
- All 5 named heuristics with full descriptions per persona
- Persona identity and Communication Style prefix
- Full Capabilities table
- Workflow numbered steps (persona-specific actions)
- Persistent Context file lists
- All 3 examples (happy path, edge case, negative routing)
- Full Redirects section

### Auditor agents
- YAML frontmatter unchanged
- Domain-specific "How you think" / Pressure Points (4 unique points per agent)
- All Specializations sections (domain-specific checklists)
- Named Principles with domain-specific rules
- Workflow steps
- Anti-Patterns / Refuse List
- All examples
- Redirects
- docs-auditor: mode_feature_drift and mode_phase_status extension blocks
- nyquist-auditor: execution_flow, structured_returns, success_criteria blocks

## Commit

`5494e71` — refactor(agents): slim engineer personas + auditor cluster via @-include (#713)

9 files changed, 64 insertions(+), 306 deletions(-)
