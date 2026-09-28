# Data Workspace

**Purpose:** where imported SEO data lives, how it's normalized, and how fresh it stays. This is the
"real data goes in" half of the intelligence loop (`REAL DATA → NORMALIZE → ANALYZE → INTERPRET →
PRIORITIZE → EXECUTE → MEASURE → LEARN`) — every other intelligence module
(`KEYWORD-INTELLIGENCE.md`, `SERP-INTELLIGENCE.md`, `GSC-GROWTH-ENGINE.md`, Lane F) reads from what
this file defines rather than inventing its own drop zone or freshness rule.

## Directory layout

Created on first import — do not scaffold this speculatively (same create-on-need idiom as
`seo-project-init.cjs`'s `.rcode/seo/` scaffold):

```
.rcode/seo/
└── data/
    ├── gsc/
    ├── ahrefs/
    ├── analytics/
    ├── crawls/
    ├── backlinks/
    ├── serp/
    ├── competitors/
    └── MANIFEST.md
```

Each subdirectory holds the raw export as given (CSV/JSON) plus the normalized output alongside it.
Never overwrite a prior raw export silently — each accepted import gets its own manifest entry (see
below) even if a later export supersedes it for analysis purposes.

## Ingestion workflow

```
raw export (CSV)
  → drop into data/<source>/
  → seo-csv-normalize.cjs --schema=<schema> <file> [--out=f]
  → normalized JSON {schema, rows, validCount, skipped, warnings}
  → append an entry to data/MANIFEST.md (see Dataset manifest contract)
```

Rows missing a required field are never silently dropped or guessed — they land in
`skipped[{line, reason}]` and get reported to whoever ran the import. See
`scripts/seo-csv-normalize.cjs` and `scripts/lib/csv-parser.cjs` (Lane E) for the implementation.

## Canonical CSV schemas

Single source of truth for `seo-csv-normalize.cjs --schema=` values — the script implements these
fields 1:1; every other module that reasons over normalized rows (`KEYWORD-INTELLIGENCE.md`,
`GSC-GROWTH-ENGINE.md`, Lane F) references this table by name instead of restating it.

| Schema | Canonical fields | Common header aliases |
|---|---|---|
| `gsc-queries` | `query, clicks, impressions, ctr, position`, plus optional `page` | `"Top queries"` / `"Query"` / `"Queries"` → `query`; `"Page"` / `"Landing Page"` / `"URL"` → `page` |
| `gsc-pages` | `page, clicks, impressions, ctr, position` | `"Top pages"` / `"Page"` → `page` |
| `ahrefs-organic-keywords` | `keyword, volume, difficulty, cpc, position, url`, plus optional `serpFeatures, parentTopic, country` | `"KD"` / `"Difficulty"` → `difficulty`; `"Current URL"` / `"URL"` → `url`; `"Current position"` / `"Position"` → `position` |

`gsc-queries`'s `page` field is optional because GSC's default Queries export has no page dimension
(one row per query, aggregated across every ranking page) — it's only present when the export used
the combined query+page dimension. When present, `seo-gsc-striking-distance.cjs` groups candidates by
page and flags a query with rows for more than one distinct page as a cannibalization signal (see
`GSC-GROWTH-ENGINE.md`); when absent, every script keeps working exactly as before. `ahrefs-organic-
keywords`'s `serpFeatures`/`parentTopic`/`country` are optional for the same reason real Ahrefs
exports routinely leave them blank for many keywords — failing the whole row over an empty "Parent
Topic" cell would defeat the point of the importer.

Defensive by design: a header-alias table maps known header variants to the canonical field name; a
required field with no matching header, or a value that doesn't parse as the expected type, is not
guessed at — the row is skipped with a reason rather than silently coerced.

## Dataset manifest contract

Every accepted import appends one entry to `.rcode/seo/data/MANIFEST.md` (template:
`rcode/templates/seo/DATA-MANIFEST.md`, Lane E), recording:

```
source              exportDate           coveragePeriod
scope                project              notes
freshnessClass       (durable | semi-durable | freshness-sensitive)
```

This is the per-import instance of `EVIDENCE-POLICY.md`'s freshness tiers — that file defines the
three durability classes in general; this manifest is where a specific import's class is recorded
and dated so a later session can judge staleness without re-importing by default.

## Freshness by dataset

| Dataset | Default freshness |
|---|---|
| Site brief / business model | durable |
| Keyword export (Ahrefs/Semrush) | semi-durable |
| SERP snapshot | freshness-sensitive |
| GSC query/page export | freshness-sensitive |
| Ranking export | freshness-sensitive |
| Backlink export | freshness-sensitive |
| Revenue/conversion data | freshness-sensitive |

These are defaults, not universal law — a slow-moving niche's SERP snapshot may stay useful longer
than a volatile one's. Apply `EVIDENCE-POLICY.md`'s "check for an existing dated entry before
re-researching" rule rather than re-importing on every session by default.

## Data-source capability map

No single tool answers every SEO question. Route the question to the source that can actually
answer it — do not treat one tool as the answer to every question:

| Question | Source |
|---|---|
| What are people actually searching? | Ahrefs / Semrush / Keyword Planner (`data/ahrefs/`) |
| What are we already appearing for? | Search Console (`data/gsc/`) |
| Which URLs get organic clicks? | Search Console / analytics (`data/gsc/`, `data/analytics/`) |
| What links exist? | Ahrefs / Semrush / Majestic (`data/backlinks/`) |
| What does today's SERP show? | Live SERP inspection (`data/serp/`) — never model memory, see `SERP-INTELLIGENCE.md` |
| Did leads/revenue increase? | First-party business analytics (`data/analytics/`) |

## Request a specific export, not "more data"

When a required metric is missing, name the exact export needed. Vague requests waste a round trip;
specific ones don't:

```
Bad:     "I need more SEO data."

Better:  "Export the last 3 months of Google Search Console Queries and Pages with
          clicks, impressions, CTR, and position."

Better:  "Export Ahrefs organic keywords for the US including keyword, volume, KD,
          ranking URL, and position."
```

Continue reasoning over whatever evidence is already available while the request is pending — do
not block all output on one missing dataset.

## Large dataset handling

GSC/Ahrefs exports commonly run to thousands of rows. Filter, group, and summarize with a script
before any row set reaches model context — see `GSC-GROWTH-ENGINE.md` (Lane F) for the
striking-distance/decay scripts that do exactly this over a normalized GSC export. Dumping a raw
multi-thousand-row export into context is the token-inefficiency failure mode this workspace design
exists to prevent; local script aggregation, filtering, and grouping come first, model reasoning over
the top candidates comes after.

## Scripts

| Script | Consumes | Produces |
|---|---|---|
| `seo-csv-normalize.cjs` | raw CSV export | normalized `{schema, rows, validCount, skipped, warnings}` (see Canonical CSV schemas above) |
| `seo-keyword-preprocess.cjs` | `seo-csv-normalize.cjs`'s `ahrefs-organic-keywords` output | `{schema, summary, candidateGroups, singletons, flaggedPairs, config, note}` — deterministic dedup + cheap candidate-grouping preprocessing ahead of AI semantic clustering (`KEYWORD-INTELLIGENCE.md`'s pipeline) |
| `seo-gsc-striking-distance.cjs` | `seo-csv-normalize.cjs`'s `gsc-queries` output | `{strikingDistance, ctrGaps, cannibalization, config}` |

`seo-keyword-preprocess.cjs` usage:

```
node seo-keyword-preprocess.cjs <normalized.json> [--topN=50] [--jaccardThreshold=0.5]
  [--tokenBucketCap=50] [--full] [--out=f]
```

Exact/case/whitespace/hyphen-formatting duplicates are merged (max volume/difficulty/cpc, min
position across variants); different keywords only ever become a `candidateGroups[]` hypothesis
(shared ranking URL or token-set overlap), never a silent merge — pairs with high token overlap but
a diverging intent modifier (e.g. "jobs", "how to", "price") land in `flaggedPairs` instead. Output
is compact by default (`memberKeywords` only); pass `--full` for full per-member metrics inline. See
`KEYWORD-INTELLIGENCE.md`'s pipeline section for how this sits ahead of AI semantic clustering.

## See also

- `EVIDENCE-POLICY.md` — the freshness-tier definitions and evidence-class vocabulary this file
  instantiates per imported dataset.
- `KEYWORD-INTELLIGENCE.md` — consumes the `ahrefs-organic-keywords` normalized output, and
  `seo-keyword-preprocess.cjs`'s candidate-group output ahead of semantic clustering.
- `GSC-GROWTH-ENGINE.md` (Lane F) — consumes `gsc-queries`/`gsc-pages` normalized output for
  striking-distance, CTR-gap, and decay analysis.
- `scripts/seo-csv-normalize.cjs`, `scripts/lib/csv-parser.cjs` (Lane E) — the deterministic
  implementation of the ingestion step.
- `scripts/seo-keyword-preprocess.cjs` — the deterministic dedup/candidate-grouping preprocessing
  step, described above.
- `rcode/templates/seo/DATA-MANIFEST.md` (Lane E) — the manifest template instantiated at
  `.rcode/seo/data/MANIFEST.md` on first accepted import.
