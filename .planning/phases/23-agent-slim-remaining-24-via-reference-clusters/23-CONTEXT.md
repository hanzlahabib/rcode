# Phase 23: Agent Slim — Remaining 24 via Reference Clusters - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

Slim the remaining 24 agents that exceed 100 lines by grouping shared content into cluster reference files. Closes GitHub #713.

Agents (sorted by size):
- rcode-planner.md (239L), rcode-nyquist-auditor.md (182L), rcode-docs-auditor.md (182L)
- rcode-sprint-checker.md (148L), rcode-haitham.md (143L), rcode-debugger.md (140L)
- rcode-omar.md (138L), rcode-yousef.md (137L), rcode-phase-researcher.md (129L)
- rcode-project-researcher.md (128L), rcode-security-adversary.md (127L)
- rcode-verifier.md (124L), rcode-ui-auditor.md (124L), rcode-executor.md (124L)
- rcode-ux-designer.md (123L), rcode-remediation-planner.md (123L)
- rcode-security-auditor.md (122L), rcode-edge-case-hunter.md (121L)
- rcode-roadmapper.md (120L), rcode-reviewer.md (120L), rcode-fixer.md (120L)
- rcode-profiler.md (117L), rcode-assumptions-analyzer.md (117L), rcode-advisor-researcher.md (116L)

Total: 4,473 lines to reduce.
</domain>

<decisions>
## Implementation Decisions

### Cluster strategy (group shared patterns into shared reference files)

**Cluster A — Engineer personas** (rcode-haitham, rcode-omar, rcode-yousef):
→ rcode/references/persona-engineer-shared.md
Shared content: decision frameworks, anti-patterns, scope discipline, self-audit protocol

**Cluster B — Auditor agents** (rcode-nyquist-auditor, rcode-docs-auditor, rcode-ui-auditor, rcode-security-auditor, rcode-security-adversary, rcode-edge-case-hunter):
→ rcode/references/auditor-shared-checklists.md
Shared content: audit output format, evidence requirements, severity classification

**Cluster C — Researcher agents** (rcode-phase-researcher, rcode-project-researcher, rcode-advisor-researcher, rcode-profiler):
→ rcode/references/researcher-shared.md
Shared content: research methodology, output format, synthesis approach

**Cluster D — Execution agents** (rcode-executor, rcode-debugger, rcode-verifier, rcode-remediation-planner, rcode-reviewer, rcode-fixer, rcode-roadmapper, rcode-assumptions-analyzer):
→ Extract unique playbooks per agent (too different to share a single cluster file)

**Cluster E — Plan-quality agents** (rcode-planner, rcode-sprint-checker):
→ Extract unique playbooks per agent (highly specialized, no shared content)

**Cluster F — UX agents** (rcode-haitham frontend already done in Cluster A, rcode-ux-designer):
→ Extract unique playbook per agent

### Target
Every agent ≤100 lines after refactor. Commit per cluster.
</decisions>

<canonical_refs>
## Canonical References

- rcode/references/agent-shared-rules.md — existing pattern (used by 6 agents)
- .planning/phases/22-agent-slim-top-3-via-references/ — pilot established the approach
- rcode/agents/*.md — source files
</canonical_refs>

<specifics>
## Specific Requirements

- Each cluster reference file goes in rcode/references/ (source) AND .rcode/references/ (runtime copy)
- @-include syntax: @.rcode/references/<file>.md
- Target: every agent ≤100 lines
- Commit per cluster wave, not per agent
- Commit messages reference #713
</specifics>

<deferred>
## Deferred

- Persona duplication (rcode/agents vs rcode/skills/agents) → Phase 24
</deferred>
