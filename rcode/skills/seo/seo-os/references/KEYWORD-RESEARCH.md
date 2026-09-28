# Keyword Research (pointer)

**Status:** the full normalize → cluster → intent-bucket keyword pipeline this file used to defer is
now built — see `KEYWORD-INTELLIGENCE.md`. This file stays as a short pointer to where keyword data
actually comes from before that pipeline runs.

## Where raw keyword data comes from

- `rcode-seo-growth-orchestrator`'s GSC page-2 keyword mining play
  (`../../seo-growth-orchestrator/rules/local-seo-stack.md`, play 2) — mines Google Search Console
  for underperforming (position 8-20) commercial-intent queries on an **already-indexed** site. Use
  this for `EXISTING_SITE_GROWTH` / `SEO_RECOVERY` projects with GSC access; see `GSC-GROWTH-ENGINE.md`
  for the export-driven, deterministic complement of this same play.
- `rcode-seo-content-factory`'s keyword expansion agent
  (`../../seo-content-factory/rules/agents.md`, A2) — expands seed terms across modifier axes
  (industry, location, alternative, comparison, template, statistics, question, tool) using a live
  keyword-data source.
- `rcode-seo-site-builder`'s keyword-strategy step
  (`../../seo-site-builder/rules/03-keyword-strategy.md`) for a new affiliate/content site from a
  validated niche.
- An Ahrefs organic-keywords export, normalized via `scripts/seo-csv-normalize.cjs` per
  `DATA-WORKSPACE.md`'s canonical schema — the input `KEYWORD-INTELLIGENCE.md` consumes for the full
  pipeline below.

## What happens next

Whichever source the raw list came from, the OS-level requirement is unchanged: it is an input to
`KEYWORD-INTELLIGENCE.md` (clean → dedupe → intent/funnel classify → cluster → page-type classify →
score), never a page-generation instruction. Never let a keyword list map one-keyword-per-page — see
`TOPIC-CLUSTERING.md`'s normalize → dedupe → cluster → classify flow, and
`PAGE-TYPE-CLASSIFIER.md`'s page-existence test before any URL is created from a keyword.

## See also

- `KEYWORD-INTELLIGENCE.md` — the full pipeline: intent/funnel classification, action buckets,
  ambiguity handling, same-intent detection, topical map, and publishing order.
- `SERP-INTENT.md` — where raw keywords get validated before clustering.
- `TOPIC-CLUSTERING.md` — mandatory next step after keywords are gathered.
- `DATA-WORKSPACE.md` — canonical CSV schema and freshness rules for imported keyword exports.
- `rcode-seo-growth-orchestrator`, `rcode-seo-content-factory`, `rcode-seo-site-builder` — existing
  mechanics, unmodified by this skill.
