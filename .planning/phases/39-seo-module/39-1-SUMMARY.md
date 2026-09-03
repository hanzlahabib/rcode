---
sprint: 39.1
status: complete
commits:
  - 7381f7ab feat(project-types): add content-site type + researcher routing (#911 #912)
key-files:
  - rcode/references/project-types.yaml
  - rcode/agents/rcode-project-researcher.md
---

## What was built

Sprint 39.1 was found ALREADY IMPLEMENTED on `main` — shipped in commit `7381f7ab` on
2026-06-24, months before this sprint's SPRINT.md was picked up for execution. Issues
#911 and #912 were closed the same day. This SUMMARY documents the shipped state
verified against the sprint's acceptance criteria; no new implementation work was
required for 39.1 itself (a real, unrelated installer bug was found and fixed under
39.3 — see 39-3-SUMMARY.md).

### Story 39.1.1 — `content-site` entry in project-types.yaml

`rcode/references/project-types.yaml` carries a `content-site:` entry (line 301) with
full-spectrum SEO signals spanning local/rank-and-rent, programmatic/content-factory,
affiliate/publisher, e-commerce/SaaS SEO, link building, technical SEO, keyword/content
strategy, schema, AI search (GEO/AEO), international SEO, and recovery signals. It
carries 5 `required_sections` (`keyword-strategy`, `programmatic-page-matrix`,
`internal-link-plan`, `schema-plan`, `content-quality-gates`), 3 `skip_sections`
(`authentication`, `state-management`, `authorization`), and exactly 6
`discovery_questions` — verified via `python3 -c "import yaml; ..."`, matching the
sprint's exact counts. `web-app` and `api-backend` entries are untouched.

### Story 39.1.2 — content-site Mode in rcode-project-researcher

`rcode/agents/rcode-project-researcher.md` (145 lines) carries a `## content-site Mode`
section (line 32) that fires when `project_type == content-site`, produces
`KEYWORDS.md` + `CLUSTERS.md` (SUMMARY.md/PITFALLS.md remain from the generic table),
delegates to `claude-seo:seo-cluster` (optional — falls back to first-principles SERP
research if unavailable) and references `seo-content-factory` /
`seo-growth-orchestrator` for the production pipeline. `PITFALLS.md`'s mandatory
minimum lists 5 SEO-specific risks: thin-content risk, canonical drift, noindex
strategy, duplicate title/H1 trap, crawl budget waste — covering the sprint's 3
mandatory entries (thin content, canonical drift, noindex strategy) plus 2 more. The
generic 5-file table (SUMMARY.md, STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md)
and workflow steps 1-6 remain fully intact for all other project types — "Do NOT
produce STACK.md, FEATURES.md, or ARCHITECTURE.md for content-site projects" is stated
explicitly.

**Deviation from the plan's literal wording (not a functional gap):** the SPRINT.md's
suggested prose ("Internal link orphans", "Schema validation gap" as 2 of the 5 named
pitfalls) differs from what actually shipped ("Duplicate title/H1 trap", "Crawl budget
waste" instead). The 3 acceptance-criteria-mandated pitfalls (thin content, canonical
drift, noindex strategy) are present verbatim in spirit (worded as "Thin-content risk",
"Canonical drift", "Noindex strategy"). This is a different author's judgment call
during original implementation, not a defect — the acceptance criterion only requires
"at minimum 3 SEO-specific entries" including those 3 named ones, which is satisfied.

## Verification results (this session, re-run against current main tip)

- `grep -q "^content-site:" rcode/references/project-types.yaml` — pass
- `grep -q "rank-and-rent" / "ai search" / "keyword-strategy" / "authentication"` — all pass
- `python3 -c "import yaml; ..."` — discovery_questions == 6, `authentication` in
  skip_sections, `keyword-strategy` in required_sections — pass
- `grep -q "^web-app:"` / `"^api-backend:"` — both present, untouched — pass
- `grep -q "content-site Mode" / "KEYWORDS.md" / "CLUSTERS.md" / "seo-growth-orchestrator"` — all pass
- `grep -qi "Thin-content" / "Canonical drift" / "Noindex"` — all pass
- `grep -q "STACK.md" / "ARCHITECTURE.md" / "FEATURES.md"` (generic table intact) — pass
- `wc -l rcode/agents/rcode-project-researcher.md` = 145 (well under 1000-line cap)
- Full `node --test` suite: 660/661 passing (the 1 failure is a pre-existing, unrelated
  broken `@`-reference in `.rcode/skills/rcode-init/SKILL.md`, present before this
  session touched anything — same known issue documented in the phase 34-37 completion
  commits)
</content>
