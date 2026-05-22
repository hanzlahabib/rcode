# Phase 12: Init Shape Completion — full agent context contract

**Gathered:** 2026-04-29
**Status:** Ready for execution
**Mode:** Express (locked from #468)

<domain>
## Phase Boundary

Phase 10 (#466) added phase-aware fields to `cmdInit` for the `phase-op` and `sprint-plan` workflow names. Workflows still reference ~15 fields that aren't returned, so agents fall through error branches and re-shell to `config-get` per field at runtime. Phase 12 closes the contract:

**From `plan.md` line 79 (init sprint-plan):**
- `researcher_model`, `planner_model`, `checker_model` — model resolution per profile
- `research_enabled`, `plan_checker_enabled`, `nyquist_validation_enabled` — workflow feature flags
- `text_mode` — TUI vs plain-text toggle (read from `workflow.text_mode`)
- `phase_req_ids` — REQ-IDs extracted from this phase's `**Requirements:**` block in ROADMAP.md
- `has_reviews`, `reviews_path` — `*-REVIEWS.md` artifact (cross-AI peer review)
- `uat_path` — `*-UAT.md` artifact

**From `discuss-phase.md` line 146 (init phase-op):**
- Phase 10 fields already covered.
- Still missing: `features.thinking_partner`, `workflow.discuss_mode`, `workflow.research_before_questions`, `workflow.max_discuss_passes`, `workflow.security_enforcement`, `workflow.security_asvs_level`, `workflow.ui_phase`, `workflow.ui_safety_gate`.

**Out of scope:** new workflow fields not currently referenced by existing `.md` files. This phase fills the contract — it does not extend it.
</domain>

<decisions>
## Implementation Decisions

- **D-1:** Reuse `lib/config.cjs::parseNestedYaml` to read nested `workflow.*` and `features.*` keys. `readConfig` keeps its flat-only contract for the existing scalar fields.
- **D-2:** Each missing config key falls back to a documented default — the workflow already encodes these defaults inline (e.g. `workflow.research_before_questions || true`). Do not error on first init in a fresh project. Documented defaults match the workflow `config-get … || echo "X"` lines verbatim.
- **D-3:** Model fields (`researcher_model`, `planner_model`, `checker_model`) are resolved via the existing `cmdResolveModel` profile logic. When the agent id isn't installed (rare in v2 — `rcode-researcher`/`rcode-planner`/`rcode-checker` ship by default), the field is `null` instead of throwing.
- **D-4:** `phase_req_ids` extracts `REQ-[A-Z0-9-]+` tokens from each requirement string returned by `roadmap.dispatch(['get-phase', N])`. If the phase has no `**Requirements:**` block, `phase_req_ids` is `[]` (not null) — workflow loops on it as a list.
- **D-5:** `reviews_path`/`uat_path` follow the same `files0(phase_dir, /REVIEWS\.md$/)` pattern Phase 10 used for context/research/verification. `has_reviews` is the boolean derived from the file presence; `has_uat` is omitted because no workflow references that flag yet (only the path).
- **D-6:** Deeper config flags (`features.thinking_partner`, `workflow.discuss_mode`, etc.) are surfaced under their dotted names as a flat record `out.features = { thinking_partner }` and `out.workflow_flags = { discuss_mode, research_before_questions, max_discuss_passes, security_enforcement, security_asvs_level, ui_phase, ui_safety_gate }`. This avoids polluting the top level with 8 more keys while keeping discoverability.
- **D-7:** Boolean coercion is consistent with Phase 10 — `String(value) !== 'false'` for true-by-default, `String(value) === 'true'` for false-by-default. Matches the workflow `|| echo "true"` / `|| echo "false"` semantics.

</decisions>

<canonical_refs>
## Canonical References

- `#468` — umbrella for Phase 12
- `#464` — workflow ↔ init contract umbrella (Phase 10 closed first half)
- `rcode/workflows/plan.md` — line 79 contract for init sprint-plan
- `rcode/workflows/discuss-phase.md` — line 146 contract for init phase-op
- `rcode/bin/rcode-tools.cjs` — host file (cmdInit at line 274)
- `rcode/bin/lib/config.cjs` — nested YAML reader (parseNestedYaml)
- `rcode/bin/lib/roadmap.cjs` — get-phase parser (parseRequirements at line 67)

</canonical_refs>

<deferred>
- New init fields not currently referenced by any workflow → wait until consumed
- Hardening parseNestedYaml for deeper indentation (>1 level) → not needed by current keys
</deferred>

---

*Phase: 12-init-shape-completion-full-agent-context-contract*
