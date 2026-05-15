---
archived: 2026-05-16
milestone: M1 — Ship v2 + Tier Docs
status: completed
---

# Rihal Code — Roadmap (Archived — M1 Ship v2 + Tier Docs)

**Milestone: M1 — Ship v2 + Tier Docs**
Started: 2026-03 · Shipped: 2026-05-16

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
- `/rihal-feature-drift` workflow + slash command (`rihal/workflows/feature-drift.md`, `rihal/commands/feature-drift.md`)
- `rihal-docs-auditor` extended with `<mode_feature_drift>` section (no new agent — D-4 honored)
- Classifier `drift` type + `do.md` routing-table row + classifier fallback
- `/rihal-memory-audit --fix` for trivial memory bank staleness (atomic commits, severity allowlist)
- 5 prerequisite tooling bugs fixed during scaffolding: #455 #456 #457 #458 #460

**Acceptance:** ✅ `/rihal-feature-drift` invocable; classifier returns `"type":"drift"` for audit/drift phrases; `--fix` enforces trivial-only severity allowlist in code (not agent discretion); SUMMARY.md committed.

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

## Phase 8 — Auto-Heal Cadence + Hooks ✅

**Goal:** Layer scheduled + edit-time triggers on top of the manual-invoke auto-heal tools shipped in Phase 6. Add the third drift dimension (phase-status drift) to round out the auto-heal portfolio.

**Status:** Complete (2026-04-29)

**Plans:**
- `/loop` + `/schedule` cadence docs for auto-heal tools — recommended cadences for `/rihal-docs-update`, `/rihal-health`, `/rihal-feature-drift`, `/rihal-memory-audit --fix`
- PostToolUse hook on `docs/`, `prd/`, `epics/` edits — settings.json hook fires `feature-drift --quick`; opt-in via `/rihal-enable-hooks`
- **Phase-status drift detector** (closes #461) — `/rihal-phase-status-drift` (or `feature-drift --mode=phase-status`); compares ROADMAP claim against shipping signals (SUMMARY.md, SPRINT.md, git log on plan files); severity-tags drift; `--fix` flips trivial-only items (✅ marker, missing date)

**Acceptance:** All three drift dimensions covered (project-doc, feature-content, phase-status); cadence docs published; PostToolUse hook installable.

---


## Phase 9 — Dogfood Audit Pass ✅

**Goal:** _TBD — fill in via /rihal-discuss-phase 9 or edit directly._

**Status:** Complete (2026-04-29)

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 10 — Close Auto-Heal Tooling Gaps ✅

**Goal:** _TBD — fill in via /rihal-discuss-phase 10 or edit directly._

**Status:** Complete (2026-04-29)

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 11 — CLI Subcommand Sweep — high-impact #465 items ✅

**Goal:** _TBD — fill in via /rihal-discuss-phase 11 or edit directly._

**Status:** Complete (2026-04-29)

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 12 — Init Shape Completion — full agent context contract ✅

**Goal:** _TBD — fill in via /rihal-discuss-phase 12 or edit directly._

**Status:** Complete (2026-04-29)

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 13 — Parser + Walker Consolidation

**Goal:** _TBD — fill in via /rihal-discuss-phase 13 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 14 — Memory Bank design-system + high-N phase parser + numbering docs (#476) ✅

**Goal:** Close 3 gaps surfaced 2026-04-30: Memory Bank had no design-system category (UI agents re-derived tokens each session), 9 parsers in rihal-tools.cjs capped phase numbers at 999 (silently dropped 1000+ phases), and no phase-numbering convention doc existed.

**Status:** Complete (2026-04-30)

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 15 — fix 8 phantom CLI subcommands per #481 ✅

**Goal:** Eliminate phantom CLI subcommands enumerated in #481 by implementing each handler in `rihal/bin/rihal-tools.cjs` with a contract derived from how the workflow callsite consumes the output.

**Status:** Complete (2026-04-30)

**Plans:**
- 15-1-SPRINT.md → SUMMARY shipped (4a217c2)

**Acceptance:**
- [x] 9 subcommands implemented (8 from #481 + 1 bonus `frontmatter get` found during smoke)
- [x] `comm -23` of called-vs-implemented top-level subcommands returns only 3 prose false positives
- [x] `test/cli-subcommand-parity.test.cjs` locks the win against future regression
- [x] Issue #481 closed by `4a217c2`

---

## Phase 17 — Workflow Dead-End & Broken-Ref Fix ✅

**Goal:** Close all dead-end, broken-ref, and orphan gaps across rihal/workflows/ — every workflow should offer a next step, broken command references should resolve, and orphaned workflows should be discoverable.

**Status:** Complete (2026-05-01)

**Delivered:**
- 9 dead-end workflows fixed with `On Completion` sections
- scan.md and verify-work.md missing chains added
- 6 thin workflow stubs created (create-prd, edit-prd, validate-prd, create-architecture, scaffold-project, retrospective)
- help.md updated with 11 orphaned workflow entries
- Also: init.md RIHLA.md recovery + execute.md add-tests offer (pre-phase fixes)

**Plans:**
- 17-1-SPRINT.md → da5bf5a

**Acceptance:**
- [x] All 9 dead-end workflows have `On Completion` sections
- [x] scan.md and verify-work.md have updated routing
- [x] 6 thin stubs created and verified
- [x] help.md has 11 new entries for previously orphaned workflows
- [x] No existing workflow logic altered — additions only

---

## Phase 18 — SPRINT schema enrichment — files, verify, interfaces, summary fields

**Goal:** _TBD — fill in via /rihal-discuss-phase 18 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 19 — deep-gap-fixes-review-code-context-done-field-validation-verify-schema-canonical-refs

**Goal:** Close 6 deep structural gaps where artifact producer/consumer contracts were misaligned — code review findings not feeding verification, code_context not read by planner, `<done>` field missing from spec, VALIDATION.md gate unblocked, `<automated>` verify schema enforced, and canonical_refs present in autonomous minimal context.

**Status:** ✅ Complete

**Delivered:**
- `verify-phase.md` reads REVIEW.md critical/high counts and fails verdict on critical findings (closes #492)
- `plan.md` planner prompt reads `<code_context>` from CONTEXT.md (closes #493)
- `plan.md` adds `<done>` as mandatory task field in planner spec + quality gate (closes #494)
- `rihal/templates/VALIDATION.md` created — unblocks Dimension 8e gate (closes #495)
- `plan.md` `<verify>` spec requires `<automated>` child element; quality gate updated (closes #496)
- `autonomous.md` minimal CONTEXT.md template now includes `<canonical_refs>` section (closes #497)

**Acceptance:** All 6 contract mismatches resolved; commit `3f632ee`

---

## Phase 20 — dashboard-ux-quick-wins

**Goal:** _TBD — fill in via /rihal-discuss-phase 20 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 21 — dashboard-data-pipeline

**Goal:** _TBD — fill in via /rihal-discuss-phase 21 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---


## Phase 22 — Agent Slim: Top-3 via References

**Goal:** _TBD — fill in via /rihal-discuss-phase 22 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 23 — Agent Slim: Remaining 24 via Reference Clusters

**Goal:** _TBD — fill in via /rihal-discuss-phase 23 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 24 — Resolve Agent vs Skill Persona Duplication

**Goal:** _TBD — fill in via /rihal-discuss-phase 24 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 25 — rcode agent CLI Command

**Goal:** _TBD — fill in via /rihal-discuss-phase 25 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 26 — Reference Index and Contributing Rule

**Goal:** _TBD — fill in via /rihal-discuss-phase 26 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 27 — Realtime Kanban Orchestration Dashboard

**Goal:** _TBD — fill in via /rihal-discuss-phase 27 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 28 — Audit gap closure — ECC-parity hooks, eval harness, schema validation, iterative retrieval

**Goal:** Close the infrastructure gaps found auditing rihal-code against `everything-claude-code`: a full lifecycle hooks system, measured token/cost tracking, agent-behavior regression coverage, schema validation of rihal's own artifacts, and a bounded follow-up loop for research subagents. Covers GitHub issues #742–#750.

**Status:** Planned

**Plans:**
- 28-1 — Hooks expansion: Bash safety dispatcher (#742, done), PreCompact state capture (#743), Stop format/typecheck (#744), compact-nudge (#749), cost tracking via Stop hook (#745)
- 28-2 — Agent-behavior regression harness: snapshot + diff on skill changes (#746)
- 28-3 — Artifact JSON-schema validation: SKILL.md / agent / state.json (#747); AGENTS.md scope-list fix (#750)
- 28-4 — Iterative-retrieval loop for research subagents (#748)

**Acceptance:**
- All five `rihal-hooks.cjs` lifecycle handlers registered and tested
- `session-report.md` reports measured (not heuristic) token usage when a log exists
- Editing a tracked SKILL.md produces a visible behavior diff in the dogfood check
- `cli/doctor.js` reports malformed SKILL.md / agent / state.json artifacts
- Research workflows re-query insufficient subagent summaries, capped at 3 cycles
- `node --test` passes with no new failures (including `scope-history-parity`)

---

## Phase 29 — Security hardening — orchestrator RCE, bash-guard bypasses, file-read scoping

**Goal:** Close the vulnerabilities found in the rihal-code self security audit: an unauthenticated network-reachable RCE in the orchestrator, bypassable bash-guard controls, and unscoped file reads. Covers GitHub issues #752–#754.

**Status:** Planned

**Plans:**
- 29-1 — Orchestrator lockdown (#752): bind `127.0.0.1`, remove CORS `*`, add per-session auth token, sanitize `storyId` against path traversal, authenticate `/api/clean-sessions`
- 29-2 — bash-guard hardening (#753): anchor `RIHAL_PUSH_OK=1` as env prefix, detect `+`-refspec force-push, document as best-effort + add bypass regression tests
- 29-3 — File-read scoping (#754): constrain `post-commit` `-F` paths to repo root; switch `rihal-tools.cjs` git calls to argument-array exec

**Acceptance:**
- Orchestrator listens on `127.0.0.1` only; unauthenticated/cross-origin `/api/run` + `/api/clean-sessions` are rejected; traversal `storyId` rejected
- `echo RIHAL_PUSH_OK; git push` and `git push origin +main` are both BLOCKED; bypass regression tests pass
- `post-commit` ignores out-of-repo `-F` paths; `rihal-tools.cjs` git calls use no shell string interpolation
- `node --test` passes with no new failures

---

## Phase 30 — Marketability — license, README diet, visual proof, metadata consistency, onboarding, polish

**Goal:** Turn rihal-code into an adoptable product: resolve the license contradiction, give the README visual proof and a focused value prop, fix self-contradicting metadata, and clarify onboarding. Covers GitHub issues #755–#759.

**Status:** Planned

**Plans:**
- 30-1 — License resolution (#755): add a `LICENSE` file; make `package.json`, README, and LICENSE agree (decision: OSS vs commercial)
- 30-2 — README diet + visual proof (#756): cut README to ~200 lines, add demo GIF + dashboard screenshot, relocate CI/test/command detail to DOCS.md
- 30-3 — Metadata consistency (#757): fix agent/command counts across README/DOCS/package.json; align package.json description + keywords with positioning
- 30-4 — Onboarding + polish (#758, #759): clarify install model and canonical first command; add differentiation table + maturity note; flesh out examples/; consolidate docs; reconcile BRAND.md naming

**Acceptance:**
- `LICENSE` file exists and agrees with `package.json` + README
- README < ~250 lines with at least one demo GIF/screenshot above the fold
- No conflicting counts across README / DOCS.md / package.json
- One canonical first-run command used everywhere; differentiation table + maturity line present in README

---

## Backlog

- Replace duplicate agents (Fatima, Hussain in v1+v2)
- Consolidate create-prd / edit-prd / validate-prd into one skill with modes
- Archive v1 once v2 is fully stable
- Add Windsurf / Antigravity install paths tested
- Template Improvements (GH #101) — pnpm, Node 20+, .gitignore, README, .rihal/config.json scaffold, TypeScript strict
