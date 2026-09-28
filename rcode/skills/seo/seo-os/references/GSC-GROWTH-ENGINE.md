# Search Console Growth Engine

**Purpose:** the export-driven, deterministic complement to
`rcode-seo-growth-orchestrator`'s browser-driven GSC prompt (`templates/local-gsc-goldmine.md`, which
reads the user's logged-in Search Console tab live). This module works from a downloaded GSC export
instead: normalize it with `seo-csv-normalize.cjs`, then run the two scripts below over it. Neither
approach replaces the other — the browser-driven prompt is faster for a one-off "what's on page 2
right now" check; this workflow is the repeatable, scriptable version for a recurring review
(`REVIEW-WORKFLOWS.md`'s monthly cycle) or a dataset too large to paste into a browser session.

Minimum data supported: queries, pages, clicks, impressions, CTR, position, and period-over-period
comparisons, via the `gsc-queries` / `gsc-pages` schemas (`DATA-WORKSPACE.md` §4 contract).

## Striking-distance analysis

```
seo-gsc-striking-distance.cjs <normalized.json> [--positionMin=8] [--positionMax=20]
  [--minImpressions=10] [--ctrGapRatio=0.5] [--config=f]
  → {strikingDistance, ctrGaps, cannibalization, config}
```

Detects queries where the site already has visibility (default: position 8-20 with meaningful
impressions) in one pass, and separately flags CTR gaps (actual CTR below a configurable ratio of a
built-in CTR-by-position table). **All thresholds are configurable** — do not treat "100
impressions" or "position 8-20" as a universal floor; a low-volume niche project may need a lower
impressions threshold to surface anything at all.

`page` (the ranking URL) is populated on every candidate only when the `gsc-queries` export used the
combined query+page dimension (`DATA-WORKSPACE.md`'s schema table) — it's `null` when the export has
no page dimension, and every other output stays unaffected. When `page` is present, the same pass
also groups by query to flag `cannibalization`: a query whose rows span more than one distinct page,
sorted by total impressions. See "Ranking-page mismatch" below for what to do with either signal.

For each candidate, work through:

```
query, ranking page, position, impressions, clicks, CTR
is this the correct page?      does intent match?
is there a missing section?    is the title/H1 relevant?
are there internal-link opportunities?
```

Then recommend **the smallest useful intervention** — not a full rewrite when a title change or two
internal links would do. Use `INTERNAL-LINK-INTELLIGENCE.md` for the last check.

## Ranking-page mismatch

For every important query, ask: *is the URL Google currently ranks actually the URL we want to
rank?* If not, investigate before touching that URL at all:

```
cannibalization             wrong intent               weak target page
internal-link signals       overlapping pages          canonical problems
```

Do not optimize whichever URL happens to rank just because it's the one in front of you.
`seo-gsc-striking-distance.cjs`'s `cannibalization[]` output (when the export carries a `page`
column) is the automated version of this check's first signal — a query with rows for more than one
distinct page is worth a look before either page is touched. See "Cannibalization workflow" below for
what to do once flagged; this script only detects and reports the overlap, it never merges, redirects,
or canonicalizes anything on its own.

## CTR opportunity analysis

Use `seo-gsc-striking-distance.cjs`'s `ctrGaps` output: pages where position is strong but CTR is
unusually weak relative to position peers. Possible causes to check, not assume:

```
poor title       poor snippet        intent mismatch
SERP features    weak brand          unappealing value proposition
```

**Not every low-CTR page is a meta-description problem.** Check the SERP itself (does a competitor's
result have a review-star snippet, an FAQ rich result, a price this listing lacks?) before rewriting
copy that wasn't the actual cause.

## Content-decay analysis

```
seo-gsc-decay.cjs <current.json> <prior.json> [--declineThreshold=-0.2] [--metric=clicks|impressions]
  → {decaying, improving, config}
```

Joins two periods by page (e.g. last 90 days vs. the same period a year prior, or a recent period vs.
the preceding comparable one) and flags meaningful decline/improvement by delta %. The script
**never assigns a cause** — each decaying row carries empty hypothesis-checklist fields for the agent
to investigate, not pre-guess:

```
outdatedContent          strongerCompetitors        serpIntentChanged
cannibalization          lostBacklinks              aiAnswerReducedClicks
technicalProblem         seasonality
```

Never declare a cause before checking evidence for it. "Traffic dropped 35%" is a symptom, not a
diagnosis — walk the checklist.

## Content refresh workflow

For a page flagged as decaying, inspect:

```
queries lost           rank change          CTR change         competitors
content age            missing sections     broken data        outdated screenshots
internal links         backlinks            SERP changes
```

Then decide: `refresh`, `expand`, `rewrite`, `merge`, `redirect`, or `leave alone`. **Do not refresh
content merely to change the publication date** — that's a discredited tactic with no evidence
backing it as a ranking lever on its own; refresh because the checklist above surfaced an actual gap.

## Winner detection

Use real performance data to identify portfolio winners. Positive signals (no single one is
required — evidence-based winner states accumulate from whichever apply):

```
impressions growing            multiple keywords appearing      striking-distance queries
organic conversions            links earned naturally            tool usage
brand searches                 improving CTR
```

Feeds `PORTFOLIO-MANAGEMENT.md`'s capital-allocation table as "strong organic signal → invest more."

## Weak-project detection

Potential weak signals:

```
months indexed with no impressions      intent thesis disproven
zero-click environment                   no topical expansion
no business conversion path              unreasonable authority requirement
low utility differentiation
```

Recommend `reposition`, `hold`, `merge`, `sell`, or `kill` rather than endlessly adding content to a
project the evidence says isn't working. Feeds `PORTFOLIO-MANAGEMENT.md`'s "no evidence after
reasonable test → hold" / "thesis invalidated → kill/reposition" rows.

## Cannibalization workflow

A post-launch, multi-URL problem — the real-world version of the pre-launch check already in
`TOPIC-CLUSTERING.md` ("detect cannibalization — two clusters competing for the same SERP"). Signals:

```
multiple URLs ranking for the same query      same intent
unstable ranking URL (Google keeps swapping which page it shows)
similar page topics                            overlapping headings
```

`seo-gsc-striking-distance.cjs`'s `cannibalization[]` output automates the first signal directly from
a query+page GSC export (a query whose rows span more than one distinct page) — treat it as a
starting list of candidates for the manual inspection below, not a verdict.

**Do not automatically merge pages.** Inspect intent, conversion purpose, SERP, link profile, and
traffic for each candidate URL first, then choose: `differentiate`, `merge`, `canonicalize`,
`redirect`, or `leave separate`. Two pages can legitimately serve different intents under a
surface-similar topic.

## Content pruning guardrail

**Never prune purely because of** low word count, low traffic, or old publish date. A page may still
serve utility, navigation, conversion, support, or a long-tail purpose invisible to those three
metrics alone. Pruning requires context — inspect what the page is actually for before recommending
its removal, redirect, or merge.

## Data-informed publishing

Before adding a new page to an existing site, check whether Search Console already reveals related
query behavior. Example: an existing page may already rank for `ev charger installation price`,
`home charger install cost`, and `tesla charger electrician cost` — that overlap suggests **expand
the existing page**, not create three new near-duplicate ones. Use real query behavior from the
export to refine architecture decisions before greenlighting new URLs (see
`KEYWORD-INTELLIGENCE.md`'s `SAME_INTENT`/cannibalization detection for the pre-publication version
of this same check).

## See also

- `rcode-seo-growth-orchestrator`'s `templates/local-gsc-goldmine.md` — the live, browser-driven
  complement to this export-driven workflow.
- `DATA-WORKSPACE.md` — where the GSC export lands and how it's normalized before these scripts run.
- `INTERNAL-LINK-INTELLIGENCE.md` — the internal-link half of the striking-distance checklist.
- `ACTION-QUEUE.md` — where every recommendation from this workflow becomes a tracked record.
- `PORTFOLIO-MANAGEMENT.md` — where winner/weak-project signals roll up across projects.
- `LIFECYCLE-AND-STAGE-GATES.md` — Gate 8/9's GSC decision table this workflow operationalizes in
  full.
