# Keyword Intelligence

**Purpose:** the real, data-sourced keyword pipeline `KEYWORD-RESEARCH.md` used to defer. Turns a raw
keyword export into action-bucketed, business-scored candidates ready for `TOPIC-CLUSTERING.md` and
`PAGE-TYPE-CLASSIFIER.md` — those two modules still own clustering and page-type decisions; this
module owns everything upstream of them (cleaning, classification, bucketing) and the topical
map/publish-order steps that follow them.

## Input

Consumes `seo-csv-normalize.cjs`'s `ahrefs-organic-keywords` output (`DATA-WORKSPACE.md`'s canonical
schema) — this module does not parse CSV itself. Typical fields available per row: `keyword, volume,
difficulty, cpc, position, url, serpFeatures, parentTopic, country`.

## Pipeline

```
clean
  → remove irrelevant terms
  → normalize (casing, plurals, stopwords — same normalization TOPIC-CLUSTERING.md applies)
  → deduplicate (exact, then semantic — see Same-intent detection below)
  → intent classification
  → funnel classification
  → topic clustering            (TOPIC-CLUSTERING.md — not repeated here)
  → page-type classification    (PAGE-TYPE-CLASSIFIER.md — not repeated here)
  → opportunity / business-value scoring
```

`seo-keyword-preprocess.cjs` (`scripts/`) is the deterministic, script-owned half of the first two
pipeline steps — the cheap, string-level work that would otherwise waste model context on a
multi-thousand-row export:

```
seo-csv-normalize.cjs (ahrefs-organic-keywords)
  → seo-keyword-preprocess.cjs
      → exact + variant duplicate removal (case/whitespace/hyphen formatting folds only)
      → candidate grouping (shared ranking URL, token-set overlap) — HYPOTHESES only
      → aggregate numeric data without inventing (sum/max as documented in the script;
        missing stays missing, never zero-filled)
      → compact top-N candidateGroups/singletons/flaggedPairs output
  → AI semantic review (confirms/rejects each candidate group, resolves intent-divergence
    flags, assigns real semantic clusters)
  → topic clustering            (TOPIC-CLUSTERING.md)
  → page-type classification    (PAGE-TYPE-CLASSIFIER.md)
  → opportunity / business-value scoring
```

The script never declares two keywords intent-equivalent and never merges rows because their
strings merely look similar — every `candidateGroups[]` entry is a hypothesis for the AI reviewer,
and pairs with high token overlap but a differing intent-signalling modifier (e.g. "near me",
"free", "vs", "how to", "price"/"cost", "jobs" — see the script's `DIVERGENCE_CUES`) are recorded in
`flaggedPairs` rather than silently merged. Real semantic clustering (deciding two candidate-group
members truly share intent, or building the topical clusters below) remains this module's and
`TOPIC-CLUSTERING.md`'s job, not the script's.

Volume alone never controls priority. A high-volume, wrong-intent, zero-click-dominated keyword
scores below a modest-volume keyword with strong business fit — see `OPPORTUNITY-SCORING.md` for how
the two combine into one number once SERP evidence exists.

## Intent taxonomy

Reuses `SERP-INTENT.md`'s taxonomy — this module does not define a second one:

```
INFORMATIONAL   NAVIGATIONAL   COMMERCIAL   TRANSACTIONAL   LOCAL   UTILITY   MIXED
```

## Funnel classification

```
TOP      MIDDLE      BOTTOM
```

## Action buckets

Every classified keyword lands in exactly one bucket:

```
QUICK_WIN            realistic competition + suitable intent + strong business relevance +
                      appropriate project authority + an existing or easily creatable page

AUTHORITY_BUILDER     informational/supporting topic that deepens topical coverage, supports a
                      commercial page, may attract links, or answers an important user question

STRIKING_DISTANCE     the site already has meaningful visibility (see `GSC-GROWTH-ENGINE.md`, Lane
                      F, for the post-launch, GSC-evidenced version of this signal) but hasn't
                      maximized clicks/rankings

LATER                 attractive but exceeds current site authority/resources

REJECTED              irrelevant, wrong intent, economically impossible, dangerous YMYL,
                      trademark-risky, zero-click-dominated, cannibalizing an existing URL, or too
                      thin to justify a separate page
```

`REJECTED` keywords preserve their reason in `.rcode/seo/DECISIONS.md` — this stops a future agent
from rediscovering and re-rejecting the same idea from scratch, the same discipline
`LIFECYCLE-AND-STAGE-GATES.md` applies to research in general (its "do-not-repeat" rule).

## Search-intent ambiguity

AI intent classification is not final truth. For any keyword where confidence is not high, record:

```
predicted_intent
confidence
what_to_check
```

Example:

```
Keyword:    best payroll software
Predicted:  COMMERCIAL
Confidence: high
Verify:     SERP mix of comparison articles vs vendor landing pages
```

Live SERP evidence (`SERP-INTELLIGENCE.md`) overrides naive linguistic classification whenever the
two disagree.

## Same-intent detection

Strengthens the cannibalization check `TOPIC-CLUSTERING.md` already runs. Keywords that read as
different strings can still be satisfied by the same page. Use:

```
semantic similarity   same dominant intent   same ranking URLs
same user task        same expected content
```

Do not split into separate pages merely because the strings differ — `running shoes for flat feet`
and `best running shoes for flat feet` may belong on one URL if intent and ranking-URL evidence
agree. This feeds `TOPIC-CLUSTERING.md`'s cannibalization check with real ranking-URL evidence
instead of string similarity alone.

## Topical map

Built from validated clusters, after `TOPIC-CLUSTERING.md` and `PAGE-TYPE-CLASSIFIER.md` have run:

```
PILLAR
├── CLUSTER
│   ├── SUPPORTING PAGE
│   ├── TOOL
│   └── FAQ / GUIDE
```

For every proposed page record: `working title, primary keyword/topic, secondary keywords, intent,
funnel stage, page type, pillar, parent, related pages, business role, status`. This feeds
`SITE-ARCHITECTURE.md` and the existing `.rcode/seo/KEYWORD-MAP.md`/`.rcode/seo/TOPIC-CLUSTERS.md`
project files as an additional field set, not a competing file. Pillar count follows the topic,
never an arbitrary target.

## Publishing order

A topical map alone is not a build order. Prioritize combinations of:

```
rank feasibility    business value        internal-link usefulness
topical dependency  utility value         existing impressions
```

Build foundational parent/topic pages before scattering long-tail pages when doing so improves
navigation and internal linking — sequence by these combined factors, not by a single keyword's
score in isolation.

## Output

- `.rcode/seo/KEYWORD-MAP.md` — keyword → cluster → page-type → action bucket (extends the existing
  template with the bucket field).
- `.rcode/seo/TOPIC-CLUSTERS.md` — unchanged ownership (`TOPIC-CLUSTERING.md`), now populated from
  real export data when one exists.
- `.rcode/seo/DECISIONS.md` — `REJECTED` reasons.

## See also

- `KEYWORD-RESEARCH.md` — the gathering mechanics this pipeline sits downstream of.
- `SERP-INTENT.md` — intent taxonomy and the live-SERP override rule.
- `TOPIC-CLUSTERING.md`, `PAGE-TYPE-CLASSIFIER.md` — the clustering/classification steps this module
  calls out to rather than duplicating.
- `SERP-INTELLIGENCE.md` — the live-SERP record that resolves intent ambiguity.
- `SITE-ARCHITECTURE.md` — where the topical map becomes a concrete URL tree.
- `DATA-WORKSPACE.md` — canonical CSV schema this module's input conforms to.
- `OPPORTUNITY-SCORING.md` — Part 2 (Lane F) for post-launch page scoring under the same evidence
  discipline.
