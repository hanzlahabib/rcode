# Project Classification

**Purpose:** classify every SEO project before applying strategy, so the router (`SKILL.md`) knows
which reference modules and which existing skill to load. Classification is inferred silently from
the business description, existing repo/domain, and `.rcode/seo/PROJECT.md` if present — do not
make the user fill out a form when the answer is inferable.

## Supported types

```
LOCAL_LEAD_GEN          RANK_AND_RENT           SERVICE_BUSINESS
TOOL   CALCULATOR   CONVERTER   GENERATOR
SAAS                    DIRECTORY               MARKETPLACE
AFFILIATE               INFORMATIONAL           PROGRAMMATIC
INTERNATIONAL           ECOMMERCE
EXISTING_SITE_GROWTH    SEO_RECOVERY            DOMAIN_RESEARCH_ONLY
```

A project may carry multiple classifications: one **primary** (the dominant business model) and
zero or more **secondary** tags (contributing strategies). Example:

```
Henderson EV Charger
  primary:   LOCAL_LEAD_GEN
  secondary: RANK_AND_RENT, SERVICE_BUSINESS

LeadLyze
  primary:   SAAS
  secondary: TOOL_LED_SEO, PROGRAMMATIC
```

## Decision rules (evidence-driven, not vibes)

| Signal observed | Classification |
|---|---|
| Physical/local service, "near me" intent, one or more cities | `LOCAL_LEAD_GEN` (+ `SERVICE_BUSINESS`) |
| Built to sell leads/calls to a business the operator doesn't run | + `RANK_AND_RENT` |
| Core product is a single-purpose input→output utility | `TOOL` / `CALCULATOR` / `CONVERTER` / `GENERATOR` (pick the closest) |
| Recurring-revenue software product, pricing tiers, trial/signup | `SAAS` |
| Free tools exist to funnel into the paid product | + `TOOL_LED_SEO` |
| Aggregates third-party listings without owning inventory | `DIRECTORY` or `MARKETPLACE` (marketplace if transactions occur on-site) |
| Monetizes via outbound referral/commission links | `AFFILIATE` |
| Primary value is explaining/teaching, no direct transaction | `INFORMATIONAL` |
| Pages are generated from a dataset (locations, products, prices) | `PROGRAMMATIC` — see `PROGRAMMATIC-SEO.md` before generating anything |
| Multiple markets/languages in scope | `INTERNATIONAL` — see `INTERNATIONAL-SEO.md` |
| Sells physical/digital goods online | `ECOMMERCE` |
| Already-indexed site, task is to grow existing traffic | `EXISTING_SITE_GROWTH` |
| Traffic/rankings dropped and the task is to diagnose/restore | `SEO_RECOVERY` |
| No site/product yet — task is purely "should we build this" | `DOMAIN_RESEARCH_ONLY` — see `DOMAIN-RESEARCH.md` |

If two rows both match strongly, keep both as primary + secondary rather than forcing one label.

## Why this gates module loading

`SKILL.md`'s routing table is keyed off these types. Do not load `PROGRAMMATIC-SEO.md` for a
single-location service business, and do not load `LOCAL-SEO.md` for a pure SaaS project with no
geographic component — load only what the classification implies the task needs (spec's
progressive-disclosure requirement).

## See also

- `SKILL.md` — the project-type routing table that consumes this classification.
- `LIFECYCLE-AND-STAGE-GATES.md` (Lane B) — the separate, orthogonal axis of *where in its
  lifecycle* a classified project currently sits.
