# Phase 9: Dogfood Audit Pass — Summary

**Status:** Complete
**Delivered:** 2026-04-29
**Tracks:** #463

## What shipped

| Plan | Deliverable | Outcome |
|---|---|---|
| 9.1 | `SCAN-RESULTS.md` | 8 tools scanned. #464 surfaced (3-gap parser drift); regex part fixed in `lib/roadmap.cjs` (commit `c8fdd...`); init phase-aware fields part still open. |
| 9.2 | `DRIFT-SWEEP.md` | 134 unique CLI invocations extracted from 71 workflows. **15 missing subcommands** filed under #465 — biggest single drift surface caught this session. |
| 9.3 | `STATE-PATHS.md` | 33 `state.json` references audited. **Zero drift.** Status: Clean. #462 fix held. |
| 9.4 | `scripts/dogfood-check.sh` + `.github/workflows/dogfood.yml` + `package.json` | CI gate runs on every push to main; fails on regression of #455 #460 #462 #464 + on NEW drift beyond #465's known baseline. <2s runtime. |

## Issues filed during Phase 9

| # | Title | Status |
|---|---|---|
| #463 | Phase 9 umbrella — Dogfood Audit Pass | Closed by this phase |
| #464 | roadmap list-phases / get-phase / init phase-op return empty for heading-style ROADMAP | Regex part fixed; init fields still open (Phase 10+) |
| #465 | 15 subcommands referenced by workflows but missing from rihal-tools.cjs | Filed; deferred to follow-up phases for implementation |

## Issues confirmed closed (audit verified)

| # | Verification |
|---|---|
| #455 | `state sync --from-disk` parses heading-style ROADMAP — CI gate confirms |
| #460 | `phase add` exists in CLI help + works end-to-end — CI gate confirms |
| #462 | No orphan `.planning/state.json` — CI gate confirms |
| #464 (regex) | `roadmap list-phases` returns 9 entries — CI gate confirms |

## Self-validating loop confirmed

Plan 9.4's CI gate caught 2 missing subcommands (`phases`, `frontmatter`) that plan 9.2's manual sweep missed. Updated #465 baseline accordingly. The dogfood pattern works: stricter automated checks find what eyeballed sweeps miss.

## Decisions honored

- **D-1:** Every gap surfaced got a filed GH issue (#464, #465) — no silent fixes ✓
- **D-2:** Audit was read-only; modifications happened only as explicit fix commits ✓
- **D-3 / D-4:** Drift sweep classified by severity; 15 subcommands all `breaking` → tracked, not silently allowed ✓
- **D-5:** State path audit confirmed exactly one canonical state file ✓
- **D-6 / D-7:** CI gate uses bash + node only, fails on the documented conditions ✓
- **D-8:** Phase 9 fixed only what the audit required; the 15 missing subcommand implementations stay scoped as Phase 10+ work ✓

## Out of scope (deferred)

- **Implementing the 15 missing subcommands (#465)** — each is a feature in its own right. Phase 10+ work.
- **`init phase-op` / `init sprint-plan` phase-aware fields (#464 part 3)** — workflows currently fall through error branches; agents work around by hardcoding paths. Larger surface, deferred.
- **`/rihal:dogfood-scan` slash-command wrapper** (Plan 5 stretch from #463) — wait for SCAN-RESULTS.md format to stabilize.
- **Status field in `roadmap list-phases` output** — always "planned" regardless of ROADMAP entry. Cosmetic; deferred.

## Commit chain (Phase 9)

```
{newest-commit}  feat(9.4): CI dogfood gate — fail-on-regression for closed issues
{prev-commit}    feat(9.1+9.2+9.3): wave 1 dogfood audit — scan + drift + state
{prev-commit}    fix(roadmap): accept em-dash + hyphen separators in phase headings  (#464)
{prev-commit}    plan(9): 4 sprints across 2 waves — dogfood audit pass
{prev-commit}    fix(cli): 'phase add' writes state to .rihal/state.json (not .planning/) (#462)
```

(Includes earlier session commits for #455, #456, #457, #458, #460 closures + Phase 6 delivery.)

## Next steps

- Phase 10 candidate: implement the highest-impact missing subcommands from #465 (`commit`, `check-implementation-readiness`, `generate-claude-md`).
- Phase 8 still queued: cadence docs + PostToolUse hook + `/rihal:phase-status-drift` (closes #461).
- Phase 7 still queued: marketing push (demo video + social posts + install metric).
