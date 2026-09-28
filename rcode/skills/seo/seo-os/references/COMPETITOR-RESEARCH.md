# Competitor Research

**Purpose:** structured, evidence-labeled competitor inspection — feeding `UTILITY-ADVANTAGE.md`,
`OPPORTUNITY-SCORING.md`, and build decisions without turning observations into unfounded causal
claims.

## Dimensions to inspect

```
domain            domain type        ranking URL         page type
search intent     UI structure       primary utility      supporting utility
content           topical coverage   internal links       schema
site architecture backlinks          referring domains    ranking keywords
traffic distribution   brand signals   social signals     performance
index footprint
```

Not every dimension applies to every competitor — prioritize the ones that inform the current
decision (a tool competitor needs UI/utility inspection; a service-business competitor needs
local-authority signals per `LOCAL-SEO.md`).

## Evidence discipline — this is the module's core rule

Distinguish, explicitly, between:

```
FACT          — independently verifiable and confirmed
OBSERVATION   — something actually seen in the SERP/page/backlink data
INFERENCE     — a reasonable conclusion drawn from an observation
HYPOTHESIS    — an untested explanation, offered as such
```

(Full label set and phrasing rules in `EVIDENCE-POLICY.md` — this module just enforces it in the
competitor-research context specifically.)

Never write:

> Competitor ranks because X.

Always prefer:

> X is one observed characteristic that may contribute alongside other factors.

## Competitor UX research — what's allowed

Studying competitor pages for information architecture, interaction patterns, feature gaps, user
flow, result presentation, usability, and content hierarchy is legitimate research. The output must
be an **original implementation** — study → understand → identify weakness → improve → build
original. See `DESIGN-UNIQUENESS.md` for what "original" means at portfolio scale.

**Do NOT copy:** brand identity, copyrighted artwork, unique text, proprietary assets, trademark
appearance, or distinctive visual expression. See Evaluation H (`../evals/evals.json`) — "copy the
#1 competitor exactly" is a request to decline in its literal form; research the competitor, ship
original UX/content/branding.

## Output

- `.rcode/seo/COMPETITORS.md` — per-competitor findings, each claim labeled per `EVIDENCE-POLICY.md`.
- Feeds `UTILITY-GAPS.md` (via `UTILITY-ADVANTAGE.md`) and `OPPORTUNITY-SCORING.md`'s SERP
  opportunity and utility-advantage dimensions.

## See also

- `SERP-INTENT.md` — the SERP classification competitor research builds on.
- `UTILITY-ADVANTAGE.md` — where competitor tool/product gaps become a build decision.
- `DESIGN-UNIQUENESS.md` — the constraint on how competitor-inspired design may be used.
- `EVIDENCE-POLICY.md` — canonical home of the evidence-label set used above.
