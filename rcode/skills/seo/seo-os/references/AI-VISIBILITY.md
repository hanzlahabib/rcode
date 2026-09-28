# AI Visibility Tracking — EXPERIMENTAL

**This entire module is EXPERIMENTAL.** AI-answer platforms, their citation behavior, and their
market position change faster than this skill's release cadence can track. Treat everything below as
a tracking/logging convention, not a settled methodology — the durable principle is *use capable
tools, but trust real project evidence*, not any specific claim about which platform matters today.

**All AI-citation optimization mechanics already live in `rcode-seo-aeo-geo`** (extraction
structuring, entity consistency, citation signals — see its `references/extraction-and-citation-signals.md`).
This module is a thin project-memory wrapper around that skill: a periodic tracking log plus a
dual scoreboard. It does not reimplement any AEO/GEO mechanic — for "why isn't ChatGPT citing us" or
"structure this page for extraction," go to `rcode-seo-aeo-geo` directly.

## Periodic tracking log

Track, per check:

```
query, platform, whether brand/page appears, cited URL, competitors cited, date, notes
```

using the `AI-VISIBILITY.md` template (`rcode/templates/seo/insights/AI-VISIBILITY.md`). Platforms
in scope will change over time — do not hard-code today's specific AI products as permanent
architecture; the log's columns are provider-generic (`platform` is a free-text field, not an enum
of named products) so the format survives a platform's rise, rename, or disappearance.

## AI visibility hypotheses

When investigating why a page is or isn't cited, useful characteristics to inspect (per
`rcode-seo-aeo-geo`'s extraction guidance) include:

```
direct answer         specific claims         clear sources         original data
structured content    brand mentions          external citations
```

**These are not guaranteed ranking or citation factors** — they are hypotheses worth checking, in the
same `HYPOTHESIS` sense as everywhere else in this skill (`EVIDENCE-POLICY.md`). Store the outcome of
the project's own experiments (a specific page restructured, then re-checked for citation) as the
richer `EXPERIMENT_RESULT` evidence class once a result exists — that is how this module accumulates
real signal instead of repeating industry folklore.

## Classic-search vs. AI-visibility scoreboard

Track two separate dimensions rather than assuming one predicts the other:

| Classic search | AI visibility |
|---|---|
| rankings | citations |
| impressions | mentions |
| clicks | source URLs referenced |
| CTR | brand appearance in the answer |
| conversions | — |

A page can rank #1 in classic search and never get cited by an AI answer engine (its content isn't
extraction-shaped), and a page ranking outside the top 5 can be the one an AI answer quotes verbatim.
Do not collapse these into one number, and do not assume improving one automatically improves the
other (`rcode-seo-aeo-geo`'s "Cite-ability vs. Rank-ability" section covers why).

## What not to encode as timeless fact

Do not hard-code, as canonical skill knowledge:

```
claims that one current AI model/product is permanently best
current API pricing                    current benchmark scores
one dated Google/platform update       current AI search market share
exact CTR statistics                   current UI behavior of any SEO or AI tool
```

These belong in a project's dated research notes (`RESEARCH.md`, `DECISIONS.md`) or a temporary
observation entry in the tracking log above — never promoted into this reference module as a
standing rule. A module that hard-codes "Platform X has Y% market share" is stale the moment it
ships.

## See also

- `rcode-seo-aeo-geo` — owns all AI-citation optimization mechanics; this module tracks outcomes, it
  doesn't produce them.
- `EVIDENCE-POLICY.md` — the `HYPOTHESIS`/`EXPERIMENT_RESULT` labels this module's hypotheses and
  logged outcomes use.
- `BACKLINK-INTELLIGENCE.md` — dual-purpose (SEO + AI-citation) asset framing that feeds candidates
  into this tracking log.
- `rcode/templates/seo/insights/AI-VISIBILITY.md` — the log template.
