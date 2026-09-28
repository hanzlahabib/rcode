# Content Briefs

**Purpose:** extends `seo-content-factory`'s brief schema
(`../../seo-content-factory/templates/content-brief.md`) with the fields the intelligence layer's
data pipeline produces — SERP evidence, competitor decomposition, and original-evidence
requirements. This module does not replace that brief format or its Gate 1 "no prose without an
approved brief" rule (`../../seo-content-factory/rules/quality-gates.md`) — scaled production still
runs through that pipeline. Use this module directly for a single article/page brief, or as the
field extension `seo-content-factory` reads from when its brief schema needs these fields.

## Extended brief fields

On top of `seo-content-factory`'s existing frontmatter (`slug, cluster_id, type, keyword,
secondary_keywords, intent, funnel, min_words, schema, status`) and body sections (title, meta
description, outline, entities, FAQ, internal links, CTA), add:

```
SERP summary               table stakes              competitor gaps
utility opportunity        original evidence needed   source requirements
```

- **SERP summary / table stakes / competitor gaps** — sourced from `SERP-INTELLIGENCE.md`'s
  per-query record and decomposition, not re-derived here.
- **Utility opportunity** — cross-links `UTILITY-ADVANTAGE.md` when the target page is tool-shaped.
- **Original evidence needed / source requirements** — see Original evidence layer below.

## Answer-first guidance

For suitable informational/commercial queries, suggest a concise, self-contained direct answer near
the beginning — guidance tied to intent, not a formula:

```
40-80 word self-contained answer, where it improves usability
```

Do not force this pattern onto: calculators, ecommerce pages, local landing pages, highly visual
tools, or any query whose intent doesn't suit it. Intent (`SERP-INTENT.md`) decides whether the
pattern applies at all — it is never applied uniformly across page types, matching
`OUTPUT-TEMPLATES.md`'s "no one generic template for every URL" rule.

## AI-citation patterns

`rcode-seo-aeo-geo` (`../../seo-aeo-geo/SKILL.md`, Layer 1: "Structuring Content for Extraction")
already owns extraction/citation mechanics end to end — direct definitions, question-shaped headers,
tables for comparable data, numbered steps, inline term definitions. That layer is not restated
here; load it when a brief also targets AI-citation visibility alongside classic ranking. Pages stay
written for humans first — citation-friendliness is a side effect of clarity, not a rewrite target
on its own.

## Original evidence layer

`ORIGINAL_EVIDENCE` — content backed by something only this project can provide:

```
our experiment       our dataset          our screenshots      our customer data
our benchmark        our calculator       our survey           our workflow
our photos           our case study       our first-hand observation
```

When content would benefit from first-hand evidence that doesn't exist yet, insert a placeholder
instead of fabricating it:

```
[NEEDS ORIGINAL EVIDENCE: provide real response-time data from LeadLyze]
```

This placeholder is the content-brief-specific form of `EVIDENCE-POLICY.md`'s human-input-gap
markers (`NEEDS_CUSTOMER_DATA`, `NEEDS_CASE_STUDY`, `NEEDS_SCREENSHOT`, etc.) — use the matching
marker when the same gap should also enter `ACTION-QUEUE.md` (Lane F) as a tracked, non-fabricated
open item.

## Content drafting rules

Where rcode already has writing/content skills, integrate rather than duplicate.
`rcode-seo-content-writer` owns title formulas and structure templates (`OUTPUT-TEMPLATES.md`);
`seo-content-factory`'s Gate 2 (`quality-gates.md`) already bans filler openers, empty hedging,
unsupported stats, and restated headings. This module points at those rather than forking a second
banned-phrases list.

## Voice guide

Support project-specific `VOICE.md` (template: `rcode/templates/seo/VOICE.md`, Lane E), copied into
a project on demand before brief/draft generation:

```
audience                tone                  reading level         sentence style
preferred terminology   forbidden terminology  brand personality     examples
```

A portfolio site's content should not read identically to every other portfolio site — `VOICE.md` is
the mechanism that prevents that. It's read by the writer/QA step; this module doesn't encode a
global house style here.

## Content quality gate

Before a brief-driven page (single-article path) is treated as publication-ready, review:

```
intent satisfaction    accuracy               specificity           original value
factual uncertainty    source requirements    redundancy            voice
AI-like filler         conversion alignment   internal links
```

If a material factual claim is uncertain, flag it (per `EVIDENCE-POLICY.md`) rather than silently
publishing it. This is the single-article/router-level checklist; scaled production defers to
`seo-content-factory/rules/quality-gates.md`'s harder Gates 1-6 (brief-before-prose, anti-generic-AI
rules, thin/duplicate-content gate, indexability gate) instead of re-running a lighter check on top.

## Output

- A brief per target page, extending `seo-content-factory`'s `content-brief.md` schema with the
  fields above.
- `[NEEDS ORIGINAL EVIDENCE: ...]` / `NEEDS_*` markers left in place until a human resolves them.

## See also

- `../../seo-content-factory/templates/content-brief.md`,
  `../../seo-content-factory/rules/quality-gates.md` — the brief schema and hardened multi-agent QA
  pipeline this module extends.
- `SERP-INTELLIGENCE.md` — source of the SERP summary/table-stakes/competitor-gap fields.
- `../../seo-aeo-geo/SKILL.md` — AI-citation extraction/citation mechanics, not duplicated here.
- `UTILITY-ADVANTAGE.md` — utility opportunity field for tool-shaped pages.
- `EVIDENCE-POLICY.md` — human-input-gap marker vocabulary.
- `OUTPUT-TEMPLATES.md` — per-page-type content skeleton and the "no forced word counts" precedent
  this module's answer-first guidance follows.
