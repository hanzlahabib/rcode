# Opportunity Scoring

Single source of truth for the weighted opportunity rubric. `scripts/seo-opportunity-score.cjs`
implements these numbers 1:1 — do not copy this table into another file; link here instead.

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

**Extension point (not built here):** a richer, data-sourced scoring pass (live GSC/Ahrefs deltas
feeding sub-scores automatically instead of hand-entered numbers) is reserved for Prompt #2 — see
`EVIDENCE-POLICY.md`'s extension-point note. The script's `scores`/`riskFlags` shape is designed so
that swap can happen without changing the output contract.
