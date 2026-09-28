# Risk Guardrails

**Purpose:** the hard-stop checks that apply regardless of project type or task — trademark/brand
risk, YMYL scrutiny, and the irreversible-action gate the router (`SKILL.md`) must apply before any
high-impact action. This is the canonical home for these rules; other modules (`LOCAL-SEO.md`,
`PROGRAMMATIC-SEO.md`, `OFFPAGE-SEO.md`, `OPPORTUNITY-SCORING.md`) link here instead of restating
them.

## Trademark and brand risk

Check explicitly for: brand names, product names, game names, company names, official entities,
trademarks, lookalike domains, and impersonation risk. Slightly modifying a trademarked name is
**not** automatically safe — flag potential conflicts and avoid misleading users into believing a
site is official. This is the "Trademark / impersonation risk" risk penalty (-40, the largest
penalty) in `OPPORTUNITY-SCORING.md`.

## YMYL guardrails

Increase scrutiny for: health, medicine, finance, tax, legal, insurance, loans, investments, and
safety-critical calculations. These require stronger sources, methodology, review, accuracy,
jurisdiction awareness, an update process, and author/reviewer credibility where applicable. If a
project cannot realistically maintain this standard, recommend a safer niche rather than proceeding —
this is the "YMYL without sufficient authority" risk penalty (-25).

## Irreversible-action guardrail

Require evidence, a plan, an impact analysis, and a rollback strategy (where possible) plus
verification before executing any of:

```
domain change            large migration           mass URL deletion
thousands of generated pages                        canonical changes
noindex changes           bulk redirects             language architecture changes
```

Never casually rename URLs on an indexed site. The redirect workflow when URL structure must change:

```
old URL inventory → old→new mapping → permanent redirects → update internal links
  → update canonicals → update sitemap → check chains → crawl → monitor Search Console
```

This is the gate Evaluation E (`../evals/evals.json`, "rename all URLs to shorter versions")
requires — a migration plan, not a direct rename.

## Structured data honesty

Use structured data only when it truthfully represents content. Never fabricate ratings, reviews,
prices, availability, authorship, or entities.

## Full risk-penalty reference

These map 1:1 to `OPPORTUNITY-SCORING.md`'s penalty table — defined here, scored there:

```
YMYL without sufficient authority       -25
Heavy zero-click SERP                   -20
Official entity domination              -30
Trademark / impersonation risk          -40
Thin-content dependency                 -20
No realistic monetization               -15
Extreme link dependency                 -15
Impossible product advantage            -10
```

## See also

- `OPPORTUNITY-SCORING.md` — where these risks become penalties against the opportunity total.
- `LOCAL-SEO.md` — the local-specific fabrication guardrail (fake offices/reviews/staff) that
  instantiates the general "never fabricate legitimacy" principle here.
- `PROGRAMMATIC-SEO.md` — scale-generation as an irreversible-action trigger.
