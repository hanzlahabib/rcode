# Rihal Code — State

**Last updated:** 2026-04-15
**Milestone:** M1 — Ship v2 + Tier Docs
**Current phase:** 03 — V2 Stabilization (next to start)
**Branch:** main

---

## Recently Completed

### Phase 01 — Tier-based Documentation Reorg ✅
- Commits: `2b692c2` · `aaeaa69` · `dffc2b0`
- TIERS.md, STANDARDS.md, V2-PREVIEW.md created
- README "Start Here" block
- `rihal-code tiers` command + grouped help + postinstall Golden Path

### Phase 02 — Scaffold Project Skill ✅
- Commit: `16b7a9a`
- Skill: `rihal-scaffold-project` (4-step workflow)
- GH issue #101 opened for template improvements

### History cleanup (2026-04-15)
- Rewrote 95 commits across main + v2-prototype
- Removed all BMAD/GSD references (subjects + bodies)
- Force-pushed to origin/main and origin/v2-prototype
- Backups kept as `backup/pre-rewrite-*` tags (local only)

---

## In Progress

None. Phase 03 (V2 Stabilization) is the next planned phase — not started.

---

## Decisions

- **v1 + v2 co-exist on main.** v2 is the direction but CLI installer still defaults to v1 `init`. v2 has its own `install-v2.js`. Merge path TBD in Phase 03.
- **Force-push authorized one-time** (2026-04-15) for history rewrite. Future pushes require fresh auth.
- **Template repo stays external.** `rihal-scaffold-project` always clones fresh from `github.com/rihal-om/template` — no local copy.
- **Tier doc is canonical.** `docs/TIERS.md` is the single source of truth; README and CLI reference it.

---

## Blockers

None.

---

## Next Action

Start Phase 03 (V2 Stabilization) — dogfood `npx rihal-code install` on a fresh dir, verify all 69 commands load, identify any v1/v2 inconsistencies.

Alternatively: work Phase 04 (Template Improvements) in parallel since it's a separate repo.
