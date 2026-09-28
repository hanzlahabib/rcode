# Monetization

**Purpose:** every SEO project must have an explicit economic model. SEO traffic without business
value is not automatically a successful project — this module makes that judgment operational rather
than an afterthought at launch.

## Business models

```
lead generation      rank and rent        SaaS acquisition     affiliate
display ads          direct ads           directory listing    sponsorship
digital product       service sales       website sale         ecommerce
```

Record the chosen model(s) in `.rcode/seo/PROJECT.md` under "Current monetization" — this is a
durable fact, not speculation. Do not save a hoped-for model as if it were confirmed.

## Unit economics to record when knowable

```
value per visitor      value per lead        conversion rate       revenue per conversion
traffic requirement    content cost          link cost              tooling cost
development cost       maintenance burden
```

These feed `OPPORTUNITY-SCORING.md`'s "Commercial / business value" dimension (15 pts) — a project
with no realistic path to any of the above triggers the "No realistic monetization" risk penalty
(-15) regardless of how good its SERP opportunity looks.

## Portfolio economics — investment staging

When operating more than a handful of SEO assets, do not invest equally in every project. Stage
investment:

```
cheap research → cheap prototype → initial launch → indexation → observe signals
  → invest in winners → hold or kill weak projects
```

This staging is the economic backbone of `LIFECYCLE-AND-STAGE-GATES.md`'s lifecycle states and
`PORTFOLIO-MANAGEMENT.md`'s (Lane B) cross-project view — this module defines *why* the staging
exists (protect capital/time against unvalidated bets), those modules define the mechanics.

## Output

- `.rcode/seo/PROJECT.md` — business model, primary/secondary conversions (durable).
- Unit economics recorded as they become knowable, not fabricated ahead of real data — once
  first-party conversion data exists, prefer it over estimates (see `EVIDENCE-POLICY.md`).

## See also

- `OPPORTUNITY-SCORING.md` — where commercial value becomes a weighted score.
- `PORTFOLIO-MANAGEMENT.md` (Lane B) — the cross-project investment view this staging feeds.
- `RISK-GUARDRAILS.md` — the "no realistic monetization" and related risk penalties.
