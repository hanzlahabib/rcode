# Phase 9 — Plan 1: Dogfood Scan Results

**Date:** 2026-04-29
**Repo:** rihal-code (commit chain post-#462 fix)
**Tools scanned:** 8

---

## state sync --from-disk

**Claimed:** Sync `.rihal/state.json` from disk artifacts (ROADMAP.md headings + epics).

**Observed:**
```json
{
  "ok": true,
  "synced": true,
  "milestones_found": 1,
  "phases_found": 9,
  "phases_upserted": 0,
  "epics_found": 0,
  "roadmap_exists": true,
  "epics_exists": false
}
```

**Drift / gaps:** None — post-#455 fix is holding. All 9 phases tracked, no warnings.

**Severity:** none

---

## roadmap list-phases

**Claimed:** Return JSON array of all phases in ROADMAP.md.

**Observed (pre-fix):** `[]`

**Observed (post #464 regex fix, this session):**
```json
[
  { "number": "01", "name": "Tier-based Documentation Reorg ✅", "status": "planned" },
  { "number": "02", "name": "Scaffold Project Skill ✅", "status": "planned" },
  ...
  { "number": "9", "name": "Dogfood Audit Pass", "status": "planned" }
]
```

**Drift / gaps:**
1. Pre-fix: regex required `:` separator only; rejected `—` em-dash. **Fixed in commit `651738e... → 5099f...` this session.**
2. Remaining: `status` field always reads `"planned"` regardless of actual ROADMAP entry status (e.g., `**Status:** Complete (2026-04-15)`). Parser doesn't read the Status line.

**Severity:** breaking → fixed (regex), shape (status field still wrong) — tracked under #464

---

## roadmap get-phase N

**Claimed:** Return `{found, phase_number, name, goal, requirements, success_criteria, plans}` for a single phase.

**Observed (post-fix):**
```json
{
  "found": true,
  "phase_number": "6",
  "name": "Feature Doc Drift Auto-Heal ✅",
  "goal": "Build a drift detector that reads PRD → epics → stories → code...",
  "requirements": [],
  "success_criteria": [],
  "plans": []
}
```

**Drift / gaps:**
1. Pre-fix: regex same root cause as list-phases (#464). **Fixed.**
2. `requirements` empty even when ROADMAP has them — parser doesn't read `**Requirements:**` consistently
3. `plans` empty even when SPRINT.md files exist in phase dir — `parsePlans` looks for table rows or specific checklist format; doesn't scan `*-SPRINT.md` files

**Severity:** shape (#464 covers it; secondary fields) — defer to follow-up

---

## init phase-op N

**Claimed (per `discuss-phase.md` line 146):** Return JSON with `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `padded_phase`, `has_research`, `has_context`, `has_plans`, `plan_count`, `roadmap_exists`, `response_language`, `commit_docs`, ...

**Observed:** Generic discovery context only — `workflow`, `question`, `flags`, `panel`, `scores`, `question_type`, `question_signals`, `config`, `installed_agents`, `paths`, `state_exists`. **None of the documented phase-aware fields present.**

**Drift / gaps:**
1. Init function doesn't read ROADMAP for the phase number provided — never has, despite workflow files documenting these fields as expected.
2. This forced manual scaffolding throughout this session (Phase 6 + Phase 9 CONTEXT/SPRINT files written by hand instead of using the canonical orchestration).

**Severity:** breaking — workflow agents fall through error branches. **#464 covers; this is the bigger half**.

---

## init sprint-plan N

**Claimed (per `plan.md` line 79):** Same field set as `init phase-op` plus `researcher_model`, `planner_model`, `checker_model`, `research_enabled`, `plan_checker_enabled`, `nyquist_validation_enabled`, file paths.

**Observed:** Same generic discovery context. Phase fields and per-agent model fields all missing.

**Severity:** breaking — same root as init phase-op. #464

---

## help (CLI subcommand discovery)

**Claimed:** Print every available subcommand.

**Observed:** Includes `phase add <name>` line (post-#460 fix ✓). All commonly-referenced subcommands present.

**Severity:** none

---

## /rihal:feature-drift (workflow + agent — static check)

**Claimed:** Detect drift between PRD, epics, stories, and code. Severity-tagged report; --fix for trivial only.

**Observed (static — agent not spawned this scan):**
- `rihal/workflows/feature-drift.md` exists ✓
- `rihal/commands/feature-drift.md` exists ✓
- `rihal/agents/rihal-docs-auditor.md` contains `<mode_feature_drift>` section ✓

**Drift / gaps:** None at the static level. First production run is its own subsequent task — would surface real drift between rihal-code's PRD (none), epics (none), stories (none), and code. Worth noting: rihal-code has no PRD/epics/stories layer — it's a tooling project. Tool would warn-and-skip per D-3.

**Severity:** none (static); production run deferred.

---

## /rihal:memory-audit (read-only + --fix support)

**Claimed:** Audit Memory Bank, optionally `--fix` trivial staleness.

**Observed (static):**
- `rihal/workflows/memory-audit.md` has `FIX_MODE` block + `<step name="apply_fixes">` ✓
- `.rihal/memory/INDEX.md` exists ✓ (precondition met for production run)

**Drift / gaps:** None at static level.

**Severity:** none

---

## Summary

| Tool | Severity | Status |
|---|---|---|
| state sync --from-disk | none | passing |
| roadmap list-phases | breaking → **fixed this session** | regex fixed; status field secondary |
| roadmap get-phase | breaking → **fixed this session** | regex fixed; requirements/plans secondary |
| init phase-op | breaking | open in #464 |
| init sprint-plan | breaking | open in #464 |
| help | none | passing |
| /rihal:feature-drift (static) | none | passing |
| /rihal:memory-audit (static) | none | passing |

**Filed this session:** #464 — umbrella for the 3 ROADMAP-parser drifts surfaced.
**Fixed this session:** regex in `lib/roadmap.cjs` (closed 2/3 of #464).
**Deferred:** init phase-aware fields (#464 part 3), status-line parsing in lib/roadmap.cjs, requirements/plans parsing in get-phase output. All non-blocking — Phase 9 ships with these as known follow-ups.
