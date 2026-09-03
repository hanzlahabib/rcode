---
status: passed
phase: 37
generated: 2026-09-03T00:00:00Z
human_uat_pending: true
---

# Phase 37 Verification — Phase Dependency Graph and Structured Rejection Dialogs

**Verifier:** rcode-verifier (goal-backward audit, manual — code + state.json were out of sync)
**Scope:** server/lib/scanner.js, server/lib/html/client/views/RoadmapView.js, server/lib/html/client/components/PhaseGraph.js, server/lib/html/css.js, server/orchestrator.js, server/lib/html/client/orchestrator.js, server/lib/html/client/components/RejectDialog.js, server/lib/html/client/views/OrchestrationView.js
**Baseline (first phase-37 commit):** d4f12cf
**HEAD at verification:** 5fba90db (worktree fast-forwarded from a stale fork to match `main`)

---

## Goal Statement (restated for backward tracing)

Sprint 37.1: Render the milestone's phases as a hand-rolled inline-SVG dependency
graph in the Roadmap view, laid out by `depends_on` wave (DSH-6).

Sprint 37.2: Add structured rejection dialogs at checkpoint gates — a Preact
dialog that captures a required reason, orchestrator-side persistence that
records the reason, and a surface to review a recorded reason later (GATE-1,
GATE-2).

## Situation found

`.rcode/state.json` had phase 37 stuck at `status: "in_progress"` with both
sprints `"planned"`, and no `37-REVIEW.md` existed — but `37-1-SUMMARY.md` and
`37-2-SUMMARY.md` were both present, and all 9 commits referenced in those
summaries (`d4f12cf`, `35f9340`, `46a4e09`, `85f4542`, `5eb0e34`, `1d25180`,
`828d85d`, `d8b44b3`, `9e043b2`) are reachable from `main`. Same drift pattern
seen in phases 34/35/36. No review findings to reconcile against — confirmed
genuine by reading the current code directly, not assumed.

**Post-sprint evolution found (not a regression by itself):** two undocumented
commits landed after the phase-37.1 SUMMARY's commit list — `abe4b07a` ("proper
phase dependency graph", same day) moved the inline `PhaseGraph`/`computeWaves`
out of `RoadmapView.js` into a standalone `server/lib/html/client/components/PhaseGraph.js`
with a materially better implementation (hover ancestry highlighting, tooltips,
column-wrapping for wide milestones, an honest "no dependencies" flow-row state
instead of a fake DAG), and `da0024a1` (`#973`, later) polished that empty
state further. Neither commit is part of phase 37's documented commit list, but
both are genuine improvements over the sprint-37.1 baseline and are already on
`main`. `37-1-SUMMARY.md`'s description (inline `PhaseGraph` in `RoadmapView.js`)
is stale relative to current code but the delivered feature is a strict
improvement, not a bug — noted here so the discrepancy isn't mistaken for a gap.

**Real gap found and fixed (this verification pass):** sprint 37.2's own
must-have #4 — "A previously submitted rejection reason for a session is
readable later and shown on the session card" — was genuinely broken on
current `main`. The original `d8b44b3` commit correctly added an
`orch-card-rejection` div to `OrchCard` that read `s.rejection.reason`. A
later, unrelated restructure (`bd7a3743`, "restructure orchestration view to
Diwan 2-column layout") deleted `OrchCard` entirely in favor of a new, more
compact `PipelineCard`/`PipelineRow` left-rail design — and never carried the
rejection-reason display over. The result: `~/.rcode/rejections.json`
persistence, `GET /api/rejections`, and the client-side poll-merge
(`s.rejection`) were all still fully intact and correct, but **nothing in the
UI ever read `s.rejection`** (`grep -rn "\.rejection\b" server/lib/html/client/`
returned zero hits before this pass) — a real, silent loss of GATE-2's
"shown on the session card" promise, and the CSS class that used to render it
(`.orch-card-rejection`) was left orphaned/dead in `css.js`.

**Fix applied (this verification pass):**
1. `server/lib/html/client/views/OrchestrationView.js` — `PipelineRow` now
   accepts an optional `subtitle` prop and renders it as a second line below
   the row. The live-session `PipelineRow` call now passes
   `subtitle=${s.rejection ? 'Rejected: ' + s.rejection.reason : null}`, so a
   session with a recorded rejection shows its reason inline in the pipeline
   rail again — the GATE-2 surface, restored for the current UI shape.
2. `server/lib/html/css.js` — the dead `.orch-card-rejection` rule (which
   referenced a component that no longer exists) was renamed/adapted to
   `.orch-pipeline-rejection` (compact, single-line, ellipsis-truncated with a
   native `title` tooltip for the full text) to match the new row's layout.

Verified live: booted the orchestrator standalone (`ORCH_PORT=7799
ORCH_TOKEN=... PROJECT_ROOT=...`), `POST /api/reject` with an empty reason
returned `400 {"error":"reason required"}`; with a real reason returned `200`
with the persisted entry; `GET /api/rejections` returned it back; and
`~/.rcode/rejections.json` contained it on disk — matching 37-2-SPRINT.md's
own `<verification>` block exactly. Test artifacts were removed after the
check (`rm ~/.rcode/rejections.json`) — no rejection data existed at that path
before this pass, confirmed before writing.

---

## Must-Haves (from 37-1-SPRINT.md / 37-2-SPRINT.md frontmatter)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Roadmap view shows phases as an SVG node graph laid out left-to-right by dependency wave | VERIFIED | `PhaseGraph.js:283-308` — `<details class="pg-panel" open>` wraps a `<${Dag}>` (layered SVG) when any dependency resolves, else an honest `<${FlowRow}>` sequence |
| 2 | A phase that depends on another sits in a later column, connected by an edge | VERIFIED | `computeLayers` (PhaseGraph.js:49-66) — monotonic `1 + max(dep layers)`; `layout()` turns layers into `x` columns; `Dag` draws a cubic-bezier `<path>` per resolved dependency with an arrowhead marker |
| 3 | No graph library, no build step — pure inline SVG in a Preact component | VERIFIED | `grep -rEn "xyflow\|dagre\|d3" server/lib/html/client/` → zero hits; `PhaseGraph.js` is hand-rolled `<svg>`/`<path>`/`<rect>` |
| 4 | `scanner.js` exposes a per-phase `depends_on` array on every `phaseTree` entry | VERIFIED | `scanner.js:60-82` (`parseYamlList`), `:156` (`dependsOn` per sprint), `:221-229` (aggregated phase-level `dependsOn`), `:235` (`return { ...p, sprints, dependsOn: phaseDependsOn, ... }`) — confirmed live: `pt.every(p=>Array.isArray(p.dependsOn))` → `true` |
| 5 | `RoadmapView.js` renders the graph | VERIFIED | `RoadmapView.js:21,207` — imports and renders `<${PhaseGraph} phases=${phases}/>` between the view title and filter bar |
| 6 | Waiting session card shows a Reject button that opens a required-reason dialog | VERIFIED | `OrchestrationView.js:205-211` — Reject button rendered only when `waiting` is true, opens `RejectDialog` via `setRejectFor(s)` |
| 7 | Reject dialog requires a non-empty reason — submit disabled until typed | VERIFIED | `RejectDialog.js:23-24` — `const disabled = !trimmed \|\| busy;` on the submit button's `disabled=` prop |
| 8 | Submitted reason is sent to the orchestrator and persisted against the session's storyId | VERIFIED | `RejectDialog.js:38` → `submitRejection` (client `orchestrator.js:205-214`) → `POST /api/reject` (server `orchestrator.js:744-759`) → `appendRejection` writes `~/.rcode/rejections.json`; live round-trip confirmed above |
| 9 | A previously submitted rejection reason is readable later and shown on the session card | VERIFIED (fixed this pass) | Was broken (see "Real gap found" above) — now `OrchestrationView.js`'s `PipelineRow` renders `subtitle=${'Rejected: ' + s.rejection.reason}` when `s.rejection` is present, sourced from `GET /api/rejections` merged in `_poll()` |

---

## Artifact Verification (4-Level)

| Artifact | Exists | Substantive | Wired | Data Flows | Status |
|----------|--------|-------------|-------|------------|--------|
| `scanner.js` `parseYamlList` + phase `dependsOn` | Y | Y (handles inline `[a,b]` and block-list forms, both `NN.S` and `NN-S` sprint-id shapes) | Y (`buildPhaseTree` return value) | Y (`scanState().phaseTree[i].dependsOn` confirmed an array on all 18 phases) | VERIFIED |
| `PhaseGraph` SVG component | Y | Y (308 lines — layered DAG, hover ancestry highlight, SVG tooltip, honest empty/no-dep states) | Y (imported + rendered in `RoadmapView.js`) | Y (`/js/components/PhaseGraph.js` served HTTP 200) | VERIFIED |
| `.pg-*` CSS tokens | Y | Y (`css.js:5444+` — panel, svg, node, edge, hover-dim, legend) | Y (class names match `PhaseGraph.js` markup) | Y | VERIFIED |
| `POST /api/reject` / `GET /api/rejections` | Y | Y (`orchestrator.js:744-763` — validates storyId, enforces non-empty reason, caps 2000 chars) | Y (registered behind `authed(req)` at `:864-865`) | Y (live round-trip tested — see above) | VERIFIED |
| `submitRejection` / `fetchRejections` (client) | Y | Y (`orchestrator.js:205-225`) | Y (`_poll()` merges rejections onto `activeSessions` by `storyId`) | Y | VERIFIED |
| `RejectDialog.js` | Y | Y (78 lines — required-reason gate, Escape/backdrop close, `showToast` feedback, no `alert()`/`confirm()`) | Y (mounted from `OrchestrationView.js` `PipelineCard`) | Y | VERIFIED |
| Recorded-rejection display | Y (added this pass) | Y (`orch-pipeline-rejection` subtitle row, truncated + `title` tooltip) | Y (`PipelineRow` call site passes `subtitle` from `s.rejection`) | Y | VERIFIED (fixed) |
| `dashboard.js` untouched (view-only boundary) | Y | — | — | Y (`grep -n "reject" server/dashboard.js` matches only pre-existing, unrelated CORS-rejection strings) | VERIFIED |

---

## Static / Behavioral Checks

| Check | Result |
|-------|--------|
| `node --check server/lib/scanner.js` | PASS |
| `node --check server/lib/html/css.js` | PASS |
| `node --check server/orchestrator.js` | PASS |
| `node --input-type=module --check` on `RoadmapView.js`, `PhaseGraph.js`, `orchestrator.js` (client), `RejectDialog.js`, `OrchestrationView.js` | PASS (all) |
| `scanState().phaseTree.every(p => Array.isArray(p.dependsOn))` | `true` (18/18 phases) |
| `grep -rEn "xyflow\|dagre\|d3" server/lib/html/client/` | zero hits |
| `node server/dashboard.js` boots clean, listens on :7717, orchestrator on :7718 | PASS |
| `curl http://localhost:7717/` | HTTP 200 |
| `curl http://localhost:7717/js/{views/RoadmapView.js, components/PhaseGraph.js, components/RejectDialog.js, views/OrchestrationView.js, orchestrator.js}` | all HTTP 200 |
| Standalone orchestrator: `POST /api/reject` with empty reason | `400 {"error":"reason required"}` |
| Standalone orchestrator: `POST /api/reject` with a real reason | `200 {"ok":true,"entry":{...}}`, persisted to `~/.rcode/rejections.json`, readable via `GET /api/rejections` |
| `node --test` full suite | 663/664 pass — 1 pre-existing unrelated failure (`test/at-ref-parity.test.cjs`, stale `@`-reference in `.rcode/skills/rcode-init/SKILL.md`; also flagged in `34-VERIFICATION.md`/`35-VERIFICATION.md`/`36-VERIFICATION.md`, untouched by phase 37) |

---

## Anti-Pattern Scan

Scanned all phase-37 files (`scanner.js`, `RoadmapView.js`, `PhaseGraph.js`,
`css.js` diffs, `orchestrator.js` server + client, `RejectDialog.js`,
`OrchestrationView.js`) for `TODO`, `FIXME`, `placeholder`, hardcoded-empty,
stub returns: zero hits. No `alert()`/`confirm()` anywhere in `RejectDialog.js`.
No `style=` attribute introduced by this pass's fix (subtitle row and CSS rule
both class-driven). `server/dashboard.js` untouched by phase 37's own commits
or this verification's fix.

---

## Human UAT Pending

The following cannot be verified by static/structural/behavioral analysis alone:

1. The dependency graph visually renders with correct wave columns and curved edges for a milestone that actually has cross-phase `depends_on` entries (this milestone currently has none — the honest `FlowRow` sequence state was what was visually exercised).
2. Hovering a graph node visibly highlights its ancestors/descendants and dims the rest.
3. Clicking a Reject button opens the dialog; typing enables Submit; Escape and backdrop click both close it.
4. After submitting a rejection, the pipeline row visibly shows the "Rejected: …" subtitle with a working hover tooltip for long reasons.
5. No uncaught JS errors in DevTools console.

These are pending human UAT at `http://localhost:7717`.

---

## File Size Check

| File | Lines | Limit | Status |
|------|-------|-------|--------|
| server/lib/scanner.js | 937 | 1000 | OK |
| server/lib/html/client/views/RoadmapView.js | 241 | 1000 | OK |
| server/lib/html/client/components/PhaseGraph.js | 308 | 1000 | OK |
| server/orchestrator.js | 930 | 1000 | OK |
| server/lib/html/client/orchestrator.js | 521 | 1000 | OK |
| server/lib/html/client/components/RejectDialog.js | 78 | 1000 | OK |
| server/lib/html/client/views/OrchestrationView.js | 394 | 1000 | OK |
| server/lib/html/css.js | 5608 | 1000 | OVER — pre-existing, shared across all dashboard phases (same as flagged in 34/35/36-VERIFICATION.md); this pass's fix touched ~7 lines net, not a disproportionate grower |

---

## Overall Verdict

**Status: passed (human UAT pending)**

The codebase genuinely delivers DSH-6, GATE-1, and GATE-2 as promised in
37-1-SPRINT.md / 37-2-SPRINT.md. `.rcode/state.json` was out of sync with
reality (phase stuck at `in_progress`, both sprints `planned`, despite complete
work merged to `main`) — the same drift pattern as phases 34/35/36. No
`37-REVIEW.md` existed, so there were no documented review findings to
reconcile. One real, silent regression was found during this audit — a later,
unrelated UI restructure (`bd7a3743`) dropped the GATE-2 "shown on the session
card" display when it replaced `OrchCard` with `PipelineCard` — and was fixed
as a small, targeted change (a `subtitle` prop on `PipelineRow` plus one CSS
rule), not a rewrite. `REQUIREMENTS.md` traceability was also stale (DSH-6,
GATE-1, GATE-2 all showed "Pending" despite being delivered) — all three were
flipped to `complete` as part of this verification.
