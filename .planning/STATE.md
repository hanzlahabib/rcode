# Rihal Code — State

**Last updated:** 2026-04-29
**Milestone:** M1 — Ship v2 + Tier Docs
**Version:** 3.4.4
**Current phase:** 13 — Parser + Walker Consolidation (in flight, separate session)
**Branch:** main

---

## Completed (M1)

| # | Name | Date |
|---|---|---|
| 01 | Tier-based Documentation Reorg | 2026-04-15 |
| 02 | Scaffold Project Skill | 2026-04-15 |
| 03 | V2 Stabilization | 2026-04-15/16 |
| 04 | Dashboard Refresh | 2026-04-29 (closed during phase-status drift audit) |
| 06 | Feature Doc Drift Auto-Heal | 2026-04-29 |
| 08 | Auto-Heal Cadence + Hooks | 2026-04-29 |
| 09 | Dogfood Audit Pass | 2026-04-29 |
| 10 | Close Auto-Heal Tooling Gaps | 2026-04-29 |
| 11 | CLI Subcommand Sweep — high-impact #465 items | 2026-04-29 |
| 12 | Init Shape Completion — full agent context contract | 2026-04-29 |

Phase 05 (Marketing + Launch) split: eng-side shipped (npm + README), GTM-side moved to Phase 7.

---

## In Progress

- **Phase 13** — Parser + Walker Consolidation (#469). SPRINT files drafted in another session, not yet merged.

---

## Planned (M1 remaining)

- **Phase 7** — Marketing Push v2 (demo video, X / MENA dev channels, first 10 install verification)

---

## Decisions

- **v1/v2 merged.** Single `rihal/` root. No more v2-prototype branch. `cli/install.js` is the only installer.
- **`.planning/` stays separate from `.rihal/`.** User artifacts vs system infra. Confirmed 2026-04-16.
- **`.rihal/bin/` ↔ `rihal/bin/` auto-sync** via PostToolUse hook (#470). Three layers: hook (proactive), dogfood gate (reactive), `scripts/sync-bin.sh` (escape hatch).
- **Drift detection opt-in strict mode** via `--strict` / `RIHAL_STRICT_STATE=true` (#200). Default unchanged.
- **Multi-IDE install on `--yes`** (#182). Detects every signal and installs into all of `.claude/`, `.cursor/`, `.antigravity/`, `.vscode/` when found.
- **CWD-vs-PROJECT_ROOT guard** (#473) refuses to operate when CWD has its own `.rihal/` but doesn't match the binary's resolved root.
- **Phase → Sprint → Story/Task hierarchy change** → deferred to future milestone (#110). Current NN.MM.TT numbering stays for now.
- **Template repo stays external.** `rihal-scaffold-project` always clones fresh.
- **Tier doc is canonical.** `docs/TIERS.md` is single source of truth.

---

## Blockers

None.

---

## Open GH Issues (high-priority)

| # | Title | Priority |
|---|-------|----------|
| #469 | Phase 13 — parser + walker consolidation | p1 (in flight) |
| #226 | /rihal-new-project doesn't trigger create-prd | p2 (workflow refactor) |
| #110 | Phase → Sprint → Story/Task hierarchy refactor | p3 (future milestone) |
| #173 | MCP server | p3 (depends on #171/#172) |
| #379, #380 | 40 agent files quality + best-practice template | p3 (own phase) |
| #465 | 9 remaining missing CLI subcommands | p3 (Phase 14+ if consumed) |
| #479 | 3 phantom commands surfaced by /rihal-status | closed in `a091be6` |
| #480 | install drift (.rihal v3.3.2 vs package v3.4.4) | deferred |
| #481 | 8 more phantom CLI subcommands found via sweep | **Phase 15 — in flight** |

---

## Roadmap Evolution

- Phase 15 added (2026-04-30): fix 8 phantom CLI subcommands per #481 — phases list, find-phase, uat render-checkpoint, audit-uat, requirements mark-complete, todo match-phase, learnings copy, docs-audit. Goal: zero diff between called and implemented top-level subcommands.
- Phase 28 added + executed (2026-05-15): audit gap closure — ECC-parity hooks (PreCompact, Stop verify, cost tracking, compact-nudge, Bash safety), agent-behavior regression harness, artifact JSON-schema validation, iterative-retrieval loop. Covers #742-#750. 4 sprints executed on branch `audit-gap-closure`.
- Phase 29 added + executed (2026-05-15): security hardening — orchestrator unauthenticated RCE fixed, bash-guard bypasses closed, file-read scoping. Covers #752-#754. 3 sprints executed on branch `audit-gap-closure`.
- Phase 30 added + executed (2026-05-15): marketability — MIT license adopted, README cut 535→183 lines, metadata consistency, onboarding clarity, polish. Covers #755-#759. 4 sprints executed on branch `audit-gap-closure`. DEFERRED: real demo GIF + dashboard screenshot capture (zero-byte placeholders committed at docs/assets/ — human task). Follow-up #760: 5 skills fail the new schema validation.

---

## Next Action

- **Phase 15** — implement the 8 phantom subcommands per priority order in #481
- **Phase 13** — let the in-flight session land its SPRINT files
- **Phase 7** — Marketing Push v2 (GTM half of original Phase 05)

State authoritative source: `.rihal/state.json` (machine-readable). This file is the human-readable narrative companion.
