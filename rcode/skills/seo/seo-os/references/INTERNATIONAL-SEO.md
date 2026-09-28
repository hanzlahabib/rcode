# International / Multilingual SEO

**Purpose:** stop the "AI makes translation cheap, so translate everything" failure mode
(Evaluation G, `../evals/evals.json` — "translate all 500 pages into 30 languages tonight"). No
existing skill in this repo covers multilingual validation, so this module carries the full
judgment, not a thin stub.

## Validate before opening a locale

```
search demand              language-specific SERP      local terminology
translation quality        conversion potential          maintenance capability
hreflang architecture      URL architecture
```

A locale is not justified by "we can translate it" — it is justified by evidence that the target
language's SERP has real demand and winnable intent for this content, the same way any other market
would need `SERP-INTENT.md` validation before investment.

## Sequencing

```
validate → launch limited locale → observe → expand
```

Do not publish 20 languages simultaneously. Launch the smallest locale set that lets you observe
real signal (indexation, impressions, conversions — see `LIFECYCLE-AND-STAGE-GATES.md`'s Observe
stage), then expand only from evidence, not from translation being cheap.

## Architecture requirements

- Correct `hreflang` implementation across all locale variants (self-referencing + reciprocal).
- A URL architecture decision (subdirectory vs subdomain vs ccTLD) made once and kept consistent —
  changing it later is a `RISK-GUARDRAILS.md`-class migration, not a quick fix.
- A `LocaleSwitcher` component contract if the implementation layer is Astro — see
  `../../seo-astro-implementation/references/astro-seo-components.md` (Lane C).

## Quality bar for translated content

Machine/AI translation is a production-efficiency tool, not a publish-directly pipeline — apply the
same AI-content QA checklist as any other content (`OUTPUT-TEMPLATES.md`'s AI content policy):
accuracy, local terminology correctness (not literal translation), and no fabricated local claims
(pricing, regulation, availability) that don't actually hold in that market.

## Output

- `.rcode/seo/PROJECT.md` — primary + secondary languages, target geography (durable facts).
- Per-locale validation notes before each locale launch, dated (freshness-sensitive —
  `EVIDENCE-POLICY.md`).

## See also

- `SERP-INTENT.md` — the per-market validation this module applies per locale.
- `OUTPUT-TEMPLATES.md` — AI content policy that also governs translated content quality.
- `RISK-GUARDRAILS.md` — URL/architecture-change guardrails relevant to locale restructuring.
