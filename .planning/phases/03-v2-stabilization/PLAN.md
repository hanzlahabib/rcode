---
phase: 03
name: V2 Stabilization
status: complete
completed_at: 2026-04-16
milestone: M1
---

# Phase 03 — V2 Stabilization

**Goal:** Merge v1/v2 into a single unified methodology. One install command, one agent roster, one set of slash commands + phrase-activated skills. Verify end-to-end.

## Requirements

- REQ-03-UNIFY: Single `rihal/` root — no v1/v2 split
- REQ-03-INSTALLER: `cli/install.js` — one unified installer
- REQ-03-CLEAN: Zero ghost agents, zero broken refs
- REQ-03-NAMING: All BMAD/GSD references removed
- REQ-03-VERSION: Version bumped to 1.0.0-beta.0

## Approach

Promote `rihal/v2/` to `rihal/` root. Merge install scripts. Audit and purge all ghost agents, orphan digests, broken includes. Rewrite git history to remove BMAD/GSD naming. Slim-split bloated agents.

## Delivered

- `rihal/v2/` → `rihal/` root (`8c61e15`)
- `cli/install-v2.js` → `cli/install.js` (`da2b48e`)
- Ships: 70 commands + 34 agents + 39 skills + 71 workflows
- 14 ghost v1 agents purged from model-profiles.json
- 14 orphan digests deleted
- Missing sprint-planning workflow added (`09c1c55`)
- 5 bloated agents slim-split (#103–#107)
- `new-project.md` split 1460 → 3 files
- 95 commits rewritten — BMAD/GSD refs removed
- `output-realism.md` reference added
- CHANGELOG: full v1.0.0-beta.0 release notes

## Acceptance

✅ Fresh install → 70 commands + 34 agents + 39 skills
✅ Smoke test clean — zero broken refs
✅ 95/95 compliance checks passing
✅ Pushed to origin/main
