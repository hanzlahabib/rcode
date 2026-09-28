# Topic Clustering

**Purpose:** the mandatory step between "we have keywords" and "we know what pages to build."
Raw keyword lists must never map one-keyword-per-page — see Evaluation B in `../evals/evals.json`
for the failure mode this blocks (mass-generating pages straight from a keyword export).

## Required pipeline

```
raw keywords
  → normalize (casing, plurals, stopwords)
  → remove exact duplicates
  → identify semantic duplicates (same intent, different wording)
  → group by intent (see SERP-INTENT.md's intent taxonomy)
  → detect cannibalization (two clusters competing for the same SERP)
  → identify parent topic per cluster
  → identify distinct sub-intents within the parent
  → classify page type per cluster (see PAGE-TYPE-CLASSIFIER.md)
  → build the URL map
```

AI assistance is fine for the mechanical steps (normalize, dedupe, initial grouping), but the
cluster boundaries must be reviewed logically before they become pages. A model that slightly
reorders words ("cost of ev charger installation" vs "ev charger installation cost") must not
produce two separate clusters — that is exactly the semantic-duplicate trap this pipeline exists to
catch.

## Cannibalization check

Before finalizing clusters, verify no two clusters would compete for the same dominant SERP intent
(re-check against `SERP-INTENT.md` observations for the query). If two candidate pages would target
the same intent, merge them — see `PAGE-TYPE-CLASSIFIER.md`'s `MERGE_WITH_PARENT` outcome.

## Output

- `.rcode/seo/KEYWORD-MAP.md` — keyword → cluster → page-type assignment.
- `.rcode/seo/TOPIC-CLUSTERS.md` — parent topics with their sub-intents and the pages they justify.
- Feeds `SITE-ARCHITECTURE.md` (URL map, internal-link relationships) and
  `OPPORTUNITY-SCORING.md`'s "Topical expansion" dimension (does this cluster open a defensible
  topic, or is it an island?).

## See also

- `KEYWORD-RESEARCH.md` — where the raw list this pipeline consumes comes from.
- `PAGE-TYPE-CLASSIFIER.md` — the classification step inside this pipeline, detailed on its own
  because it's a large enough decision surface to warrant its own module.
- `SITE-ARCHITECTURE.md` — what clusters become once they're approved.
