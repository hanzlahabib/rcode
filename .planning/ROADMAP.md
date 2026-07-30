# rcode — Roadmap

## Milestones

- ✓ **M1 — Ship v2 + Tier Docs** — Phases 01–19 (shipped 2026-05-16)
- 🚧 **M2 — Hardening & Polish** (v4) — Phases 20–33 (in progress)

<details>
<summary>✓ M1 — Ship v2 + Tier Docs (Phases 01–19) — SHIPPED 2026-05-16</summary>

Unified v1/v2 into one installable methodology: single installer, tier docs,
view-only Majlis dashboard, three-dimensional auto-heal system, and a long sweep
of CLI/parser/workflow hardening. Released incrementally v2.0.0 → v3.5.0.

Full archive: `.planning/milestones/M1-ship-v2/ROADMAP.md`
Record + known gaps: `.planning/MILESTONES.md`

Known gaps carried out of M1: Phase 05 (partial), 07/13/18 (not started), 19 (shipped, no summary).

</details>

---

# M2 — Hardening & Polish (v4)

**Goal:** Take the shipped v2 methodology and harden it into an adoptable product —
a realtime orchestration dashboard, slimmer agents, resolved persona duplication,
closed audit/security gaps, and marketable polish.

Started: 2026-05 · Current

---

## Phase 20 — Dashboard UX Quick Wins

**Goal:** Fix five dashboard UX bugs (sidebar auto-expand, duplicate `/api/files` fetch, sprint card empty-state, sidebar/Files view duplication, Tasks CTA) — net -61 lines shipped.

**Status:** Complete (2026-05-02)

**Plans:**
- 20-01-SUMMARY.md shipped

---

## Phase 21 — Dashboard Data Pipeline

**Goal:** Fix two root-cause bugs preventing tasks from appearing in the dashboard and decimal phase IDs from resolving correctly (issues #590 and #591).

**Status:** Planned

---

## Phase 22 — Agent Slim: Top-3 via References

**Goal:** Slim the three largest agent files by extracting shared content into `references/`.

**Status:** Complete (2026-05-10)

**Plans:**
- 22-1 through 22-4 — SUMMARYs shipped

---

## Phase 23 — Agent Slim: Remaining 24 via Reference Clusters

**Goal:** Slim the remaining 24 agents using shared reference clusters.

**Status:** Complete (2026-05-10)

**Plans:**
- 23-1 through 23-4 — SUMMARYs shipped

---

## Phase 24 — Resolve Agent vs Skill Persona Duplication

**Goal:** Eliminate duplication between agent personas and skill personas.

**Status:** Complete (2026-05-10)

**Plans:**
- 24-1 — SUMMARY shipped

---

## Phase 25 — rcode Agent CLI Command

**Goal:** Add an `rcode agent` CLI command.

**Status:** Complete (2026-05-10)

**Plans:**
- 25-1 — SUMMARY shipped

---

## Phase 26 — Reference Index and Contributing Rule

**Goal:** Add a reference index and a contributing rule for the `references/` system.

**Status:** Complete (2026-05-10)

**Plans:**
- 26-1 — SUMMARY shipped

---

## Phase 27 — Realtime Kanban Orchestration Dashboard

**Goal:** Turn the Majlis dashboard into a realtime orchestration surface — run phases,
sprints, and tasks from the UI with an interactive terminal and live session tracking.

**Status:** Complete (2026-05-16)

**Delivered:**
- Interactive node-pty + WebSocket terminal in the dashboard
- "⚡ Orchestration" view with Run buttons on phase/sprint/task cards
- Per-session files-changed count + idle/waiting detection
- Persisted orchestrator token (`~/.rcode/orch-token`) + `/api/orch-token` self-heal
- Terminal min/fullscreen + running-session badges
- Inline Lucide-style SVG icon set (`server/lib/html/icons.js`)

**Acceptance:** ✅ Dashboard runs orchestration end-to-end; ~11 commits shipped this session.

---

## Phase 28 — Audit gap closure — ECC-parity hooks, eval harness, schema validation, iterative retrieval

**Goal:** Close the infrastructure gaps found auditing rcode against `everything-claude-code`:
a full lifecycle hooks system, measured token/cost tracking, agent-behavior regression
coverage, schema validation of rcode's own artifacts, and a bounded follow-up loop for
research subagents. Covers GitHub issues #742–#750.

**Status:** Complete (2026-05-15)

**Plans:**
- 28-1 — Hooks expansion (#742–#745, #749)
- 28-2 — Agent-behavior regression harness (#746)
- 28-3 — Artifact JSON-schema validation (#747, #750)
- 28-4 — Iterative-retrieval loop for research subagents (#748)

---

## Phase 29 — Security hardening — orchestrator RCE, bash-guard bypasses, file-read scoping

**Goal:** Close the vulnerabilities found in the rcode self security audit: an
unauthenticated network-reachable RCE in the orchestrator, bypassable bash-guard
controls, and unscoped file reads. Covers GitHub issues #752–#754.

**Status:** Complete (2026-05-15)

**Plans:**
- 29-1 — Orchestrator lockdown (#752)
- 29-2 — bash-guard hardening (#753)
- 29-3 — File-read scoping (#754)

---

## Phase 30 — Marketability — license, README diet, visual proof, metadata consistency, onboarding, polish

**Goal:** Turn rcode into an adoptable product: resolve the license contradiction,
give the README visual proof and a focused value prop, fix self-contradicting metadata,
and clarify onboarding. Covers GitHub issues #755–#759.

**Status:** Complete (2026-05-15)

**Plans:**
- 30-1 — License resolution (#755)
- 30-2 — README diet + visual proof (#756)
- 30-3 — Metadata consistency (#757)
- 30-4 — Onboarding + polish (#758, #759)

**Note:** DEFERRED — real demo GIF + dashboard screenshot capture (zero-byte placeholders
committed at `docs/assets/`). Follow-up #760: 5 skills fail the new schema validation.

---

## Phase 31 — Preact migration — Majlis dashboard client

**Goal:** Rebuild the Majlis dashboard client as Preact components via `htm` + ESM CDN
(no build step), replacing the string-concatenation rendering across all dashboard
views and the xterm terminal. Wire in `server/lib/html/icons.js` for professional
icons. Every existing feature must keep working — orchestration, interactive terminal,
running-session badges, file browser, drill-down navigation, auto-refresh.

**Status:** Complete (2026-05-16)

**Constraints:**
- No build step — Preact + htm loaded via esm.sh ESM imports
- View-only dashboard server boundary preserved (pure Node stdlib)
- Incremental — preserve every shipped feature; no regressions

**Plans:**
- [x] Sprint 31.1 — Preact runtime, store, router, Sidebar, Topbar, Overview + Decisions views
- [x] Sprint 31.2 — shared primitives + Roadmap, Milestones, Phases, Sprints, Tasks views
- [x] Sprint 31.3 — Kanban, Files, Agents, Memory views; agent roster → client module
- [x] Sprint 31.4 — Orchestration view, XtermPanel, OrchPanel; 3 legacy modules deleted

**Acceptance:**
- All dashboard views render as Preact components, no string-concatenation rendering left
- Icons sourced from `server/lib/html/icons.js`
- Interactive terminal, orchestration Run buttons, session badges, file browser all functional
- `node server/dashboard.js` starts clean on :7717

---

## Phase 32 — Dashboard theming — design tokens and emoji-to-SVG icon sweep

**Goal:** Give the Preact dashboard a coherent visual system — a single design-token
layer (color, spacing, typography, radii, shadows) consumed by every component, and a
full sweep replacing every emoji-as-icon with inline SVG icons from `icons.js`. Light
and dark themes both driven by the token layer.

**Status:** Complete (2026-05-16)

**Plans:**
- [x] Sprint 32.1 — design-token audit + icon-alignment CSS classes
- [x] Sprint 32.2 — 11 new SVG icons; emoji-to-SVG sweep across 6 views + shared.js
- [x] Sprint 32.3 — Topbar/App/OrchPanel sweep; moon/sun theme icons; final audit

**Acceptance:**
- All component styling reads from a single design-token source (CSS custom properties)
- Zero emoji used as UI icons — every icon is an inline SVG from `icons.js`
- Light + dark themes both render correctly from the token layer
- No visual regressions; `node server/dashboard.js` starts clean on :7717

---

## Phase 33 — Dashboard command runner — run init and rcode commands through the UI

**Goal:** Let the user launch `init` and other rcode commands end-to-end from the
dashboard UI — pick a command, run it through the orchestrator service, watch live
output in the WebSocket terminal, and see completion. The orchestrator service (:7718)
owns command execution; `dashboard.js` stays pure-stdlib view-only. Reuse the phase-29
bash-guard / auth hardening — no raw exec surface.

**Status:** Complete (2026-05-16)

**Plans:**
- [x] Sprint 33.1 — Server-side COMMAND_ALLOWLIST (security boundary before UI ships)
- [x] Sprint 33.2 — Command runner UI (command picker + reused WebSocket terminal)
- [x] Sprint 33.3 — Polish and harden — error toasts, disabled state, CSS token audit

**Acceptance:**
- UI exposes a command picker covering `init` and other safe rcode commands
- Commands run via the orchestrator (:7718) with auth + bash-guard enforced; `dashboard.js` unchanged as view-only
- Live output streams to the WebSocket terminal; completion state is visible
- No new write endpoints on `dashboard.js`; `node server/dashboard.js` starts clean

---

## Phase 41 — SEO Module: bundle top-notch SEO skills as a native rcode module

**Goal:** _TBD — fill in via /rcode-discuss-phase 41 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 13 — thirteenth phase

**Goal:** _TBD — fill in via /rcode-discuss-phase 13 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 42 — Ambient adoption hooks — make rcode self-surfacing (SessionStart greeter, AGENTS.md routing rule, activate prompt-router nudge)

**Goal:** _TBD — fill in via /rcode-discuss-phase 42 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 43 — Ship rcode/data to consumers — fix installer + sync hook so hooks stop ENOENT-crashing (#952)

**Goal:** _TBD — fill in via /rcode-discuss-phase 43 or edit directly._

**Status:** Planned

**Plans:**
- _TBD_

**Acceptance:** _TBD_

---

## Phase 44 — GitHub sync path drift: dead .rcode/phases/ layout in CLI + stale docs + SPRINT.md filename convention (issue #980)

**Goal:** Fix `cli/github-sync.js` to read the current sprint-track (`.planning/phases/*/*-SPRINT.md` with `<task>` XML) and epic-track (`.planning/epics/stories/*.md`) formats instead of the dead `.rcode/phases/{N}/tasks|stories/` layout; correct `docs/METHODOLOGY.md` and `docs/USP.md` to stop documenting that dead path as current; fix `rcode/workflows/sprint-planning.md`'s bare `SPRINT.md` output filename to follow the sequence-numbered `{phase}-{plan}-SPRINT.md` convention used everywhere else.

**Status:** Complete (2026-07-30)

**Plans:**
- 44-1 — github-sync discovery module rewire, docs fixes, filename convention (#980)

**Acceptance:** 28/28 github-sync tests + 593/593 full suite pass; `rcode-verifier`: `passed`; code review resolved (1 high + 2 medium fixed, 1 medium deferred to tracked issue #1002).

**Acceptance:**
- `rcode github-sync --phase <N> --dry-run` produces correct epic/story previews against a real current-schema project (sprint-track and epic-track)
- `docs/METHODOLOGY.md` and `docs/USP.md` no longer reference `.rcode/phases/` as a current path
- `rcode/workflows/sprint-planning.md` writes `{phase}-{plan}-SPRINT.md`, not bare `SPRINT.md`
- `test/github-sync.test.cjs` covers the current-schema paths (not just the old fixtures, if any)

---

## Phase 45 — Audit remediation: fix findings from 6-lens critical audit (issues #981-#1001)

**Goal:** Fix 21 findings from a 6-lens critical audit (token-cost, redundant-work, schema-drift, scope-consistency, agent-sprawl, workflow-complexity) — unify the planner's output schema, clean up dead `.rcode/phases/` references, fix scope/skills/agent-cleanup drift, document the epics/stories pipeline's status, and bring `plan.md`/`execute.md` back under the 1000-line cap.

**Status:** Complete (2026-07-30)

**Plans:**
- 45-1 — Planner schema unification (#981-#984, #993)
- 45-2 — Dead `.rcode/phases/` path cleanup (#985, #986, #988)
- 45-3 — Scope/skills/agent hygiene (#987, #989, #990, #991)
- 45-4 — Epics/stories + workflow/skill pair notices (#994, #995, #996)
- 45-5 — `plan.md`/`execute.md` refactor (#989, #997-#1001)

**Acceptance:** All 19 tasks' `<verify>` gates pass (87/87 checks); code review gate resolved (1 high + 3 medium fixed); `rcode-verifier` goal-backward check: `passed`; 593/593 tests pass; all 21 GitHub issues closed.

---

## Backlog

- Replace duplicate agents (Fatima, Hussain in v1+v2)
- Consolidate create-prd / edit-prd / validate-prd into one skill with modes
- Add Windsurf / Antigravity install paths tested
- Template Improvements (GH #101)

---

# M3 — Archon Dashboard Port (v5)

**Goal:** Port high-value Archon UI patterns into the Diwan/Majlis Preact dashboard,
reimplemented in Preact — aggregate status chips with filtering, persisted session
history, a searchable command palette, sidebar health badges, a hand-rolled SVG phase
DAG, and structured rejection dialogs at checkpoint gates.

**Constraint (all phases):** `server/dashboard.js` stays Node-stdlib only with zero
write endpoints; the client stays Preact via `htm` + ESM CDN with no build step. Session
persistence and any new endpoints live on the orchestrator service (:7718), never on
`dashboard.js`.

Started: 2026-05-16 · Continues phase numbering from M2 (Phase 34+)

---

## Phase 34 — Status Summary Bar with Multi-Attribute Filtering

**Goal:** Give the dashboard an Archon-style status summary bar — aggregate count
chips for phases, sprints, and sessions grouped by status — plus filter chips that
narrow a view by status, milestone, and date. Active filters serialise into the URL
hash so a filtered view can be bookmarked and shared.

**Covers:** DSH-1, DSH-2, DSH-3

**Status:** Planned

**Success criteria:**
- User sees a summary bar with count chips for phases / sprints / sessions grouped by status
- User can click status, milestone, and date filter chips to narrow the visible list
- A filtered view's active filters appear in `location.hash`; reloading or sharing that URL restores the same filter set
- Clearing all filters returns the view to its unfiltered state with no stale chips

**Grounding:** new component under `server/lib/html/client/components/`, consumes
`store.js` state and the existing `App.js` hash router (`parseHash`); no server change.

---

## Phase 35 — Session History Panel with Live/Persisted Dedup-Merge

**Goal:** Persist past orchestration runs on the orchestrator service and surface them
in a history panel grouped by status and date, each row showing duration and final
status. Merge the persisted history with the live `/api/sessions` poll so a run that
is both live and persisted renders exactly once.

**Covers:** HIST-1, HIST-2, HIST-3

**Status:** Planned

**Success criteria:**
- User opens a history panel listing past orchestration runs grouped by status and date
- Each past run row shows its duration and final status
- A run that is both in the live session poll and the persisted history renders as a single row, never duplicated
- Persisted history survives an orchestrator restart and is readable without any write endpoint on `dashboard.js`

**Grounding:** orchestrator service (`server/orchestrator.js`) gains run persistence
plus a history read endpoint; the in-memory `sessions` Map already tracks
`status`/timing. Client merges via the `activeSessions` store field set by
`orchestrator.js` `startSessionsPoll`.

---

## Phase 36 — Command Palette and Sidebar Health Badges

**Goal:** Add a searchable, categorized Cmd+K-style command palette that can find and
run any allowlisted rcode command, and live health badges in the sidebar showing
active session count and blocker count.

**Covers:** DSH-4, DSH-5

**Status:** Planned

**Success criteria:**
- User opens a command palette (keyboard shortcut), types to search, and sees commands grouped by category
- User can run a found command from the palette and it launches through the orchestrator
- The sidebar shows a live badge with the active session count and a badge with the blocker count
- Badge counts update as sessions start/stop and blockers change, with no manual refresh

**Grounding:** palette reuses `ALLOWED_COMMANDS` + `runCommandFromUI` from
`orchestrator.js`; badges read `activeSessions` and `blockers` from `store.js` and
render in `components/Sidebar.js`.

---

## Phase 37 — Phase Dependency Graph and Structured Rejection Dialogs

**Goal:** Render the milestone's phases as a lightweight hand-rolled SVG dependency
graph showing `depends_on` waves, and add structured rejection dialogs at checkpoint
gates that capture a reason and record it against the run/phase for later review.

**Covers:** DSH-6, GATE-1, GATE-2

**Status:** Planned

**Success criteria:**
- User views the milestone's phases as an SVG graph laid out by `depends_on` waves
- User can reject a checkpoint through a dialog that requires a reason before submitting
- A submitted rejection reason is recorded against the run/phase and visible later
- The graph and dialogs add no new build step and no graph library — pure inline SVG and Preact

**Grounding:** `server/lib/scanner.js` extended to expose phase `depends_on` for the
graph; rejection capture posts to the orchestrator service (:7718), reusing the
phase-29 auth/bash-guard boundary — `dashboard.js` stays view-only.

---

## Phase 38 — Proactive intent router — UserPromptSubmit nudge toward rcode commands for memory consistency (#892)

**Goal:** Make rcode proactive. Add an opt-in `UserPromptSubmit` hook — a deterministic,
no-LLM mirror of the routing table in `rcode/workflows/do.md` — that keyword-matches the
user's prompt to the right rcode command and emits a one-line advisory (via the
`additionalContext` path already proven by `cli/rcode-slash-router.cjs`) framed around
long-term memory consistency. Today rcode is purely pull-based: nothing fires unless the
user types `/rcode-*`, so planning/exploration/audit work never lands in `.rcode/state.json`
or `.planning/`. This closes that gap. Covers GitHub issue #892.

**Status:** Planned

**Constraints:**
- Runs on every prompt → must be near-zero cost, dependency-free Node stdlib, never block (exit 0 on any error — same safety contract as the existing slash router)
- Keyword table derives from `do.md` (single source of truth — no silent fork)
- Installed only via opt-in `/rcode-enable-hooks`; wired into the Claude install path in `cli/install.js` (currently hook-free)

**Plans:**
- _TBD — generate via /rcode-plan 38_

**Acceptance:**
- A new `prompt-router` subcommand in `rcode/bin/rcode-hooks.cjs` emits a correct, memory-framed nudge for planning/explore/audit-shaped prompts (e.g. "explore this feature" → `/rcode-explore`/`/rcode-brainstorm`; "audit X" → `/rcode-audit`/`/rcode-lens-audit`; "let's plan X" → `/rcode-plan` + note on `state.json`)
- Emits nothing (exit 0) on non-matching prompts and on any internal error
- A `.rcode/config.yaml` toggle controls aggressiveness (`every | once-per-intent | when-stale | off`); default `every`, `off` fully silences
- `UserPromptSubmit` matcher added to `rcode/templates/settings-hooks.json` and wired for Claude Code via `/rcode-enable-hooks`
- Tests cover: match, no-match, error-swallow, per-session dedupe, and the config toggle

---

## Phase 39 — SEO Module: bundle top-notch SEO skills as a native rcode module

**Goal:** Close the rcode gap that causes content/SEO sites to be planned generically (as `web-app`) with no keyword clustering, E-E-A-T gates, or internal-link architecture. Implement four changes: (1) add `content-site` project type to `project-types.yaml` with full-spectrum SEO signals (local, affiliate, programmatic, technical, editorial, e-commerce, AI search, link-building — not just rank-and-rent), (2) route `content-site` projects in `rcode-project-researcher` to dedicated SEO skill agents, (3) add comprehensive SEO intent routing to `do.md` covering all SEO disciplines, (4) bundle 8 production-grade SEO skills from `~/.agents/skills/` into `rcode/skills/seo/` as an installable `--modules seo` module and wire the full `claude-seo:*` plugin fleet (17 agents). Closes #911, #912, #913, #914.

**Covers:** #911, #912, #913, #914

**Status:** Planned

**Success criteria:**
- `/rcode-new-project rank-and-rent mobile repair lead-gen site for Abu Dhabi (programmatic SEO)` classifies as `content-site`, not `web-app`, and asks SEO-specific discovery questions
- `rcode-project-researcher` for a `content-site` project produces `KEYWORDS.md` and `CLUSTERS.md` instead of generic `STACK.md`
- "run the content factory" / "cluster my keywords" / "audit my SEO" via `do.md` routes to the correct SEO skill
- `npx @hanzlaa/rcode install --modules seo` installs 8 bundled SEO skills into `.rcode/skills/`
- `seo-content-factory` runs end-to-end for a content-site project
- No existing project types, routing rules, or skills are broken

**Grounding:** `rcode/references/project-types.yaml` (add `content-site` entry after line 270), `rcode/agents/rcode-project-researcher.md` (conditional branch), `rcode/workflows/do.md` (routing table), new `rcode/skills/seo/` directory with 8 skills symlinked/copied from `~/.agents/skills/`

**Plans:**
- _TBD — generate via /rcode-plan 39_
