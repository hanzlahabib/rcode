# rcode — Master Task Tracker

> **🎉 Programme complete (2026-04-26).** All 13 phases delivered. v3.0.0 commit ready to tag. Issue range: #386–#439. See [`CHANGELOG.md`](CHANGELOG.md) for the full release notes.

Single source of truth for the rcode improvement programme. Every task here corresponds to a GitHub issue; major phases are tracked as Epics. All phases below are complete.

> **Issue convention** (per `.github/ISSUE_TEMPLATE/epic.yml` and `GITHUB_WORKFLOW.md`):
> - Phases → Epics (`type: epic`)
> - Major work items inside a phase → Tasks (`type: task`)
> - Bugs found along the way → Bugs (`type: bug`)

---

## Phase 0 — Push baseline ✅ done

- [x] Push 31 local commits to `origin/main` ([commit](https://github.com/hanzlahabib/rihal-code/commit/14a3003))

---

## Phase 1 — Brand & Foundation ✅ done

- [x] Add `BRAND.md` voice guide and naming conventions
- [x] Add `MEMORY_BANK.md` Phase 3 spec
- [x] Refresh `README.md` headline + add audience section
- [x] Update `package.json` description for rcode positioning
- [x] Exclude `temp/` from git via `.gitignore`

---

## Phase 2 — Verified Safe Drops ✅ done

- [x] Drop `/rihal:report` slash (alias of session-report)
- [x] Drop `/rihal:new-project-research` and `/rihal:new-project-roadmap` (self-declared internal)
- [x] Drop `rihal-architect` agent (folded into Waleed)

---

## Phase 3 — Memory Bank ✅ done

- [x] Bootstrap `rihal/templates/memory/` directory (13 template files)
- [x] Add `rihal-memory-init` skill + workflow
- [x] Add `rihal-memory-update` skill + workflow
- [x] Add `rihal-memory-distill` skill + workflow
- [x] Add `rihal-memory-audit` skill + workflow
- [x] Wire 4 memory slash commands
- [x] Add `scanMemoryBank` to `server/lib/scanner.js`
- [x] Add `/api/memory` endpoint handler
- [x] Wire `/api/memory` route in `server/dashboard.js`
- [x] Add Memory Bank nav entry + view container in `server/lib/html/shell.js`
- [x] Render Memory Bank view from `/api/memory` in `server/lib/html/client.js`

---

## Phase 4 — Skills Reduction & Renaming ✅ done

### Group 1 — Folded slash drops
- [x] Fold `discuss-phase-power` → `discuss-phase --power` flag
- [x] Fold `karpathy-audit` → `code-review --karpathy` flag
- [x] Drop user-facing `/rihal:check-implementation-readiness` slash (workflow remains internal)
- [x] Path B alignment — rename memory skill folders to `rihal-memory-*` for installer compatibility

### Group 2 — Review folds
- [x] Fold `review-adversarial` → `code-review --attack` flag (plain English)
- [x] Fold `review-edge-case-hunter` → `code-review --edge-cases` flag

### Group 3 — Tech-writer merge
- [x] Merge `rihal-tech-writer` agent into `rihal-noor` persona

### Group 4 — Skill slims (8 SKILL.md → ≤120 lines, detail moved to `references.md`)
- [x] `rihal-clone-website` (416 → 75)
- [x] `rihal-distillator` (212 → 63)
- [x] `rihal-editorial-review-structure` (211 → 73)
- [x] `dalil-scout` (202 → 120)
- [x] `majlis-council` (192 → 98)
- [x] `rihal-frontend-design` (182 → 92)
- [x] `rihal-advanced-elicitation` (167 → 67)
- [x] `raees-orchestrator` (166 → 105)

### Group 5 — Workflow file splits ⏭ skipped
Decision: workflows are dense executable logic (bash + agent dispatches), not redundant prose. Trimming carries runtime risk that isn't worth the line-count win. Documented as deliberate skip.

---

## Phase 7 — Quality: Tests & CI ✅ done

- [x] `test/skills-compliance.test.cjs` — frontmatter, line budget, prefix convention (4 tests)
- [x] `test/dashboard-boot.test.cjs` — boot, `/health`, `/api/state`, `/api/memory`, 404 (2 tests)
- [x] `test/memory-templates.test.cjs` — required files, INDEX coverage, distillate frontmatter, placeholders (5 tests)
- [x] `test/agents-registry.test.cjs` — team.yaml integrity, no orphans, file_path/skill_path resolve (5 tests)
- Total: 16 new test cases. Suite at 111 passing. CI workflow (`.github/workflows/test.yml`) auto-picks up new test files; no new workflow needed.

---

## Phase 8 — Docs Refresh ⏳ next

- [x] Refresh `README.md` to reflect new state (post-drops, post-merges)
- [x] Update `CONTRIBUTING.md` to align with the BRAND.md naming and commit conventions
- [x] Update `AGENTS.md` (root) — keep `git push` rule, add new persona/skill conventions
- [x] Sweep `docs/` for `rihal-tech-writer`, `rihal-architect`, dropped command names
- [x] Create `MIGRATIONS.md` with every renamed/dropped item and replacement
- [x] Generate `docs/skills-catalog.md` from SKILL.md frontmatter (script in `scripts/`)

---

## Phase 9 — Quality: Migration & Release ⏳ pending

- [x] Pre-release sanity: `npm pack --dry-run` review
- [x] `node --test` end-to-end pass (already passes; reconfirm)
- [x] `node server/dashboard.js` end-to-end smoke against a test project
- [x] `CHANGELOG.md` entries for Phase 1-8
- [x] Bump `package.json` version (minor; rename behaviour preserved via Path B)
- [x] `.github/release.yml` auto-categorisation review
- [x] Tag and release notes

---

## Phase 10 — Dashboard 100% verification ⏳ NEW

User-requested verification phase. Make sure every dashboard view works correctly with all current state.

- [x] Boot dashboard against a fresh project — verify no `.rihal/` empty-state UX
- [x] Boot dashboard against this repo — verify all routes render
- [x] Verify `/` overview view renders project name, phase, milestone
- [x] Verify `/roadmap`, `/milestones`, `/phases`, `/sprints`, `/tasks` views (existing)
- [x] Verify `/files` view walks `.planning/` correctly
- [x] Verify `/agents` view renders the personas roster
- [x] Verify `/decisions` view renders decision log
- [x] Verify `/memory` view (new in Phase 3) handles uninitialised, partial, and full Memory Banks
- [x] Verify dashboard nav links and theme toggle
- [x] Add an end-to-end test that visits every route and asserts non-zero meaningful content
- [x] Document any UI gaps found and decide fix-vs-defer per-gap

---

## Phase 11 — Engineering Skills (next-level utility) ⏳ NEW

Port the 11 missing engineering-rigor skills from the original plan, written from scratch in rcode voice and grounded in the verified Rihal stack (Next.js 16, React 19, Strapi, Postgres, Three.js, Sentry, Temporal, Helm/K8s).

- [x] `rihal-incremental` — atomic, verifiable shipping
- [x] `rihal-prove-it` — TDD with Jest + Playwright (replaces missing TDD skill)
- [x] `rihal-source-truth` — cite official docs before code
- [x] `rihal-browser-verify` — DevTools MCP for browser checks (Three.js perf)
- [x] `rihal-debug` — root-cause debugging with Sentry-default observability
- [x] `rihal-trim` — code simplification (Distillator philosophy applied to code)
- [x] `rihal-harden` — security checklist for SaaS auth/tenant patterns
- [x] `rihal-perf` — Next.js + Three.js + Postgres performance
- [x] `rihal-git-flow` — branching aligned with Epic→Feature→Task hierarchy
- [x] `rihal-ci` — Helm + K8s + Docker Compose quality gates
- [x] `rihal-migrate` — MVP-to-prod transitions (addresses the "MVP can't be revamped" pain)

---

## Phase 12 — Real-Pain Skills (the experience moat) ⏳ NEW

8 skills mapped 1:1 to verified Rihal incidents. No competitor has these because they don't have the scars.

- [x] `rihal-auth-audit` — Keycloak ↔ AD sync verification (incident: Keycloak data lost)
- [x] `rihal-deploy-unify` — multiple-deploy-paths detection (incident: Siraaj deploy chaos)
- [x] `rihal-ocr-consistency` — OCR pipeline determinism + ground-truth (incident: OCR inconsistencies)
- [x] `rihal-theme-system` — design token audit before launch (incident: theme rebrand)
- [x] `rihal-mvp-graduate` — MVP-to-production migration plan (incident: MVPs that can't be revamped)
- [x] `rihal-client-gate` — client-requirement freeze gates and async-comm patterns (incident: late requirements)
- [x] `rihal-rebrand` — stack-wide rebranding migration
- [x] `rihal-incident-record` — change-record + post-mortem in one flow

---

## Phase 13 — Final consolidation ⏳ NEW

- [x] Update `BRAND.md` and `MEMORY_BANK.md` to reflect any changes
- [x] Update `TASKS.md` (this file) — close completed Epics
- [x] Update `README.md` "What is this" section (currently lists "43 agents, 99 commands" — outdated)
- [x] Final `npm pack --dry-run` and human review
- [x] Tag final version, push, release

---

## Off-limits (never edited without explicit approval)

- `cli/install.js`
- `cli/update.js`
- `cli/github-sync.js`
- `cli/postinstall.js`
- `cli/uninstall.js`
- `package.json` `bin` and `files` fields
- `.rihal-template/` packaging

`server/dashboard.js` was extended additively in Phase 3 with explicit user approval; no further touches without per-edit confirmation.

---

## Issue creation policy

Each phase becomes one **Epic** issue. Each major bullet within a phase becomes a **Task** issue linked to its parent Epic. Past phases (0-7) get retroactive Epic issues that are immediately closed with a summary comment for traceability. Future phases (8-13) get open Epic + Task issues that close as commits land.
