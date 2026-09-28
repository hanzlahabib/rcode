# Page-Type Classifier

**Purpose:** a keyword cluster does not automatically deserve a URL. This is the decision point that
prevents thin, near-duplicate, or purely-for-Google pages from being built — apply it to every
cluster produced by `TOPIC-CLUSTERING.md` before any page is scaffolded.

## Page types

```
PRIMARY_TOOL       TOOL_VARIANT       CALCULATOR         CONVERTER
GENERATOR          SERVICE_PAGE       LOCATION_PAGE      CATEGORY_PAGE
COMPARISON_PAGE    INTEGRATION_PAGE   USE_CASE_PAGE       GUIDE
ARTICLE            FAQ_SUPPORT        GLOSSARY           DIRECTORY_PAGE
NO_SEPARATE_PAGE   MERGE_WITH_PARENT  IGNORE
```

`NO_SEPARATE_PAGE`, `MERGE_WITH_PARENT`, and `IGNORE` are first-class outcomes, not failures of the
process — most keyword lists contain clusters that should *not* become a page, and saying so is the
point of running this classifier.

## The page-existence test (mandatory, before creating any indexable page)

> Would this page still deserve to exist and provide meaningful value if Google did not exist?

If the honest answer is no, the outcome is `NO_SEPARATE_PAGE`, `MERGE_WITH_PARENT`, or `IGNORE` — not
a thin page that exists purely to rank. Apply this test with extra scrutiny to:

```
location permutations       programmatic pages          translated pages
near-duplicate tools        keyword-substitution pages  thin FAQ pages
```

This is the concrete check behind Evaluation B (5,000 city pages) and Evaluation G (30-language
translation) in `../evals/evals.json` — both fail this test at scale if run without it.

## Mapping to content and implementation

Once a cluster is classified, it maps to:

- A content skeleton in `OUTPUT-TEMPLATES.md` (what sections a `SERVICE_PAGE` vs `CALCULATOR` vs
  `COMPARISON_PAGE` needs).
- An Astro layout, if the project uses Astro — see
  `../../seo-astro-implementation/references/astro-seo-components.md` (Lane C) for the
  `CalculatorLayout`/`ServiceLayout`/`LocationLayout`/`ArticleLayout`/`ComparisonLayout` mapping.

## Output

- Page-type assignment recorded in `.rcode/seo/KEYWORD-MAP.md` alongside the cluster.
- Pages classified `PRIMARY_TOOL`/`TOOL_VARIANT`/`CALCULATOR`/`CONVERTER`/`GENERATOR` route through
  `UTILITY-ADVANTAGE.md` before build — ranking potential alone is not sufficient for tool pages.

## See also

- `TOPIC-CLUSTERING.md` — upstream step that produces the clusters this classifier consumes.
- `UTILITY-ADVANTAGE.md` — required follow-up for any tool/calculator/converter/generator page type.
- `PROGRAMMATIC-SEO.md` — additional gate for any page type produced at scale from a dataset.
