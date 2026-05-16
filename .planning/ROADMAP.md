# Rihal Code — Roadmap

## Milestones

- ✓ **M1 — Ship v2 + Tier Docs** — Phases 01–19 (shipped 2026-05-16)
- 🚧 **M2 — Hardening & Polish** (v4) — Phases 20–31 (in progress)

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

**Goal:** _TBD — fill in via /rihal-discuss-phase 20 or edit directly._

**Status:** Complete (2026-05-02)

**Plans:**
- 20-01-SUMMARY.md shipped

---

## Phase 21 — Dashboard Data Pipeline

**Goal:** _TBD — fill in via /rihal-discuss-phase 21 or edit directly._

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
- Persisted orchestrator token (`~/.rihal/orch-token`) + `/api/orch-token` self-heal
- Terminal min/fullscreen + running-session badges
- Inline Lucide-style SVG icon set (`server/lib/html/icons.js`)

**Acceptance:** ✅ Dashboard runs orchestration end-to-end; ~11 commits shipped this session.

---

## Phase 28 — Audit gap closure — ECC-parity hooks, eval harness, schema validation, iterative retrieval

**Goal:** Close the infrastructure gaps found auditing rihal-code against `everything-claude-code`:
a full lifecycle hooks system, measured token/cost tracking, agent-behavior regression
coverage, schema validation of rihal's own artifacts, and a bounded follow-up loop for
research subagents. Covers GitHub issues #742–#750.

**Status:** Complete (2026-05-15)

**Plans:**
- 28-1 — Hooks expansion (#742–#745, #749)
- 28-2 — Agent-behavior regression harness (#746)
- 28-3 — Artifact JSON-schema validation (#747, #750)
- 28-4 — Iterative-retrieval loop for research subagents (#748)

---

## Phase 29 — Security hardening — orchestrator RCE, bash-guard bypasses, file-read scoping

**Goal:** Close the vulnerabilities found in the rihal-code self security audit: an
unauthenticated network-reachable RCE in the orchestrator, bypassable bash-guard
controls, and unscoped file reads. Covers GitHub issues #752–#754.

**Status:** Complete (2026-05-15)

**Plans:**
- 29-1 — Orchestrator lockdown (#752)
- 29-2 — bash-guard hardening (#753)
- 29-3 — File-read scoping (#754)

---

## Phase 30 — Marketability — license, README diet, visual proof, metadata consistency, onboarding, polish

**Goal:** Turn rihal-code into an adoptable product: resolve the license contradiction,
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

## Phase 33 — Dashboard command runner — run init and rihal commands through the UI

**Goal:** Let the user launch `init` and other rihal commands end-to-end from the
dashboard UI — pick a command, run it through the orchestrator service, watch live
output in the WebSocket terminal, and see completion. The orchestrator service (:7718)
owns command execution; `dashboard.js` stays pure-stdlib view-only. Reuse the phase-29
bash-guard / auth hardening — no raw exec surface.

**Status:** In progress (sprint 33.1 complete — awaiting human-verify checkpoint 33.1.3)

**Plans:**
- [x] Sprint 33.1 — Server-side COMMAND_ALLOWLIST (security boundary before UI ships)
- [ ] Sprint 33.2 — Command runner UI (picker + terminal panel)
- [ ] Sprint 33.3 — Wire command runner into OrchestrationView; end-to-end

**Acceptance:**
- UI exposes a command picker covering `init` and other safe rihal commands
- Commands run via the orchestrator (:7718) with auth + bash-guard enforced; `dashboard.js` unchanged as view-only
- Live output streams to the WebSocket terminal; completion state is visible
- No new write endpoints on `dashboard.js`; `node server/dashboard.js` starts clean

---

## Backlog

- Replace duplicate agents (Fatima, Hussain in v1+v2)
- Consolidate create-prd / edit-prd / validate-prd into one skill with modes
- Add Windsurf / Antigravity install paths tested
- Template Improvements (GH #101)
