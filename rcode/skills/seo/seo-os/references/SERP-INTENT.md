# SERP-First Validation, Intent, and Click Potential

**Purpose:** the mandatory research step between "we have a candidate keyword" and "we treat it as
validated." Search volume and keyword difficulty (KD) are supporting signals only — never the
approval mechanism on their own. This is the single most commonly skipped step (see Evaluation A in
`../evals/evals.json`), so treat it as a hard gate, not a suggestion.

## SERP-first inspection

For each candidate query, load the live SERP (browser tool, SERP API, or equivalent) and record, per
result:

```
dominant intent          (see Intent taxonomy below)
result type              (see classification below)
is it a dedicated competitor, an authority subpage, or incidental?
which SERP features are present (see Click potential below)
```

Classify each ranking result as one of:

```
DEDICATED_SITE   DEDICATED_TOOL   AUTHORITY_SUBPAGE   ARTICLE
FORUM            COMMUNITY        DIRECTORY           LOCAL_BUSINESS
GOVERNMENT       VIDEO            OFFICIAL_ENTITY     SEARCH_ENGINE_FEATURE
```

A SERP dominated by `DEDICATED_SITE`/`DEDICATED_TOOL` results is a strong-competition signal — the
opportunity may still exist, but "utility advantage" (`UTILITY-ADVANTAGE.md`) becomes the deciding
factor, not raw KD. A SERP with mostly `FORUM`/`ARTICLE`/thin `DIRECTORY` results and no dedicated
player is a much stronger opportunity signal than the same KD number would suggest alone.

## Intent taxonomy

```
INFORMATIONAL   NAVIGATIONAL   COMMERCIAL   TRANSACTIONAL   LOCAL   UTILITY   MIXED
```

Intent alignment is mandatory before proceeding. A project must be able to genuinely satisfy the
dominant intent of the SERP it wants to compete on — a `TRANSACTIONAL` SERP does not get won with an
`INFORMATIONAL` page, no matter how well-written.

## Click potential

Search volume is not obtainable organic traffic. A high-volume query can be nearly worthless if the
search engine answers it directly. Flag and penalize (do not just note) SERPs with:

```
built-in calculators        weather/currency instant answers    knowledge panels
heavy local-pack/map units  AI answer/overview boxes            other zero-click features
```

When scoring, feed this into `OPPORTUNITY-SCORING.md`'s "Click potential" dimension (15 pts) and, if
severe, the "Heavy zero-click SERP" risk penalty (-20).

## Evidence discipline

Every SERP observation is an `OBSERVATION`, not a `FACT`, unless independently confirmed — see
`EVIDENCE-POLICY.md` for the label set and phrasing rules. Do not write "this query converts well"
from SERP inspection alone; write what was actually observed and what it plausibly implies.

## Output

Feed classified results + intent + click-potential flags into:

- `.rcode/seo/SERP.md` (per-query SERP snapshot, dated — freshness-sensitive, see `EVIDENCE-POLICY.md`)
- `OPPORTUNITY-SCORING.md` dimensions 1-3 (Intent fit, SERP opportunity, Click potential)
- `TOPIC-CLUSTERING.md` (a query only enters clustering once intent is understood)

## See also

- `KEYWORD-RESEARCH.md` — volume/KD gathering happens before this step; this step is what actually
  decides whether those numbers mean anything.
- `UTILITY-ADVANTAGE.md` — the tie-breaker when a SERP is dominated by dedicated competitors.
- `OPPORTUNITY-SCORING.md` — where these findings become a number.
