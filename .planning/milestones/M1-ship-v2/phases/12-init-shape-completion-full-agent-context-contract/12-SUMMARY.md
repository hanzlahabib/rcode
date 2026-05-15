# Phase 12: Init Shape Completion — Summary

**Status:** Complete
**Delivered:** 2026-04-29
**Tracks:** #468 (closes second half of #464)

## What shipped

`cmdInit` now returns the full field set both `plan.md` (line 79) and `discuss-phase.md` (line 146) document. Workflow agents stop falling through error branches when reading the init JSON, and stop re-shelling `config-get` per field at runtime.

### New top-level fields (init phase-op + init sprint-plan)

| Field | Source | Default |
|---|---|---|
| `research_enabled` | `workflow.research_by_default` | `false` |
| `plan_checker_enabled` | `workflow.plan_checker` | `true` |
| `nyquist_validation_enabled` | `workflow.nyquist_validation` | `true` |
| `text_mode` | `workflow.text_mode` | `false` |
| `researcher_model` | profile resolution (`rihal-researcher` → `phase-researcher` fallback) | `null` if not installed |
| `planner_model` | profile resolution (`rihal-planner`) | `null` if not installed |
| `checker_model` | profile resolution (`rihal-sprint-checker`) | `null` if not installed |
| `phase_req_ids` | `REQ-*` extracted from ROADMAP `**Requirements:**` block | `[]` |
| `has_reviews`, `reviews_path` | `*-REVIEWS.md` in phase dir | `false` / `null` |
| `has_uat`, `uat_path` | `*-UAT.md` in phase dir | `false` / `null` |

### Grouped fields (deeper config flags)

`out.features`:
- `thinking_partner` (default `false`)

`out.workflow_flags`:
- `discuss_mode` (default `adaptive`)
- `research_before_questions` (default `true`)
- `max_discuss_passes` (default `3`)
- `security_enforcement` (default `true`)
- `security_asvs_level` (default `1`)
- `ui_phase` (default `true`)
- `ui_safety_gate` (default `true`)

## Decisions honored

- **D-1:** Reused `lib/config.cjs::parseNestedYaml` via new `readNestedConfig()` helper ✓
- **D-2:** Every key has a documented default matching the workflow's inline `config-get … || echo "X"` fallback — no errors on first init in a fresh project ✓
- **D-3:** Models resolve via existing `cmdResolveModel`; `null` (not throw) when agent missing ✓
- **D-4:** `phase_req_ids` is `[]` when no requirements block is present ✓
- **D-5:** `reviews_path` / `uat_path` follow Phase 10's `files0(phase_dir, /…/i)` pattern ✓
- **D-6:** Deeper flags grouped under `features` and `workflow_flags` to keep top-level lean ✓
- **D-7:** Boolean coercion consistent with Phase 10 — `String(v) !== 'false'` for true-by-default ✓

## Verification

- `node rihal/bin/rihal-tools.cjs init phase-op 12` returns all 23 documented fields
- `node rihal/bin/rihal-tools.cjs init sprint-plan 12` returns the same superset (plan.md + discuss-phase.md combined)
- `npm test` → 132/132 pass (no regressions)
- `bash scripts/dogfood-check.sh` → all checks pass

## Issues closed

| # | Verification |
|---|---|
| #468 | Full init contract returned for both phase-op and sprint-plan |
| #464 | Second half closed (Phase 10 closed phase-aware fields; Phase 12 closes models + flags + REQ-IDs + REVIEWS/UAT paths) |

## Commit chain

Single commit — Phase 12 was scoped tight: 3 helpers (`readNestedConfig`, `resolveModelString`, `extractReqIds`) + ~30 lines added to `cmdInit`'s phase-aware branch.

---

*Phase: 12-init-shape-completion-full-agent-context-contract*
