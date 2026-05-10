# Sprint 22-1 Summary

**Phase:** 22-agent-slim-top-3-via-references
**Sprint:** 22.1
**Status:** Complete

## What Was Done

Extracted static playbook content from the three heaviest agent files into three new standalone reference files under `rihal/references/`. This is a pure extraction — no behaviour change, no rewriting. Content was copied verbatim from source agents. Agent files were not modified (that is Wave 2 work in sprints 22-2, 22-3, 22-4).

## Files Created

| File | Lines | Extracted From |
|------|-------|----------------|
| `rihal/references/integration-verification-playbook.md` | 392 | `rihal/agents/rihal-integration-checker.md` (lines 64–457) |
| `rihal/references/research-synthesis-playbook.md` | 205 | `rihal/agents/rihal-research-synthesizer.md` (lines 48–254) |
| `rihal/references/codebase-mapping-process.md` | 174 | `rihal/agents/rihal-codebase-mapper.md` (lines 79–244) |

## Content Extracted Per File

**integration-verification-playbook.md:**
- All 6 verification steps (Steps 1–6) with bash functions: `check_export_used`, `check_api_consumed`, `check_auth_protection`, `verify_auth_flow`, `verify_data_flow`, `verify_form_flow`
- YAML wiring + flow status report templates
- `<output>` return template (Integration Check Complete / Requirements Integration Map)
- Critical rules (5 rules)
- Success criteria checkbox list
- Constraints section

**research-synthesis-playbook.md:**
- All 8 synthesis steps (Steps 1–8) including the Write tool mandate in Step 6 and exact `rihal-tools.cjs` commit command in Step 7
- Output format specification (template path + key sections)
- SYNTHESIS COMPLETE and SYNTHESIS BLOCKED structured return formats
- Success criteria checkbox list + quality indicators
- Constraints section

**codebase-mapping-process.md:**
- All 5 `<step>` blocks verbatim: `parse_focus`, `discover_source_roots`, `explore_codebase`, `write_documents`, `return_confirmation`
- MANDATORY Scan Scope template in `write_documents`
- `$SOURCE_ROOTS` / `$LANGUAGES` variable references preserved
- On-Demand Rule Files table in `return_confirmation`

## Source Agent Files — Unchanged

| File | Lines (before) | Lines (after) |
|------|----------------|---------------|
| `rihal/agents/rihal-integration-checker.md` | 456 | 456 |
| `rihal/agents/rihal-research-synthesizer.md` | 254 | 254 |
| `rihal/agents/rihal-codebase-mapper.md` | 244 | 244 |

## Git Commit

**Hash:** a5e33cb
**Message:** `feat(references): extract verification/synthesis/mapping playbooks for agent slim (#712)`
**Files in commit:** 3 reference files only
