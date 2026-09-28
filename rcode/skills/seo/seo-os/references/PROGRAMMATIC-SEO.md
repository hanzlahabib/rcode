# Programmatic SEO

**Purpose:** the gate before generating pages at scale from a dataset. The concrete Next.js
implementation pattern (dimension registries + one dynamic route + `generateStaticParams`) already
exists in `../../seo-content-factory/rules/programmatic-pages.md` (`rcode-seo-content-factory`) —
this module is the judgment
layer that decides *whether* and *what* to generate, not the code pattern itself.

## Suitable data sources

```
location data       product data        public datasets     calculations
provider data        pricing data        feature matrices    verified structured information
```

## Unsuitable — do not scale on these alone

```
keyword substitution   city substitution        AI paraphrase
mass translated boilerplate                     empty category combinations
```

If the only thing differentiating page N from page N+1 is a swapped noun with no structurally
distinct data behind it, it fails `PAGE-TYPE-CLASSIFIER.md`'s page-existence test — `IGNORE` or
`MERGE_WITH_PARENT`, not `NO_SEPARATE_PAGE`'s slightly-softer cousin.

## Mandatory sampling before mass generation

Before generating the full set, **sample and manually review outputs** — a handful of pages from
different points in the dataset (not just the first N), checked against the page-existence test and
for near-duplicate content across the sample. This is the exact check Evaluation B
(`../evals/evals.json`, "create 5,000 service + city pages") requires before treating a bulk-generate
request as approved. Generating first and reviewing after is not sampling.

## Scale as an irreversible-action trigger

Generating thousands of indexed pages is listed explicitly in `RISK-GUARDRAILS.md` as an
irreversible-action class requiring evidence, a plan, and impact analysis before execution — treat a
"generate N pages" request the same way regardless of how mechanically easy the generation itself is.

## Output

- `.rcode/seo/SITE-MAP.md` — the dimension registries and resulting URL pattern.
- Sample review notes recorded before the full-scale generation runs.

## See also

- `../../seo-content-factory/rules/programmatic-pages.md` (`rcode-seo-content-factory`) — the concrete Next.js implementation
  pattern (dimension registries, dynamic routes) for the canonical worked example.
- `PAGE-TYPE-CLASSIFIER.md` — the page-existence test this module enforces at scale.
- `RISK-GUARDRAILS.md` — the irreversible-action gate for mass page generation.
