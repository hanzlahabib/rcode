# Opportunity Scoring

Single source of truth for the weighted opportunity rubric. `scripts/seo-opportunity-score.cjs`
implements these numbers 1:1 — do not copy this table into another file; link here instead.

This file has two parts: **Part 1** (below) scores a pre-launch candidate — should we build this at
all? **Part 2** (at the bottom of this file) scores an already-launched page using real data — what
should we fix next? Different question, different script, same rubric discipline.

This score is **decision support, not objective truth**. It exists to stop the
`low KD → available domain → buy it` failure mode (see `DOMAIN-RESEARCH.md`) by forcing every
candidate through the same nine dimensions before a build decision is made. Always record the
**evidence** behind each sub-score (a SERP screenshot note, a GSC query, a competitor gap) — a
number with no evidence is not a score, it is a guess wearing a score's clothes.

## Weighted rubric (100 points)

| Dimension | Weight |
|---|---|
| Intent fit | 20 |
| SERP opportunity | 15 |
| Click potential | 15 |
| Commercial / business value | 15 |
| Topical expansion | 10 |
| Utility advantage potential | 10 |
| Authority feasibility | 5 |
| Domain / brand fit | 5 |
| Technical feasibility | 5 |
| **Total** | **100** |

- **Intent fit** — does the dominant SERP intent (see `SERP-INTENT.md`) match what the project can
  actually deliver?
- **SERP opportunity** — how many results are `DEDICATED_SITE`/`DEDICATED_TOOL` vs. weak
  (`FORUM`, `DIRECTORY`, thin `ARTICLE`) per the SERP classification in `SERP-INTENT.md`?
- **Click potential** — how much of the SERP is satisfied by zero-click features before a real
  click happens (see `SERP-INTENT.md` §Click potential)?
- **Commercial / business value** — value per visitor/lead once ranked (see `MONETIZATION.md`).
- **Topical expansion** — does winning this query open a defensible cluster, or is it an island?
- **Utility advantage potential** — per `UTILITY-ADVANTAGE.md`, can a meaningfully better product
  be built than what's currently ranking?
- **Authority feasibility** — realistic given current/buildable domain authority and links.
- **Domain / brand fit** — fit of the candidate domain/brand, not "is the exact-match string free".
- **Technical feasibility** — buildable with available stack/time/data.

## Risk penalties (subtracted from the weighted total)

| Risk | Penalty |
|---|---|
| YMYL without sufficient authority | -25 |
| Heavy zero-click SERP | -20 |
| Official entity domination | -30 |
| Trademark / impersonation risk | -40 |
| Thin-content dependency | -20 |
| No realistic monetization | -15 |
| Extreme link dependency | -15 |
| Impossible product advantage | -10 |

Multiple risk flags stack (sum of all that apply). The script clamps the final total to `0` at the
floor — it never reports a negative score.

## Decision bands

| Range | Meaning |
|---|---|
| 75–100 | Strong candidate |
| 60–74 | Promising — manual review required |
| 45–59 | Weak / experimental |
| < 45 | Normally skip |

These thresholds are defaults, not absolutes — evidence can override a band (e.g. a 58 with a
strong first-party utility gap may still be worth an experiment; log the override in `DECISIONS.md`
with the reasoning). The script accepts a `config` override for weights/penalties/bands so a
future portfolio can tune them without forking the logic — see script header for the shape.

## Using the script

```bash
node rcode/skills/seo/seo-os/scripts/seo-opportunity-score.cjs path/to/input.json
```

Input shape (`scores` values may be a bare number or `{ "value": N, "evidence": "..." }` — the
evidence, when given, is preserved verbatim in the output breakdown so the score stays
inspectable):

```json
{
  "project": "example-project",
  "scores": {
    "intentFit": { "value": 18, "evidence": "SERP is 8/10 dedicated tools, matches our build" },
    "serpOpportunity": 12,
    "clickPotential": 10,
    "commercialValue": 13,
    "topicalExpansion": 8,
    "utilityAdvantage": 7,
    "authorityFeasibility": 3,
    "domainFit": 4,
    "technicalFeasibility": 5
  },
  "riskFlags": [
    { "flag": "heavyZeroClickSerp", "evidence": "SERP has a Google unit converter widget" }
  ]
}
```

Output: `{ project, total, band, subtotal, breakdown: { scores: [...], penalties: [...] } }`.

**See also:** `UTILITY-ADVANTAGE.md` for dimension 6, `SERP-INTENT.md` for dimensions 1-3,
`MONETIZATION.md` for dimension 4, `RISK-GUARDRAILS.md` for the penalty definitions
(YMYL/trademark/impersonation).

---

## Part 2 — post-launch page opportunity score

**Part 1 answers "should we build this?" before anything exists.** Part 2 answers "what should we
fix next on something already built?" once real data exists. They are deliberately different
questions, scored by a different script (`seo-page-opportunity-score.cjs`, not
`seo-opportunity-score.cjs`) with different dimensions — do not conflate them, and do not try to
retrofit Part 1's pre-launch dimensions (intent fit, domain/brand fit) onto a page that's already
live and indexed.

This is the "richer, data-sourced scoring pass" this file previously reserved — first-party evidence
(actual impressions, actual position, actual CTR, actual conversions) now available from
`GSC-GROWTH-ENGINE.md`'s exports increasingly outweighs the theoretical estimates Part 1 was forced
to use before launch (see `EVIDENCE-POLICY.md`'s evidence-class hierarchy: `FIRST_PARTY_DATA` and
`OBSERVATION`-tier evidence beats `TOOL_ESTIMATE`/`INFERENCE`).

### Weighted rubric (100 points)

| Dimension | Weight |
|---|---|
| Impression potential | 20 |
| Position gap | 20 |
| CTR gap | 15 |
| Business value | 15 |
| Internal-link deficit | 10 |
| Content gap / decay | 10 |
| Conversion potential | 10 |
| **Total** | **100** |

- **Impression potential** — how much existing search demand is the page already surfacing for
  (from `GSC-GROWTH-ENGINE.md`'s striking-distance data), independent of whether it's converting
  that demand into clicks yet.
- **Position gap** — how close the page sits to a meaningfully better position (the position 8-20
  striking-distance band is the highest-opportunity zone; a page already on position 1-3 has little
  gap left, a page on position 40+ has a gap too large for a small intervention to close).
- **CTR gap** — actual CTR against the position-appropriate CTR-by-position baseline
  (`seo-gsc-striking-distance.cjs`'s `ctrGaps` output) — see `GSC-GROWTH-ENGINE.md`'s CTR-cause
  checklist before assuming the gap is fixable with a title/meta change alone.
- **Business value** — organic visits, lead count, signup count, revenue, or call count attributable
  to the page where that data exists (`MONETIZATION.md`'s per-project economics, tracked per spec's
  business-outcome-integration principle: a page with 500 high-intent visitors producing customers
  can outrank a page with 20,000 definition-query visits and no conversion path).
- **Internal-link deficit** — how underlinked the page is relative to its opportunity, per
  `INTERNAL-LINK-INTELLIGENCE.md`'s link-opportunity prioritization.
- **Content gap / decay** — missing sections, outdated data, or a `seo-gsc-decay.cjs`-flagged decline
  relative to a prior period, per `GSC-GROWTH-ENGINE.md`'s content-decay analysis.
- **Conversion potential** — how likely the page's traffic is to convert given its funnel position
  and intent (see `KEYWORD-INTELLIGENCE.md`'s funnel classification), distinct from business value
  already observed — this dimension covers unrealized potential, business value covers what's already
  measured.

### Decision bands

| Range | Meaning |
|---|---|
| 75–100 | Top priority — act this cycle |
| 60–74 | Worth doing this review cycle if capacity allows |
| 45–59 | Backlog — revisit next review |
| < 45 | Low priority / monitor only |

As with Part 1, these bands are decision support, not a verdict — `TECHNICAL-INTELLIGENCE.md`'s
strategic-override principle applies here too (a site-wide `NOINDEX_ACCIDENT` outranks ten
high-scoring title fixes regardless of what the numeric bands say).

### Using the script

```bash
node rcode/skills/seo/seo-os/scripts/seo-page-opportunity-score.cjs path/to/input.json
```

Same shape as Part 1's script: normalized score entries with evidence preserved verbatim, a config
override for weights/bands, and the total clamped to 0-100. Output:
`{ project, url, total, band, breakdown }`.

**See also:** `GSC-GROWTH-ENGINE.md` for where the underlying GSC evidence comes from,
`INTERNAL-LINK-INTELLIGENCE.md` for the link-deficit dimension, `ACTION-QUEUE.md` for what happens to
a page once it's scored, `MONETIZATION.md` for the business-value dimension's economics.
