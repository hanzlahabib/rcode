---
sprint: 22-4
phase: 22-agent-slim-top-3-via-references
status: complete
completed_at: 2026-05-10
---

## Sprint 22-4 Summary

**Objective:** Slim rihal/agents/rihal-codebase-mapper.md from 244 lines to ≤80 lines by replacing the `<process>` block with a single @-include pointing to the reference file created in Sprint 22-1.

## Stories Completed

| Task | Name | Status |
|------|------|--------|
| 1 | Verify Sprint 22-1 reference file exists | done |
| 2 | Rewrite rihal-codebase-mapper.md as slim stub | done |
| 3 | Commit the slimmed agent | done |

## Commits

| Hash | Message |
|------|---------|
| a0c338e | refactor(agents): slim codebase-mapper 244→78 lines via @-include (#712) |

## Verification Results

- PASS: 78 lines (≤80 gate)
- PASS: @-include @.rihal/references/codebase-mapping-process.md present
- PASS: response-style include preserved
- PASS: karpathy-guidelines-full include preserved
- PASS: dalil-scout/SKILL.md include preserved
- PASS: process step names (discover_source_roots, explore_codebase) removed from agent stub
- PASS: Dalil voice directives retained in role block
- PASS: frontmatter unchanged (color: cyan)

## Metrics

- Lines before: 244
- Lines after: 78
- Reduction: 166 lines (68%)
- Reference file: rihal/references/codebase-mapping-process.md (5 steps, created Sprint 22-1)

## Must-Haves Satisfied

- rihal-codebase-mapper.md is ≤80 lines: YES (78)
- Agent behaviour identical — all 5 process steps still executed via reference file: YES
- @-include resolves to process file from Sprint 22-1: YES
- All three original @-includes preserved: YES
- role, why_this_matters, philosophy blocks retained verbatim: YES
- YAML frontmatter unchanged: YES
- Committed with message referencing #712: YES
