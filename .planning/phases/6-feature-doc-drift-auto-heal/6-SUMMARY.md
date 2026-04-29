# Phase 6: Feature Doc Drift Auto-Heal — Summary

**Status:** Complete
**Delivered:** 2026-04-29
**Tracks:** #459

## What shipped

| Plan | Files | Outcome |
|---|---|---|
| 6.1 | `rihal/workflows/feature-drift.md` (new), `rihal/commands/feature-drift.md` (new), `rihal/agents/rihal-docs-auditor.md` (extended) | `/rihal:feature-drift` workflow + slash command + `<mode_feature_drift>` section on docs-auditor agent |
| 6.2 | `rihal/bin/rihal-tools.cjs`, `rihal/workflows/do.md` | `classifyScope` returns `'drift'`; `cmdClassifyQuestion` has new `drift` signal group; `do.md` routing table + classifier fallback both route drift intent to `/rihal:feature-drift` |
| 6.3 | `rihal/workflows/memory-audit.md`, `rihal/skills/core/rihal-memory-audit/SKILL.md` | Opt-in `--fix` flag on memory-audit; hard severity allowlist (trivial only); atomic commits per fix; SKILL triggers updated |

## Decisions honored

- **D-1:** `--fix` is opt-in across both `/rihal:feature-drift` and `/rihal:memory-audit` — never default.
- **D-2:** Severity allowlist for `--fix` is enforced in workflow code, not agent discretion.
- **D-3:** Missing PRD/epics/stories layers → warn + continue with partial scope.
- **D-4:** `rihal-docs-auditor` extended via `<mode_feature_drift>` section. No new agent.
- **D-5:** Plans 4 (cadence docs) and 5 (PostToolUse hook) deferred to Phase 7 as intended.

## Acceptance verification

All 7 task acceptance criteria checked via grep against the actual files (see Wave 1 + Wave 2 verification output in commit messages). Notable smoke tests:

- `node rihal/bin/rihal-tools.cjs classify-question "audit feature docs for drift"` → `"type": "drift"` ✓
- `node rihal/bin/rihal-tools.cjs classify-question "fill out existing audit"` → `"type": "drift"` ✓
- `node rihal/bin/rihal-tools.cjs classify-question "fix typo"` → NOT drift (no false positive) ✓

## Out of scope (deferred to Phase 7)

- `/loop` + `/schedule` cadence docs for auto-heal tools
- PostToolUse hook on `docs/`, `prd/`, `epics/` edits
- Real-time file-watcher daemon (rejected indefinitely)

## Sibling fixes shipped during scaffolding

While scaffolding Phase 6 we surfaced and closed 4 systemic workflow bugs that the auto-heal feature is meant to detect — meta-confirmation that the gap was real:

- #455 — `state sync --from-disk` parser drift (heading-style ROADMAP)
- #456 — refs migration regression (`/rihal-command` form doesn't exist)
- #457 — `/rihal:do` dispatch ambiguity → triple-banner stall
- #458 — `/rihal:do` executes inline when routing fails
- #460 — `/rihal:add-phase` called non-existent CLI subcommand

## Next steps

- `/rihal:feature-drift` is now invocable. First production run will exercise the verifier-loop pattern.
- Phase 7 picks up cadence docs + PostToolUse hook. Recommend running `/rihal:feature-drift --fix` on this repo before opening Phase 7 to baseline drift state.
