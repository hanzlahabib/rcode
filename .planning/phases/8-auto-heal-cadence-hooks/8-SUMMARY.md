# Phase 8: Auto-Heal Cadence + Hooks — Summary

**Status:** Complete
**Delivered:** 2026-04-29
**Tracks:** #461, #463

## What shipped

| Plan | Files | Outcome |
|---|---|---|
| 8.1 | `docs/AUTO-HEAL-CADENCE.md` (new), `README.md` | Recommended schedules per tool with `/loop`, `/schedule`, and crontab examples. Auto-fix safety rules (`--fix` never default, trivial-only, atomic commits, `--quick` forces report-only) explicitly documented. |
| 8.2 | `rihal/workflows/feature-drift.md` (extended), `docs/HOOKS-AUTO-HEAL.md` (new) | `--quick` flag added; hard-coded to suppress `--fix`. Hooks doc shows the `.claude/settings.json` JSON block + opt-in path. PostToolUse only — never blocks edits. |
| 8.3 | `rihal/workflows/feature-drift.md` (`--mode=phase-status` branch), `rihal/agents/rihal-docs-auditor.md` (`<mode_phase_status>`), `scripts/dogfood-check.sh` (Check 6) | Closes **#461** — third drift dimension live. Severity rules (trivial / partial / major) enforced; auto-fix only patches trivial (✅ marker, missing date), never auto-flips status. CI gate fails on major drift only. |

## Decisions honored

- **D-1:** Cadence is documentation, not enforced infra. Users opt in via `/loop`, `/schedule`, or crontab. ✓
- **D-2:** Cadence doc lives at `docs/AUTO-HEAL-CADENCE.md`, linked from README. ✓
- **D-3:** PostToolUse (not PreToolUse) — non-blocking. ✓
- **D-4:** `--quick` mode forces report-only; safety rule documented in workflow + hooks doc. ✓
- **D-5:** Hook is opt-in via `/rihal:enable-hooks`. Off by default. ✓
- **D-6:** Phase-status detector extends existing workflow + agent (`--mode=phase-status` + `<mode_phase_status>`), no new agent. ✓
- **D-7:** Drift findings include phase_number, claimed_status, shipping_signals, evidence, fix_hint. ✓
- **D-8:** Severity tags (trivial / partial / major) match the audit pattern from this session. ✓
- **D-9:** `--fix` mode patches only trivial; never auto-flips Active→Complete. ✓

## Issues confirmed closed

| # | Verification |
|---|---|
| #461 | `/rihal:feature-drift --mode=phase-status` invocable; CI dogfood gate Check 6 confirms phase-status alignment on every run. |

## CI dogfood gate now has 8 checks

```
✓ pass: no orphan state.json (#462)
✓ pass: phase add subcommand registered (#460)
✓ pass: state sync parses heading-style ROADMAP (#455)
✓ pass: state sync warnings: none
✓ pass: roadmap list-phases returns entries (#464 regex part)
✓ pass: roadmap get-phase finds heading-style phase (#464 regex part)
✓ pass: no new workflow ↔ CLI drift beyond known #465
✓ pass: phase-status alignment: ROADMAP claim matches shipping signals (#461)
```

Self-validating dogfood loop holds — every closed issue has a regression check.

## Out of scope (deferred)

- Real-time file-watcher daemon — rejected indefinitely.
- Email/Slack notifications on drift — out of scope; CI gate surfaces in PR.
- Cross-project orchestration — Phase 8 covers single-repo only.
- Implementing `/rihal:enable-hooks` skill body changes — Phase 8 documented the opt-in path; the skill itself can be authored when the rihal-skills team has bandwidth (separate ticket).

## Next steps

- Phase 7 (Marketing Push v2) — partial. I can scaffold install-metric verification + landing page; demo video + social posts require operator action (posts already drafted, see `~/dogfood-posts.txt`).
- Issue #465 still open — 15 missing CLI subcommands referenced by workflows. Phase 10+ work, prioritized by frequency: `commit` first.
