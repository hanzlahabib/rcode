# ADR 0004 — SEO Operating System: router-over-skills, framework-split, progressive memory

**Status:** Accepted
**Date:** 2026-09-28
**Deciders:** Hanzla Habib
**Tracks:** GitHub issues [#1098](https://github.com/hanzlahabib/rihal-code/issues/1098), [#1099](https://github.com/hanzlahabib/rihal-code/issues/1099)

---

## Context

`rcode/skills/seo/` already had 9 practitioner skills (`seo-growth-orchestrator`, `seo-audit`,
`technical-seo-checker`, `on-page-seo-auditor`, `seo-content-writer`, `seo-aeo-geo`,
`seo-content-factory`, `seo-site-builder`, `rank-and-rent-local-seo`) with no shared strategy layer,
project-classification logic, lifecycle model, or cross-project memory. Two capability layers close
that gap: an operating-system layer (how to research, decide, architect, build, verify, and track
lifecycle) and an intelligence layer (turning real GSC/Ahrefs exports into scored insight, an action
queue, and lifecycle transitions). Five architectural questions had to be settled first.

## Decision

### 1. `seo-os` routes across the 9 existing skills; it does not replace them

`rcode-seo-os` owns classification, lifecycle state, evidence discipline, guardrails, and scoring —
judgment the 9 skills would otherwise each re-implement — and delegates mechanics via two routing
tables (by project type, by task type). "Thin" modules open with 2-4 sentences of net-new OS judgment
then a `**See also:**` link to the owning skill, never re-pasting its mechanics. Progressive
disclosure is enforced in the router's own workflow: load only the modules a task needs, never the
whole framework; a narrow already-scoped fix ("fix this sitemap") loads none and delegates directly.
**Rejected:** folding strategy into each of the 9 skills (duplicates logic 9x, guarantees drift); one
monolithic skill replacing the 9 (throws away tested mechanics, breaks the 1000-line file cap); an
always-loaded framework doc (defeats progressive disclosure by design).
**Consequences:** the 9 skills stay untouched (additive-only); routing tables are the one place to
edit project-type→skill mapping. **Reversibility:** easy — router is additive, removable without
touching the skills it delegates to.

### 2. `seo-astro-implementation` is a separate skill because strategy is framework-independent

Layer A (`seo-os`) decides strategy (page type, keyword target, architecture) with zero framework
knowledge. Layer B (`rcode-seo-astro-implementation`) turns an already-made decision into Astro code
(Content Layer API, `astro:i18n`, `@astrojs/sitemap`) and activates only for Astro projects; for any
other framework it declines and points back to Layer A — mirroring the repo's pre-existing pattern
(`seo-site-builder` targets Next.js, not Astro).
**Rejected:** one skill spanning strategy + Astro (couples a framework-agnostic decision to one
framework); Astro components as prose inside `seo-os/references/` (implementation needs runnable
templates, a different artifact type than strategy docs).
**Consequences:** a second framework later means a new sibling skill, not a `seo-os` rewrite.
**Reversibility:** easy — the two skills communicate only via one routing-table entry.

### 3. Project SEO memory (`.rcode/seo/`) is progressive, not generated all at once

`seo-project-init.cjs` eagerly creates only `PROJECT.md` + `STATE.md` (never-overwrite, idempotent).
The other 15+ templates (`KEYWORDS.md`, `COMPETITORS.md`, `ACTIONS.md`, `DATA-MANIFEST.md`,
`insights/*.md`, etc.) are copied on demand the first time that workflow stage is actually touched —
"do not create empty bureaucracy." `seo-action-queue.cjs` applies the same never-overwrite idiom to
`ACTIONS.md`.
**Rejected:** scaffolding all 15+ templates on init (most projects never reach every stage; empty
files become dead weight and false signal); no persistent per-project memory (loses lifecycle stage
and do-not-repeat notes across sessions, defeating the stage-gate model).
**Consequences:** `.rcode/seo/`'s file list is itself a signal of lifecycle progress.
**Reversibility:** easy — templates are additive; new ones don't touch existing project memory.

### 4. Both capability layers share one lifecycle, one evidence policy, one scoring doc, one memory

The OS layer defines the 16-state lifecycle enum, Gates 0-9, and a 6-label evidence vocabulary
(FACT/OBSERVATION/TOOL_ESTIMATE/INFERENCE/HYPOTHESIS/EXPERIMENT). The intelligence layer — CSV
ingestion, GSC striking-distance/decay analysis, a page-level opportunity score, an action queue —
extends these in place instead of defining parallel ones: evidence becomes an 8-label superset with
an explicit mapping table back to the original 6; the 9-dimension pre-launch score
(`OPPORTUNITY-SCORING.md`) gains a "Part 2" post-launch 7-dimension score in the *same file*, scored
by a sibling script; the lifecycle enum is extended by cross-link only ("reuse states, add none") —
Gate 8 (`OBSERVING`) and Gate 9 (invest/optimize/hold/kill) already model the transitions real GSC
data drives; both layers read/write the same `.rcode/seo/` memory (`STATE.md`'s freeform "next
actions" is the attachment point later promoted to structured `ACTIONS.md`). The two "reserved for a
future pass" placeholders the OS layer shipped with are the named extension points the intelligence
layer completes, not supersedes.
**Rejected:** separate lifecycle/evidence/scoring definitions per layer (two sources of truth for
project stage or trust level is the drift class `EVIDENCE-POLICY.md` itself warns against); a new
database/dashboard for cross-project intelligence (SEO projects are independent repos; the portfolio
table is derived by scanning sibling `STATE.md` files, never centrally authored).
**Consequences:** a project's stage/evidence/score are meaningful regardless of which layer last
touched them. **Reversibility:** hard for the lifecycle enum (cross-link-only extension was a
deliberate one-way constraint) — easy for everything scored/labeled on top of it.

### 5. Agent/model independence: roles, not vendors

`AGENT-ROLES.md` defines 8 model-agnostic roles (RESEARCHER, PLANNER, BUILDER, CONTENT_WRITER,
DESIGN_REVIEWER, SEO_REVIEWER, FUNCTIONAL_VERIFIER, TECHNICAL_VERIFIER) mapped to *existing* rcode
personas/skills as "a snapshot of what exists today, not a hard-coded rule" — only the mapping column
drifts; role names and the Builder → Verifier → Reviewer → Fix loop are the durable contract. No new
persona files were created (would trigger the team.yaml/roster/README obligation for a new persona,
not a workflow-role assignment — out of scope). Deterministic computation (CSV normalization, GSC
math, opportunity scoring, action-queue dedupe) lives in `node:test`-covered `.cjs` scripts with fixed
JSON contracts; agent reasoning is reserved for judgment the scripts explicitly don't make (assigning
a cause to a traffic decline, merge-vs-redirect on cannibalization). The evidence policy's
"never invent a FIRST_PARTY_DATA or THIRD_PARTY_ESTIMATE value" rule is the no-invented-metrics
invariant — every number traces to an actual import or live tool call, or is labeled
INFERENCE/HYPOTHESIS.
**Rejected:** hard-coding a vendor into workflow logic (rcode is already file-shipped and
agent-agnostic per ADR 0001/0002 — a vendor-locked SEO layer would be inconsistent); letting agents
estimate missing metrics instead of labeling the gap (the exact failure mode `EVIDENCE-POLICY.md`
exists to prevent).
**Consequences:** the SEO OS behaves identically regardless of which agent calls it, as long as it
can read markdown and run the `.cjs` scripts. **Reversibility:** easy — the mapping table is a
one-line-per-role edit, not a structural change.

## References

- `rcode/skills/seo/seo-os/SKILL.md`, `references/{LIFECYCLE-AND-STAGE-GATES,EVIDENCE-POLICY,OPPORTUNITY-SCORING,PORTFOLIO-MANAGEMENT,AGENT-ROLES}.md`
- `rcode/skills/seo/seo-astro-implementation/SKILL.md`
- `rcode/templates/seo/*.md`
- `.rcode/memory/project/decisions.md` — short entry linking here
