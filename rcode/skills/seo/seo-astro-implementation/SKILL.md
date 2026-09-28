---
name: rcode-seo-astro-implementation
internal: true
description: >
  Implement SEO technical requirements inside an Astro project — SEOHead,
  canonical/OG/Twitter tags, SchemaRenderer, breadcrumbs, page layouts
  (Calculator/Service/Location/Article/Comparison), sitemap, hreflang, and
  redirects — using current Astro Content Layer idioms. Activates when the
  user says "add SEO to this Astro page", "implement SEOHead", "add schema
  markup in Astro", "build the Astro layout for this page type", "wire up
  the sitemap/hreflang in Astro", or "Astro SEO components". Do NOT use for
  SEO strategy, keyword research, or opportunity scoring (use rcode-seo-os)
  or for Next.js/WordPress/other-framework implementation.
triggers:
  - "add SEO to this Astro page"
  - "implement SEOHead"
  - "add schema markup in Astro"
  - "build the Astro layout for this page type"
  - "wire up the sitemap in Astro"
  - "wire up hreflang in Astro"
  - "Astro SEO components"
  - "Astro canonical tags"
  - "Astro breadcrumbs component"
user-invocable: true
metadata:
  version: 1.0.0
  layer: "B — framework implementation"
---

## Overview

This skill is **Layer B** of rcode's SEO operating system: framework-specific implementation only. All SEO *strategy* — project classification, keyword/topic decisions, page-type selection, opportunity scoring, architecture — is owned by `rcode-seo-os` (Layer A) and stays framework-independent; it must never be duplicated here. This skill exists purely to turn a Layer-A decision ("this cluster is a CALCULATOR page targeting `installation-cost`") into working Astro code: components, layouts, content collections, sitemap/hreflang wiring, and redirects, built on current Astro idioms (Content Layer API, `astro:i18n`, `@astrojs/sitemap`).

It activates only when the target project uses, or is being scaffolded to use, Astro. For any other framework, or for pure strategy questions, it is out of scope — see Examples.

## Workflow

1. **Inspect before generating.** Before writing anything, check the target project for:
   - `astro.config.mjs`/`.ts` — confirm Astro is actually present; read existing `integrations`, `i18n`, and `site` config rather than assuming defaults.
   - `src/content.config.ts` (or legacy `src/content/config.ts`) — existing collections and their Zod schemas.
   - `src/components/` and `src/layouts/` — existing SEO-adjacent components (head tags, schema, breadcrumbs). **Use the project's actual components if they exist** — extend them in place rather than introducing a parallel set with different names.
   - Whether the project already follows an `astro-site-factory.md`-style shared-infra layout (see `references/astro-site-factory.md`).
2. **If Astro is not present or not planned:** decline to implement, and point back to `rcode-seo-os` for framework-agnostic strategy (see Examples — edge case).
3. **Load only the reference module needed for the task:**
   - Component contracts (props, usage) → `references/astro-seo-components.md`.
   - Shared multi-site infra / per-site config → `references/astro-site-factory.md`.
   - Calculator/tool correctness gate → `rcode-seo-os`'s `references/TOOL-ACCURACY.md` (cross-skill; do not re-derive the gate here).
4. **Map the page type to a layout** using the table in `astro-seo-components.md` (e.g. `CALCULATOR` → `CalculatorLayout.astro`, `SERVICE_PAGE` → `ServiceLayout.astro`). The page-type decision itself belongs to Layer A's `PAGE-TYPE-CLASSIFIER.md`; this skill only consumes it.
5. **Implement using current Astro syntax** (verified against docs.astro.build, not memorized): the Content Layer API (`defineCollection` + `glob()`/`file()` loaders from `astro/loaders`, `getCollection`/`getEntry`, rendering via `render(entry)` from `astro:content`), `astro:i18n` helpers (`getRelativeLocaleUrl`/`getAbsoluteLocaleUrl`) for hreflang, and `@astrojs/sitemap`'s `i18n` option for the sitemap. Flag anything version-sensitive (e.g. Content Layer API is Astro 5+; a pre-5 project needs the legacy `src/content/config.ts` collections API instead — check `package.json`'s `astro` version before assuming).
6. **Wire structured data through `SchemaRenderer`**, never hand-rolled duplicate `<script type="application/ld+json">` blocks per page — pass a typed schema object in, following `EVIDENCE-POLICY.md`'s rule against fabricating ratings/reviews/prices (Layer A).
7. **For tools/calculators**, do not mark the page done until `TOOL-ACCURACY.md`'s fixture-based gate has actually been run against the calculation logic — a working UI is not sufficient (spec: definition of done).
8. **Redirects/canonical/sitemap changes on an already-indexed site** follow Layer A's `RISK-GUARDRAILS.md` irreversible-action gate (evidence → plan → rollback → verification) before merging.
9. **After implementing**, report which components/layouts were added or extended, and let the caller (typically `rcode-seo-os`) update `.rcode/seo/STATE.md` — this skill does not own project SEO memory.

## Output Format

- Files changed/created, each tagged with its role (component, layout, config, content schema).
- For any calculator/tool touched: explicit confirmation that `TOOL-ACCURACY.md` fixtures were run, with pass/fail, or a note that fixtures still need to be written.
- Any Astro-version-sensitive choice called out explicitly (e.g. "uses Content Layer API — requires Astro ≥5").
- Do NOT include a rewritten SEO strategy — link to the relevant Layer A module instead if strategy context is needed.

## Examples

### Happy Path
**Input:** "Add SEOHead and schema markup to the existing `/services/[slug].astro` service page."
**Expected behavior:** Inspect the page and `src/components/` for an existing head/schema component first; if none exists, add `SEOHead.astro` (canonical, OG, Twitter) and `SchemaRenderer.astro` (Service schema, no fabricated ratings) from `templates/`, wired to the page's existing content-collection frontmatter — not a new parallel data source.

### Edge Case: No Astro in the project
**Input:** "Add SEO metadata to this Next.js project's product pages."
**Expected behavior:** Decline — this skill only implements for Astro. Point to `rcode-seo-os` for the framework-independent strategy (metadata requirements, schema types, canonical rules), and note that the Next.js equivalent implementation is out of this skill's scope.

### Negative Case
**Input:** "Should we build a dedicated cost calculator for this niche?"
**Expected behavior:** Do NOT answer with Astro component code. This is a Layer A opportunity/utility-advantage question (`rcode-seo-os`'s `UTILITY-ADVANTAGE.md`/`OPPORTUNITY-SCORING.md`), not a framework-implementation task — route there instead.
