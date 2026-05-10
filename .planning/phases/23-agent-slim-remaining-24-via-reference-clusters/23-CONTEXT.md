# Phase 23: Agent Slim — Remaining 24 via Reference Clusters - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

Slim the remaining 24 agents that exceed 100 lines by grouping shared content into cluster reference files. Closes GitHub #713.

Agents (sorted by size):
- rihal-planner.md (239L), rihal-nyquist-auditor.md (182L), rihal-docs-auditor.md (182L)
- rihal-sprint-checker.md (148L), rihal-haitham.md (143L), rihal-debugger.md (140L)
- rihal-omar.md (138L), rihal-yousef.md (137L), rihal-phase-researcher.md (129L)
- rihal-project-researcher.md (128L), rihal-security-adversary.md (127L)
- rihal-verifier.md (124L), rihal-ui-auditor.md (124L), rihal-executor.md (124L)
- rihal-ux-designer.md (123L), rihal-remediation-planner.md (123L)
- rihal-security-auditor.md (122L), rihal-edge-case-hunter.md (121L)
- rihal-roadmapper.md (120L), rihal-code-reviewer.md (120L), rihal-code-fixer.md (120L)
- rihal-profiler.md (117L), rihal-assumptions-analyzer.md (117L), rihal-advisor-researcher.md (116L)

Total: 4,473 lines to reduce.
</domain>

<decisions>
## Implementation Decisions

### Cluster strategy (group shared patterns into shared reference files)

**Cluster A — Engineer personas** (rihal-haitham, rihal-omar, rihal-yousef):
→ rihal/references/persona-engineer-shared.md
Shared content: decision frameworks, anti-patterns, scope discipline, self-audit protocol

**Cluster B — Auditor agents** (rihal-nyquist-auditor, rihal-docs-auditor, rihal-ui-auditor, rihal-security-auditor, rihal-security-adversary, rihal-edge-case-hunter):
→ rihal/references/auditor-shared-checklists.md
Shared content: audit output format, evidence requirements, severity classification

**Cluster C — Researcher agents** (rihal-phase-researcher, rihal-project-researcher, rihal-advisor-researcher, rihal-profiler):
→ rihal/references/researcher-shared.md
Shared content: research methodology, output format, synthesis approach

**Cluster D — Execution agents** (rihal-executor, rihal-debugger, rihal-verifier, rihal-remediation-planner, rihal-code-reviewer, rihal-code-fixer, rihal-roadmapper, rihal-assumptions-analyzer):
→ Extract unique playbooks per agent (too different to share a single cluster file)

**Cluster E — Plan-quality agents** (rihal-planner, rihal-sprint-checker):
→ Extract unique playbooks per agent (highly specialized, no shared content)

**Cluster F — UX agents** (rihal-haitham frontend already done in Cluster A, rihal-ux-designer):
→ Extract unique playbook per agent

### Target
Every agent ≤100 lines after refactor. Commit per cluster.
</decisions>

<canonical_refs>
## Canonical References

- rihal/references/agent-shared-rules.md — existing pattern (used by 6 agents)
- .planning/phases/22-agent-slim-top-3-via-references/ — pilot established the approach
- rihal/agents/*.md — source files
</canonical_refs>

<specifics>
## Specific Requirements

- Each cluster reference file goes in rihal/references/ (source) AND .rihal/references/ (runtime copy)
- @-include syntax: @.rihal/references/<file>.md
- Target: every agent ≤100 lines
- Commit per cluster wave, not per agent
- Commit messages reference #713
</specifics>

<deferred>
## Deferred

- Persona duplication (rihal/agents vs rihal/skills/agents) → Phase 24
</deferred>
