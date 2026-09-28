# SERP Intelligence

**Purpose:** the standardized, dated SERP record and competitor-decomposition layer for the smaller
set of queries important enough to track carefully — a superset of `SERP-INTENT.md`'s lighter,
mandatory per-query classification. That module's intent taxonomy and click-potential rules are not
repeated here; this module cross-links them and adds the fuller record shape plus the "what does
nobody cover" decomposition.

## When to use this vs. SERP-INTENT.md

`SERP-INTENT.md` is the mandatory, lightweight validation gate every candidate keyword passes
through once, before it's treated as a validated opportunity. This module is for queries where the
fuller record and periodic re-check earn their cost: striking-distance candidates
(`GSC-GROWTH-ENGINE.md`, Lane F), content-brief targets (`CONTENT-BRIEFS.md`), and cannibalization
investigations.

## Standardized SERP record

For each tracked query, capture what's actually available. Do not assume today's SERP from model
memory — every field here is a `LIVE_SERP_OBSERVATION` (`EVIDENCE-POLICY.md`), dated, and part of
that file's freshness-sensitive tier:

```
query               date checked         country/location      device
top results         result types         AI Overview           featured snippet
People Also Ask     video                forum                 Reddit
local pack          shopping             direct answer         tool/widget
official entity
```

Result-type classification reuses `SERP-INTENT.md`'s set (`DEDICATED_SITE`, `DEDICATED_TOOL`,
`AUTHORITY_SUBPAGE`, `ARTICLE`, `FORUM`, `COMMUNITY`, `DIRECTORY`, `LOCAL_BUSINESS`, `GOVERNMENT`,
`VIDEO`, `OFFICIAL_ENTITY`, `SEARCH_ENGINE_FEATURE`) — this module does not invent a second
taxonomy.

## Competitor decomposition

Extends `COMPETITOR-RESEARCH.md`'s dimension list with a coverage-gap lens across the top useful
competitors for a tracked query:

```
what every result covers        what some results cover
what very few cover             what nobody covers
what users likely still need
```

Separate the findings into:

```
TABLE_STAKES       things we must cover because they're necessary to satisfy intent
DIFFERENTIATORS    things competitors largely fail to provide
ORIGINAL_VALUE      information/assets only this project can realistically provide
```

Each finding is a `COMPETITOR_OBSERVATION` (`EVIDENCE-POLICY.md`) until generalized into a claim.
`COMPETITOR-RESEARCH.md`'s "never say competitor ranks because X" discipline applies here unchanged
— a coverage gap is an observation about content, not a confirmed ranking cause.

## Output

- `.rcode/seo/SERP.md` — per-query SERP snapshot, dated (existing file; this module's fuller record
  shape is additive, not a new file).
- `TABLE_STAKES` / `DIFFERENTIATORS` / `ORIGINAL_VALUE` feed `CONTENT-BRIEFS.md`'s brief fields
  directly.

## See also

- `SERP-INTENT.md` — intent taxonomy, click-potential rules, and the mandatory lightweight
  validation gate this module extends for tracked queries.
- `COMPETITOR-RESEARCH.md` — the dimension list and evidence discipline this module's decomposition
  builds on.
- `CONTENT-BRIEFS.md` — where table-stakes/differentiators/original-value become brief fields.
- `EVIDENCE-POLICY.md` — `LIVE_SERP_OBSERVATION` / `COMPETITOR_OBSERVATION` label definitions.
