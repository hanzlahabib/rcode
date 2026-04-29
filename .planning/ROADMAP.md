# Rihal Code — Roadmap

**Milestone: M1 — Ship v2 + Tier Docs** (v1.0)
Started: 2026-03 · Current

---

## Phase 01 — Tier-based Documentation Reorg ✅

**Goal:** Make rihal-code approachable. Organize 22+ skills + 17 agents + 17 CLI commands into Starter/Advanced/Ultra/Standards tiers so a new user has a clear entry point.

**Status:** Complete (2026-04-15)

**Delivered:**
- `docs/TIERS.md` — single source of truth for tier organization
- `docs/STANDARDS.md` — contributor rules consolidated
- `docs/V2-PREVIEW.md` — v2 status note
- `README.md` — "🚦 Start Here" navigation block
- `npx rihal-code tiers` CLI command
- Help output regrouped (PROJECT / TEAM / META)
- `postinstall.js` shows the 7-step Golden Path

**Outcome:** New user can find the Golden Path in <10 seconds. Contributors have one STANDARDS doc instead of scattered rules.

---

## Phase 02 — Scaffold Project Skill ✅

**Goal:** Enable Rihalians to bootstrap new projects from the official template repo (`rihal-om/template`) with one command, always pulling fresh.

**Status:** Complete (2026-04-15)

**Delivered:**
- `rihal-scaffold-project` skill (4-step workflow)
- Safety checks: never touches non-empty folders
- Fresh clone every time (no local cache)
- GitHub issue #101 tracking template improvement suggestions

**Outcome:** `rihal-scaffold-project` skill shipped. Template update in #101 is a separate track.

---

## Phase 03 — V2 Stabilization ✅

**Goal:** Merge v1/v2 into a single unified methodology. One install command, one agent roster, one set of slash commands + phrase-activated skills. Verify end-to-end.

**Status:** Complete (2026-04-15)

**Delivered:**
- `rihal/v2/` promoted to `rihal/` root — v2 folder eliminated (`8c61e15`)
- `cli/install-v2.js` → `cli/install.js` — single unified installer (`da2b48e`)
- Install ships: 70 commands + 34 agents + 39 skills + 71 workflows
- Ghost v1 agents purged from model-profiles.json (14 → 0 ghosts) + 14 orphan digests deleted (`ab35321`)
- Missing sprint-planning workflow added (`09c1c55`)
- 5 bloated agents slim-split: plan-checker, codebase-mapper, phase-researcher, project-researcher, roadmapper (#103-#107)
- Docs agents consolidated: deleted doc-writer + doc-verifier aliases (#108)
- `new-project.md` split 1460 → 3 files (780 + 262 + 446) (#102)
- BMAD/GSD references removed from all commit history (95 commits rewritten) + CLI comments
- `output-realism.md` reference added — honest batch-and-confirm discipline
- SKILLS_INDEX.md cleaned (removed 2 bogus v1 agent refs)
- Version bumped to `1.0.0-beta.0`
- CHANGELOG.md: full v1.0.0-beta.0 release notes
- Clean sweep test: zero broken refs, 95/95 tests passing

**Acceptance met:** Fresh install → 70 commands + 34 agents + 39 skills. Smoke test clean. Pushed to origin/main.

---

## Phase 04 — Dashboard Refresh ✅

**Goal:** Majlis dashboard (`server/dashboard.js`) becomes a proper project intelligence view with a design system, hierarchical navigation (Milestone → Phase → Sprint → Task), collapseable roadmap tree, live file browser, and auto-refresh.

**Status:** Complete (2026-04-29 — closed during phase-status drift audit; sprint 04.2 commits already shipped weeks earlier)

**Delivered (Sprint 04.1):**
- Tier breakdown view (Starter / Advanced / Ultra)
- Sprint progress visualization from state.json
- Velocity chart from velocity_history
- Council session list

**Delivered (Sprint 04.2):**
- Inter font + CSS custom properties design system
- Sidebar with Roadmap / Milestones / Phases / Sprints / Tasks nav
- Drill-down: click Milestone → phases, Phase → sprints, Sprint → tasks
- Collapseable M→Phase→Sprint→Task roadmap tree
- Live `.planning/` file browser
- 30s auto-refresh + manual refresh button

**Post-sprint enhancements:**
- Modularized monolithic dashboard (#266)
- `/api/memory` route
- File-browser frontmatter stripping
- Phases-clickable + correct sprint-file sort order
- File-browser scoped to `.planning/` only

**Constraints:**
- Pure Node stdlib — zero npm deps in server code
- Single-file server (`server/dashboard.js`) — modularization preserves the boundary
- View-only — no write endpoints ever

**Acceptance:** ✅ `node server/dashboard.js` starts on :7717. All hierarchy levels navigable with drill-down and back navigation.

---

## Phase 05 — Marketing + Launch (partial)

**Goal:** Publish v2 with tier docs. Get first external users.

**Status:** Closed (partial) — eng-side items shipped, GTM-side items moved to Phase 7

**Shipped:**
- ✅ Publish to npm — `@hanzlaa/rcode` v3.4.4 with `publishConfig.access: public`, multiple `chore(release):` commits
- ✅ Landing page / GitHub README polish — 504-line README, recent polish commit `a1ba0d6`, structured headings (Hero / Start Here / Install / Tour)

**Moved to Phase 7 (Marketing Push v2):**
- ❌ Demo video (90-second tour) — currently a text command list, no actual video
- ❌ Post on X / MENA dev channels — no announcement artifacts found

**Why split:** the eng-shipping motion (npm + README) is fundamentally different from GTM (video + social). Forcing both into one phase blocked closure on the shipped items. Phase 7 picks up the GTM work cleanly.

**Acceptance (revised, eng-only):** ✅ Published on npm with current version v3.4.4. First-10-installs gate moved to Phase 7.

---

## Phase 6 — Feature Doc Drift Auto-Heal ✅

**Goal:** Build a drift detector that reads PRD → epics → stories → code, surfaces stale claims with severity tags, and offers a bounded auto-fix path for trivial items only. Closes the gap between feature-documentation layers that no existing rihal tool spans.

**Status:** Complete (2026-04-29)

**Delivered:**
- `/rihal:feature-drift` workflow + slash command (`rihal/workflows/feature-drift.md`, `rihal/commands/feature-drift.md`)
- `rihal-docs-auditor` extended with `<mode_feature_drift>` section (no new agent — D-4 honored)
- Classifier `drift` type + `do.md` routing-table row + classifier fallback
- `/rihal:memory-audit --fix` for trivial memory bank staleness (atomic commits, severity allowlist)
- 5 prerequisite tooling bugs fixed during scaffolding: #455 #456 #457 #458 #460

**Acceptance:** ✅ `/rihal:feature-drift` invocable; classifier returns `"type":"drift"` for audit/drift phrases; `--fix` enforces trivial-only severity allowlist in code (not agent discretion); SUMMARY.md committed.

---

## Phase 7 — Marketing Push v2

**Goal:** Ship the GTM half of the original Phase 5 — actual demo video, social/community announcements, and verify first external install milestone.

**Status:** Planned

**Plans:**
- Demo video (90-second tour) — actual screencast/Loom/YouTube link, replace text block in README
- Launch posts on X + MENA dev channels (Twitter thread, LinkedIn post, GCC dev community channels)
- Verify first 10 external installs gate (npm download stats, set up basic install telemetry if needed)
- Optional: light landing page (vercel deploy) if README isn't enough conversion surface

**Acceptance:** Demo video linked from README; ≥2 launch channels posted; ≥10 external npm installs documented.

---

## Phase 8 — Auto-Heal Cadence + Hooks

**Goal:** Layer scheduled + edit-time triggers on top of the manual-invoke auto-heal tools shipped in Phase 6. Add the third drift dimension (phase-status drift) to round out the auto-heal portfolio.

**Status:** Planned

**Plans:**
- `/loop` + `/schedule` cadence docs for auto-heal tools — recommended cadences for `/rihal:docs-update`, `/rihal:health`, `/rihal:feature-drift`, `/rihal:memory-audit --fix`
- PostToolUse hook on `docs/`, `prd/`, `epics/` edits — settings.json hook fires `feature-drift --quick`; opt-in via `/rihal:enable-hooks`
- **Phase-status drift detector** (closes #461) — `/rihal:phase-status-drift` (or `feature-drift --mode=phase-status`); compares ROADMAP claim against shipping signals (SUMMARY.md, SPRINT.md, git log on plan files); severity-tags drift; `--fix` flips trivial-only items (✅ marker, missing date)

**Acceptance:** All three drift dimensions covered (project-doc, feature-content, phase-status); cadence docs published; PostToolUse hook installable.

---


## Backlog

- Replace duplicate agents (Fatima, Hussain in v1+v2)
- Consolidate create-prd / edit-prd / validate-prd into one skill with modes
- Archive v1 once v2 is fully stable
- Add Windsurf / Antigravity install paths tested
- Template Improvements (GH #101) — pnpm, Node 20+, .gitignore, README, .rihal/config.json scaffold, TypeScript strict
