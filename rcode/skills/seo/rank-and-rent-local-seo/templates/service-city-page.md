# Service × City Page Skeleton

Page structure for one `{subniche}` in one `{city}`. Generate the framework with `seo-site-builder` and the copy with `seo-content-factory`; this is the target shape, not a token-swap template. Each page must be meaningfully localized (see `city-matrix-and-pages.md`).

## Target query
`{subniche} {city}` + variants: `{subniche} near me`, `emergency {subniche} {city}`, `24 hour {subniche} {city}`.

## Skeleton

```
H1: {Subniche} in {City} — {Emergency/24-Hour} Service

[Hero] one-line promise + click-to-call + service-area ({City} + neighborhoods)

H2: When you need {subniche} (symptoms / triggers, problem-aware language)
H2: Our {subniche} process (steps; reassures + builds intent)
H2: Why {City} homeowners call us
    - local references: neighborhoods, common local causes (climate, housing stock)
    - NAP / service-area block
H2: Before & after / case study (the conversion angle from subniche research)
H2: FAQ (seeded from People Also Ask for this subniche)
[CTA] click-to-call + lead form (call tracking number)

Schema: LocalBusiness + Service (via schema-markup-generator)
Internal links: → {subniche} hub, → related subniches in {City}, → other cities for {subniche}
```

## Quality gates (before publish)
- Title/H1 match the `{subniche} {city}` intent exactly (`on-page-seo-auditor`).
- Genuinely localized — not just `{city}` swapped (`geo-content-optimizer`).
- Indexable, fast, mobile-clean (`technical-seo-checker`).
- Tracked from launch (`rank-tracker`).

## Variables
- `{subniche}` — from `subniche-discovery.md`
- `{city}` — from the buyer-driven city list in `monetization.md`
