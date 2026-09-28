# Content System and Output Templates

**Purpose:** map each page type (`PAGE-TYPE-CLASSIFIER.md`) to a content skeleton, and set the AI
content quality bar. This module does not re-teach SEO writing craft — `rcode-seo-content-writer`
already owns title formulas, structure templates, and the writing checklist; this module is the
per-page-type routing layer plus the policy on AI-generated content.

## Content skeleton by page type

```
Tool/Calculator:  tool → result → interpretation → methodology → formula → examples
                  → visuals → FAQs → related tools

Service:          service promise → problem → process → pricing/cost factors
                  → why choose provider → local relevance → FAQ → conversion

Location:         service in location → local context → service coverage
                  → local considerations → proof/trust → FAQ → conversion

Comparison:        comparison criteria → matrix → differences → use cases
                  → limitations → conclusion based on needs

Integration:       integration purpose → supported workflow → setup → use cases
                  → limitations → CTA
```

Do not use one generic SEO template for every URL — the skeleton above is chosen by the page's
classified type, not applied uniformly.

## AI content policy

AI may be used for production efficiency; AI-generated content is not automatically
publication-ready. Before publishing, check:

```
intent          accuracy         relevance          redundancy         factual claims
citations where needed           tone               grammar            formatting
uniqueness of value               keyword stuffing   hallucination
```

Reject or fix:

```
AI filler                  generic intros            fake first-hand experience
fake statistics             fabricated experts        fabricated testimonials
fabricated data
```

Any factual claim that isn't independently verified carries an evidence label per
`EVIDENCE-POLICY.md` — "fabricated data" and "unlabeled inference presented as fact" are the same
failure mode from two different modules' perspectives.

## Where the actual writing happens

- Single articles/pages: delegate to `rcode-seo-content-writer` — it owns title formulas, structure
  templates, and the SEO writing checklist. Do not re-derive those here.
- Production at scale: delegate to `rcode-seo-content-factory`'s brief → write → QA pipeline
  (`../../seo-content-factory/rules/agents.md`, `../../seo-content-factory/rules/quality-gates.md`)
  for the hardened, multi-agent version of this
  checklist.

## Output

- Content brief per page (skeleton + target keyword cluster + internal links from
  `SITE-ARCHITECTURE.md`) before writing starts.
- `.rcode/seo/CONTENT-PLAN.md` — backlog of pages by type and status.

## See also

- `PAGE-TYPE-CLASSIFIER.md` — where the page type consumed here is decided.
- `rcode-seo-content-writer` — writing mechanics, title formulas, structure templates.
- `rcode-seo-content-factory` — scaled production pipeline and quality gates.
- `../../seo-astro-implementation/references/astro-seo-components.md` (Lane C) — the Astro layout
  each skeleton renders into, if the target project uses Astro.
