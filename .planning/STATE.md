# Rihal Code — State

**Last updated:** 2026-04-16
**Milestone:** M1 — Ship v2 + Tier Docs
**Version:** 1.0.0-beta.0
**Current phase:** 04 — Template Improvements (next to start)
**Branch:** main

---

## Completed

### Phase 01 — Tier-based Documentation Reorg ✅ (2026-04-15)
- TIERS.md, STANDARDS.md, V2-PREVIEW.md
- README "Start Here" block + `rihal-code tiers` command + grouped help

### Phase 02 — Scaffold Project Skill ✅ (2026-04-15)
- `rihal-scaffold-project` (4-step workflow)
- GH issue #101 for template improvements

### Phase 03 — V2 Stabilization ✅ (2026-04-15/16)
- v1/v2 merged into single `rihal/` root (v2 folder eliminated)
- Unified installer: `cli/install.js` (70 cmd + 34 agents + 39 skills)
- Ghost v1 agents purged (model-profiles, 14 orphan digests)
- 5 bloated agents slim-split (#103-#107)
- Docs agents consolidated — 2 aliases deleted (#108)
- new-project.md split to 3 files (#102)
- BMAD/GSD history rewrite (95 commits)
- output-realism.md reference added
- Version bumped to 1.0.0-beta.0
- Clean sweep: zero broken refs, 95/95 tests

### Additional work (not in original roadmap)
- 8 GH issues created and 7 closed (#102-#109)
- #110 created: Phase → Sprint → Story/Task hierarchy (future milestone)
- Sprint-planning workflow added (was missing)
- SKILLS_INDEX cleaned (2 bogus v1 refs removed)
- CHANGELOG v1.0.0-beta.0 release notes written

---

## In Progress

None.

---

## Decisions

- **v1/v2 merged.** Single `rihal/` root. No more v2-prototype branch. `cli/install.js` is the only installer.
- **`.planning/` stays separate from `.rihal/`.** User artifacts vs system infra. Confirmed 2026-04-16.
- **Phase → Sprint → Story/Task hierarchy change** → deferred to future milestone (#110). Current NN.MM.TT numbering stays for now.
- **Force-push authorized one-time** (2026-04-15) for history rewrite. Not blanket auth.
- **Template repo stays external.** `rihal-scaffold-project` always clones fresh.
- **Tier doc is canonical.** `docs/TIERS.md` is single source of truth.
- **Fresh install command:** `git clone --depth 1 ... /tmp/rihal-src && node /tmp/rihal-src/cli/install.js . && rm -rf /tmp/rihal-src`

---

## Blockers

None.

---

## Open GH Issues

| # | Title | Priority |
|---|-------|----------|
| #101 | Template improvements (pnpm, .rihal/config, Node 20+, gitignore) | p2 |
| #110 | Phase → Sprint → Story/Task hierarchy (remove Plan level) | p2 |

---

## Next Action

Start Phase 04 (Template Improvements) — audit `rihal-om/template`, open PRs for each improvement in #101.

Or start Phase 05 (Dashboard Refresh) if template work is lower priority.
