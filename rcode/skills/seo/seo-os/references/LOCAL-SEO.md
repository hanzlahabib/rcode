# Local SEO (thin)

**Status:** thin by design — the full local-authority playbook already lives in
`rcode-rank-and-rent-local-seo` and `rcode-seo-growth-orchestrator`'s
`../../seo-growth-orchestrator/rules/local-seo-stack.md`
(the 6-prompt GBP/citations/city-pages/review-mining stack). This module is the OS-level judgment
layer on top, not a rewrite.

## The model this router enforces

Do not reduce local strategy to `service + city`. Model it as:

```
SERVICE × LOCATION × LOCAL KNOWLEDGE × TRUST × CONVERSION
```

Research local regulations, permits, local pricing differences, weather/environment where relevant,
common local problems, local terminology, local competitors, citations, maps, and reviews before
generating any location page. A page that only substitutes a city name into a template fails the
page-existence test (`PAGE-TYPE-CLASSIFIER.md`).

## Hard guardrail — never manufacture

```
fake offices   fake addresses   fake staff   fake reviews   fake local experience
```

This is a `RISK-GUARDRAILS.md`-level rule, not a style preference — flag and refuse any request that
implies fabricating local legitimacy. See Evaluation F (`../evals/evals.json`) for the exact scenario
this blocks.

## Location-page scale discipline

A local site may follow this shape:

```
/services/{primary,secondary,emergency}/   /cost/   /calculator/   /permits/   /faq/
/service-areas/{city-a,city-b,...}/        /resources/
```

Do not mass-spam thousands of near-identical city pages — see Evaluation B (`../evals/evals.json`).
Each location page needs genuine local value (see the model above) or it is `NO_SEPARATE_PAGE` per
`PAGE-TYPE-CLASSIFIER.md`. For city-scale expansion, run `PROGRAMMATIC-SEO.md`'s sampling discipline
before generating the full set.

## See also

- `rcode-rank-and-rent-local-seo` — niche selection, subniche discovery, city-matrix build mechanics.
- `../../seo-growth-orchestrator/rules/local-seo-stack.md` (`rcode-seo-growth-orchestrator`) — GBP audit, GSC goldmine, review mining,
  city-page builder, citation audit prompts.
- `PAGE-TYPE-CLASSIFIER.md` — the page-existence test applied to every location page.
- `RISK-GUARDRAILS.md` — the no-fabrication rule in its full guardrail context.
