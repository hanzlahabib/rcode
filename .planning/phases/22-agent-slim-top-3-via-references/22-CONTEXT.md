# Phase 22: Agent Slim: Top-3 via References - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

Extract 70-77% static playbook bulk from the three heaviest agents into rihal/references/ files and @-include them. Closes GitHub #712.

Targets:
- rihal/agents/rihal-integration-checker.md (456 lines → ≤80)
- rihal/agents/rihal-research-synthesizer.md (254 lines → ≤80)
- rihal/agents/rihal-codebase-mapper.md (244 lines → ≤80)

Pattern: same @-include convention already used by 6/42 agents for agent-shared-rules.md.
</domain>

<decisions>
## Implementation Decisions

### New reference files to create
- rihal/references/integration-verification-playbook.md — verification steps, flow patterns, bash snippets, output template, critical rules, success criteria from integration-checker
- rihal/references/research-synthesis-playbook.md — methodology steps 1-8, output format, structured returns, success criteria from research-synthesizer
- rihal/references/codebase-mapping-process.md — full <process> block from codebase-mapper

### Agent file structure after slim
- integration-checker keeps: frontmatter + @-includes + `<role>` (brief) + `<core_principle>` + `<inputs>`. Everything else moves to reference.
- research-synthesizer keeps: frontmatter + @-includes + `<role>` + `<downstream_consumer>`. Everything else moves to reference.
- codebase-mapper keeps: frontmatter + @-includes + `<role>` + `<why_this_matters>` + `<philosophy>`. Process block moves to reference.

### Commit strategy
One commit per agent slim + one commit for the 3 new reference files.
Commit messages reference #712.
</decisions>

<canonical_refs>
## Canonical References

- rihal/references/agent-shared-rules.md — format template for @-include pattern
- rihal/agents/rihal-integration-checker.md — source of truth for extraction
- rihal/agents/rihal-research-synthesizer.md — source of truth for extraction
- rihal/agents/rihal-codebase-mapper.md — source of truth for extraction
</canonical_refs>

<code_context>
## Existing Code Insights

@-include format used in agents: single line `@.rihal/references/<file>.md`
6/42 agents currently use @-include for agent-shared-rules.md — pattern is established but not yet universal.
install.js copies agents to ~/.claude/agents/ — @-include paths must resolve relative to install destination.
</code_context>

<specifics>
## Specific Requirements

- Target: ≤80 lines per agent after refactor
- Do NOT change agent behavior — only relocate static content
- Verify: wc -l on all 3 agents ≤80 after refactor
- No new npm dependencies
- integration-checker: stub keeps only frontmatter + @-includes + role + core_principle + inputs (~55 lines)
- research-synthesizer: stub keeps only frontmatter + @-includes + role + downstream_consumer (~40 lines)
</specifics>

<deferred>
## Deferred

- Slimming remaining 24 agents → Phase 23
- Persona duplication → Phase 24
</deferred>
