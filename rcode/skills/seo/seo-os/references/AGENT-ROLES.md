# Model-Agnostic Agent Roles

Deep-dive for `rcode-seo-os`, spec §37. rcode is the source of truth, not any one model. This module defines **roles**, not vendors — the mapping to current rcode personas/skills below is a *snapshot of what exists in this repo today*, not a hard-coded rule. When a new persona, skill, or agent (Claude, Codex, Gemini, or a future model) is better suited to a role, update the mapping table; do not hard-wire a vendor name into the workflow logic itself.

No new persona files are created by this module (that would trigger the `team.yaml`/dashboard-roster/README-table update obligation in `AGENTS.md:45` — out of scope; these are workflow roles being assigned to *existing* personas/skills, not new personas).

## The 8 roles (spec §37)

| Role | Responsibility | Current rcode mapping | Why |
|---|---|---|---|
| `RESEARCHER` | Domain/keyword/competitor/SERP research before any build decision | `rcode-domain-research` skill (industry deep-dives) for `DOMAIN-RESEARCH.md` work; `rcode-mariam` agent for market/ICP framing; `seo-growth-orchestrator`'s GSC-mining prompts for keyword mining | These already do evidence-gathering work with citation discipline — reuse rather than re-implement a parallel research agent |
| `PLANNER` | Turn research + opportunity score into an architecture/build plan | `rcode-planner` agent (existing: "Creates executable phase plans with task breakdown, dependency analysis, and goal-backward verification") | Already the rcode-wide planning agent; SEO planning is a specialization of the same job, not a different one |
| `BUILDER` | Implement the plan — pages, components, content collections, tools | `rcode-hanzla` (full-stack) for general implementation; `rcode-haitham` for Astro/frontend-heavy component work (`seo-astro-implementation`) | Matches existing persona boundaries: Haitham owns component/UI work, Hanzla owns general story execution |
| `CONTENT_WRITER` | Page copy by content system/page type (`OUTPUT-TEMPLATES.md`) | `seo-content-writer` skill (existing, SEO-specific) as primary; `rcode-noor` agent for non-SEO prose (README/docs/changelog) if the task crosses into documentation | `seo-content-writer` already encodes SEO copy conventions; don't re-derive them in a persona prompt |
| `DESIGN_REVIEWER` | Enforce Design Fingerprint distinctiveness (`DESIGN-UNIQUENESS.md`) across portfolio builds | `rcode-layla` (UX flows/design systems) for interaction/usability review; `rcode-zahra` (branding, typography, color systems) for visual-identity distinctiveness | Splits cleanly along existing persona boundaries — Layla for UX, Zahra for brand/visual |
| `SEO_REVIEWER` | Verify strategy/technical-SEO correctness of the output (metadata, schema, architecture decisions, evidence discipline) | **This skill itself** (`rcode-seo-os`, plus `rcode-seo-astro-implementation` for framework-level SEO review) | Spec explicitly frames SEO review as a distinct pass from the builder self-certifying; the SEO OS is the domain authority here, not a generic reviewer persona |
| `FUNCTIONAL_VERIFIER` | Confirm tools/calculators/forms/navigation actually work | `rcode-fatima` agent ("QA Lead... quality gates, edge case enumeration... release go/no-go") | Exact existing job description — functional verification is Fatima's mandate rcode-wide, not SEO-specific |
| `TECHNICAL_VERIFIER` | Crawlability, metadata, schema validity, sitemap, canonicals, redirects, performance (spec §40 release checklist) | `technical-seo-checker` skill (existing) | Already implements the technical-SEO checklist this role needs; a persona wrapper would just re-describe it |

## Builder → Verifier → Reviewer → Fix loop

Per spec §37, do not let the generating agent self-certify. The minimum loop for any non-trivial SEO build task:

```text
BUILDER implements
   ↓
FUNCTIONAL_VERIFIER checks it works (rcode-fatima)
   ↓
SEO_REVIEWER checks it's technically/strategically correct (rcode-seo-os / rcode-seo-astro-implementation)
   ↓
if issues found → BUILDER fixes (same persona, or rcode-hanzla/rcode-haitham as appropriate)
   ↓
Re-verify (repeat FUNCTIONAL_VERIFIER + SEO_REVIEWER, not just a re-read of the diff)
```

For portfolio-scale or high-risk changes (irreversible actions per `RISK-GUARDRAILS.md`), insert `DESIGN_REVIEWER` before launch and `TECHNICAL_VERIFIER` before the SEO-verify gate closes (`LIFECYCLE-AND-STAGE-GATES.md` Gate 5/6).

This loop is a **workflow shape**, not a mandate to spawn all five roles as separate agent processes for every task — for a small, low-risk change (e.g. a copy tweak), one agent may reasonably perform BUILDER and self-check FUNCTIONAL_VERIFIER's checklist inline. Escalate to actually separate agents/passes as risk and blast radius increase (a launch-gate decision, a bulk migration, a new tool's accuracy gate) — see `RISK-GUARDRAILS.md` for what counts as high-risk.

## Updating this mapping

When a persona is renamed, retired, or a new one is added in `rcode/agents/` or the agent roster, update only the right-hand column of the table above. The role names (left column) and the loop shape are the durable contract; the mapping is expected to drift as the rcode team/personas evolve.
