---
name: rcode-seo-os
description: >
  Operating system for SEO projects: silently classifies the project type and
  lifecycle stage, loads only the reference modules a task actually needs,
  then routes execution to the right existing rcode SEO skill or performs a
  narrow fix directly. Activates when the user wants to "grow this site's
  traffic", "research this niche/domain for SEO", validate whether an SEO
  opportunity is "worth building", ask "what stage is this SEO project in",
  "plan the SEO architecture", "score this SEO opportunity", figure out
  "what's next for this SEO project", or generally "route this SEO task"
  across any business model (local, SaaS, tool, affiliate, programmatic,
  international, ecommerce). Do NOT use for a narrow, already-scoped
  technical fix (a broken sitemap, one meta tag, one redirect) — do that fix
  directly and skip the framework; do NOT use for writing Astro components —
  hand off to rcode-seo-astro-implementation once strategy is decided.
triggers:
  - "grow this site's SEO traffic"
  - "research this niche or domain for SEO"
  - "is this SEO opportunity worth building"
  - "what SEO project type is this"
  - "what stage is this SEO project in"
  - "plan the SEO site architecture"
  - "score this SEO opportunity"
  - "what's next for this SEO project"
  - "route this SEO task"
  - "build an SEO operating plan"
user-invocable: true
---

# SEO Operating System

## Overview

rcode is the source of truth for SEO strategy — not any one model. This skill is the **router**: it
carries the OS-level judgment (classification, lifecycle, evidence discipline, guardrails) that the
9 existing `rcode/skills/seo/*` skills don't each need to re-implement, and it delegates the actual
mechanics to them. It is framework-independent (Layer A); Astro-specific implementation is a separate
skill, `rcode-seo-astro-implementation` (Layer B), loaded only when the target project uses Astro.

## Workflow

1. **Classify silently** — infer project type from the business description / existing repo /
   `.rcode/seo/PROJECT.md` (don't ask what's inferable). See `references/PROJECT-CLASSIFICATION.md`
   for the type taxonomy and decision rules.
2. **Read lifecycle state** — check `.rcode/seo/STATE.md`. If absent, stage is `IDEA`. If this task
   is substantive (not a one-line fix) and `.rcode/seo/` doesn't exist yet, run
   `scripts/seo-project-init.cjs` (Lane B) to scaffold `PROJECT.md` + `STATE.md`. Full lifecycle
   states and stage gates: `references/LIFECYCLE-AND-STAGE-GATES.md`.
3. **Load only what the task needs** — match the request against both tables below and read only
   those modules. Never dump the whole framework into a response.
4. **Delegate execution** — if an existing skill owns the mechanics, invoke it; this skill supplies
   judgment the target skill doesn't have, not a competing implementation.
5. **Apply guardrails and evidence discipline** — `references/RISK-GUARDRAILS.md` before any
   irreversible action; `references/EVIDENCE-POLICY.md` labels on any unverified claim — regardless
   of which task type is running.
6. **Update project memory** — after execution, update `.rcode/seo/STATE.md` (stage, completed, in
   progress, blocked, next actions, do-not-repeat). Do this even for small fixes.

### Routing table — by project type (`PROJECT-CLASSIFICATION.md`)

| Project type | Load | Delegate to |
|---|---|---|
| `LOCAL_LEAD_GEN`, `RANK_AND_RENT`, `SERVICE_BUSINESS` | `LOCAL-SEO.md` | `rcode-rank-and-rent-local-seo`, `rcode-seo-growth-orchestrator` |
| `TOOL`, `CALCULATOR`, `CONVERTER`, `GENERATOR` | `UTILITY-ADVANTAGE.md`, `PAGE-TYPE-CLASSIFIER.md` | `rcode-seo-site-builder` (build); `rcode-seo-astro-implementation` + `TOOL-ACCURACY.md` (Lane C) for the tool itself |
| `SAAS` | `SAAS-SEO.md` | `rcode-seo-content-factory` (production pattern) |
| `DIRECTORY`, `MARKETPLACE`, `INFORMATIONAL` | `SITE-ARCHITECTURE.md` | `rcode-seo-content-writer`, `rcode-seo-site-builder` |
| `AFFILIATE` | `SITE-ARCHITECTURE.md`, `COMPETITOR-RESEARCH.md` | `rcode-seo-site-builder` |
| `PROGRAMMATIC` | `PROGRAMMATIC-SEO.md` | `rcode-seo-content-factory` |
| `INTERNATIONAL` | `INTERNATIONAL-SEO.md` | (locale expansion of whichever skill owns the base project) |
| `ECOMMERCE` | `SITE-ARCHITECTURE.md` | `rcode-technical-seo-checker` (see `../technical-seo-checker/references/ecommerce-platform-patterns.md`) |
| `EXISTING_SITE_GROWTH` | `references/LIFECYCLE-AND-STAGE-GATES.md` (GSC decision logic) | `rcode-seo-growth-orchestrator` |
| `SEO_RECOVERY` | — | `rcode-seo-audit` |
| `DOMAIN_RESEARCH_ONLY` | `DOMAIN-RESEARCH.md`, `SERP-INTENT.md` | `rcode-domain-research` |

### Routing table — by task type

| Task | Delegate to |
|---|---|
| Audit / diagnose an SEO problem | `rcode-seo-audit`, `rcode-technical-seo-checker`, `rcode-on-page-seo-auditor` |
| Grow traffic, backlinks, local plays | `rcode-seo-growth-orchestrator` |
| Content production at scale | `rcode-seo-content-factory` |
| New-site / niche build | `rcode-seo-site-builder`, `rcode-rank-and-rent-local-seo` |
| AI-search / citation visibility | `rcode-seo-aeo-geo` |
| Astro components / page templates | `rcode-seo-astro-implementation` |
| Write one article or page | `rcode-seo-content-writer` |
| Score a validated opportunity | `references/OPPORTUNITY-SCORING.md` + `scripts/seo-opportunity-score.cjs` (Lane B) |
| View state across many SEO projects | `scripts/seo-portfolio-summary.cjs` (Lane B), see `references/PORTFOLIO-MANAGEMENT.md` |
| Ingest a GSC/Ahrefs export | `references/DATA-WORKSPACE.md` + `scripts/seo-csv-normalize.cjs` |
| Mine GSC data / "why did our traffic drop" (script-driven, from an export) | `references/GSC-GROWTH-ENGINE.md` — the export-driven complement to `rcode-seo-growth-orchestrator`'s browser-driven GSC play above; neither replaces the other |
| "What should I fix next" / score an existing page | `references/ACTION-QUEUE.md` + `scripts/seo-page-opportunity-score.cjs` |
| Run the monthly/periodic SEO review | `references/REVIEW-WORKFLOWS.md` |
| AI-citation / AI-answer visibility tracking | `references/AI-VISIBILITY.md` (thin project-memory wrapper) → `rcode-seo-aeo-geo` for the mechanics |
| Which persona/agent should own a step (research, build, review) | `references/AGENT-ROLES.md` |
| A narrow, already-scoped technical fix | Do the fix directly — no module load, no research detour (see Examples: Negative) |

## Output Format

A router response reports, not lectures:

```
Routed to: <skill(s) invoked>
Modules consulted: <reference files actually loaded, or "none — narrow fix">
Result: <what was done / found>
State update: <what changed in .rcode/seo/STATE.md, or "n/a">
```

Not a 40-item checklist, not a strategy essay, when the ask was narrow (spec's execution-over-advice
principle).

## Examples

### Happy Path
**Input:** "Build 5,000 service + city pages for this niche."
**Expected behavior:** Classify `LOCAL_LEAD_GEN` + `PROGRAMMATIC`. Load `PROGRAMMATIC-SEO.md` and
`PAGE-TYPE-CLASSIFIER.md` before generating anything — inspect data source uniqueness, sample and
manually review a subset for the page-existence test, then delegate the approved subset to
`rcode-seo-content-factory` or `rcode-rank-and-rent-local-seo`'s city-matrix mechanics. Do not
mass-generate first and review after (Evaluation B).

### Edge Case
**Input:** "Found abc-calculator.com. Volume 4,500, KD 2. Build it."
**Expected behavior:** Refuse to treat volume/KD as validation. Load `SERP-INTENT.md` and
`UTILITY-ADVANTAGE.md`, run SERP-first validation (intent, dedicated competitors, click potential),
identify a real utility gap, and only then route to build — or report why it doesn't clear
`OPPORTUNITY-SCORING.md`'s bar (Evaluation A). The full 8-scenario eval suite (including Evaluation H
— "copy the #1 competitor exactly," which must produce original UX, not a clone) lives in
`evals/evals.json` (Lane C).

### Negative
**Input:** "Fix this site's sitemap."
**Expected behavior:** Do NOT start domain research or classify the project from scratch. Load no
strategy modules — this is a narrow technical fix. Delegate directly to `rcode-technical-seo-checker`,
verify the sitemap, and update `.rcode/seo/STATE.md` with only the fix performed (per spec's agent
output behavior rule — silently determine project/stage/task, then act on only what's relevant).
