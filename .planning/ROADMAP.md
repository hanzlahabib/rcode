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

## Phase 03 — V2 Stabilization

**Goal:** V2 (36 agents, 67 workflows, 69 commands) just shipped to main. Now verify it works end-to-end in a fresh project and wire CLI to v2 where it isn't already.

**Status:** Planned

**Plans:**
- Test `npx rihal-code install` on a fresh dir (dogfood)
- Verify all 69 slash commands load in Claude Code
- Identify any CLI commands still pointing to v1 paths
- Fix broken references if any
- Update README to describe v2 as the default (not preview)

**Acceptance:** v2 install on fresh dir → 69 commands available → 5 council agents responsive → no errors.

---

## Phase 04 — Template Improvements (Issue #101)

**Goal:** Close template suggestions: pnpm scripts, `.rihal/config.json` scaffold, Node 20+ engine, gitignore, README template, TypeScript strict.

**Status:** Planned (tracked in GH #101)

**Plans:**
- Audit `rihal-om/template` current state
- Open PRs on template repo per suggestion
- Link PRs from #101

**Acceptance:** #101 closed. Template is modern + Rihal-ready out of the box.

---

## Phase 05 — Dashboard Refresh

**Goal:** Diwan view-only dashboard (`server/dashboard.js`) should visualize tier breakdown, phase progress, and council sessions pulled from `.rihal/state.json` and `.planning/`.

**Status:** Planned

**Plans:**
- Add tier view (Starter / Advanced / Ultra)
- Add phase progress visualization from ROADMAP.md
- Keep dep-free (pure Node stdlib)

**Acceptance:** `node server/dashboard.js` starts clean, shows tiers + phase progress.

---

## Phase 06 — Marketing + Launch

**Goal:** Publish v2 with tier docs. Get first external users.

**Status:** Planned

**Plans:**
- Publish to npm
- Landing page / GitHub README polish
- Demo video (90-second tour)
- Post on X / MENA dev channels

**Acceptance:** Published on npm. First 10 external installs.

---

## Backlog

- Replace duplicate agents (Fatima, Hussain in v1+v2)
- Consolidate create-prd / edit-prd / validate-prd into one skill with modes
- Archive v1 once v2 is fully stable
- Add Windsurf / Antigravity install paths tested
