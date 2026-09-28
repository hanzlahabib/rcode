# Keyword Research (stub)

**Status:** thin by design. The full normalize → cluster → intent-bucket keyword pipeline is a
larger extension reserved for a future iteration of this system (see Extension point below) — do
not build it ad hoc inside a router response.

## What exists today

- `rcode-seo-growth-orchestrator`'s GSC page-2 keyword mining play
  (`../../seo-growth-orchestrator/rules/local-seo-stack.md`, play 2) — mines Google Search Console
  for underperforming (position 8-20) commercial-intent queries on an **already-indexed** site. Use
  this for `EXISTING_SITE_GROWTH` / `SEO_RECOVERY` projects with GSC access.
- `rcode-seo-content-factory`'s keyword expansion agent
  (`../../seo-content-factory/rules/agents.md`, A2) — expands seed terms across modifier axes
  (industry, location, alternative, comparison, template, statistics, question, tool) using a live
  keyword-data source. This is the LeadLyze-specific implementation; the *pattern* (seed →
  modifier-axis expansion → real volume/KD pull, never invented) generalizes.
- `rcode-seo-site-builder`'s keyword-strategy step
  (`../../seo-site-builder/rules/03-keyword-strategy.md`) for a new affiliate/content site from a
  validated niche.

## What this router adds on top

Whichever pipeline runs, the OS-level requirement is unchanged: raw keyword output is an input to
`SERP-INTENT.md` and `TOPIC-CLUSTERING.md`, not a page-generation instruction. Never let a keyword
list map one-keyword-per-page — see `TOPIC-CLUSTERING.md`'s normalize → dedupe → cluster → classify
flow, and `PAGE-TYPE-CLASSIFIER.md`'s page-existence test before any URL is created from a keyword.

## Extension point (not built here)

A richer, general-purpose keyword pipeline — normalize, remove duplicates, detect semantic
duplicates, intent-bucket, and hand off a clean cluster file regardless of which downstream skill
consumes it — is reserved for a future prompt in this system's build-out. When it lands it should
live as `seo-os/scripts/` additions (see `LIFECYCLE-AND-STAGE-GATES.md`'s scripts convention) rather
than a rewrite of the three existing skills above.

## See also

- `SERP-INTENT.md` — where raw keywords get validated before clustering.
- `TOPIC-CLUSTERING.md` — mandatory next step after keywords are gathered.
- `rcode-seo-growth-orchestrator`, `rcode-seo-content-factory`, `rcode-seo-site-builder` — existing
  mechanics, unmodified by this skill.
