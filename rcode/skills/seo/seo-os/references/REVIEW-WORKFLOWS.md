# Review Workflows

**Purpose:** the recurring cycles that tie every intelligence module together into a repeatable
review, split by how much data a project actually has. Running the mature-site sequence on a
two-week-old site wastes tokens analyzing data that doesn't exist yet; running the new-site sequence
on a two-year-old site ignores real signal that's sitting right there.

## Monthly growth review

For a project with enough GSC history to compare periods:

```
1.  ingest the latest GSC export                          (DATA-WORKSPACE.md, seo-csv-normalize.cjs)
2.  compare against the previous period                    (seo-gsc-decay.cjs)
3.  detect striking-distance opportunities                  (seo-gsc-striking-distance.cjs)
4.  detect CTR gaps                                          (seo-gsc-striking-distance.cjs's ctrGaps)
5.  detect decay                                             (seo-gsc-decay.cjs's decaying[])
6.  inspect cannibalization                                  (GSC-GROWTH-ENGINE.md)
7.  inspect internal-link opportunities                      (INTERNAL-LINK-INTELLIGENCE.md)
8.  inspect newly ranking queries                            (GSC-GROWTH-ENGINE.md winner detection)
9.  inspect conversions where business data exists           (business outcome tracking, PROJECT.md/STATE.md)
10. update the action queue                                  (ACTION-QUEUE.md)
11. update portfolio state                                   (PORTFOLIO-MANAGEMENT.md, STATE.md's Stage:)
```

This sequence integrates with the existing project lifecycle — it doesn't create a second state
system. Step 11 writes into the same `.rcode/seo/STATE.md` that `LIFECYCLE-AND-STAGE-GATES.md`
already defines.

## New-site review

A new site has little or no GSC history. Prioritize what's actually knowable:

```
indexation           crawlability          SERP validation       topic coverage
tool correctness      initial impressions   query discovery
```

**Do not run the mature-site analyses below on a site that lacks the data they need.** Striking-
distance, CTR-gap, and decay analysis all require an existing performance history — running them on
an empty or near-empty export produces noise, not signal, and wastes a review cycle pretending to
find insight that isn't there yet.

## Mature-site review

For an established site with real performance history, prioritize improving what exists over
publishing more:

```
existing opportunity (striking distance)      decay             CTR
conversions            cannibalization          internal links    competitor movement
```

Often, improving existing assets outranks publishing endless new pages — see `GSC-GROWTH-ENGINE.md`'s
"Data-informed publishing" section for the concrete check (does an existing page already partially
cover the new keyword's intent?) before greenlighting a new URL.

**AI-content-at-scale guardrail applies here too.** Do not measure this review's success by "number
of new pages generated." Measure usefulness, indexation, impressions, clicks, conversions, and link
earning instead. A scaled-publishing recommendation with no distinctive value per page is a risk to
flag in the review output, not a win to report.

## Token-efficient reporting

Do not produce a 100-page report every month. Default output shape:

```
executive summary          top opportunities          top risks
top actions                 supporting data (on request)
```

Use `rcode/templates/seo/insights/OPPORTUNITIES.md` for the rollup — a short, scannable summary with
drill-down available when the user actually asks for the underlying rows, not dumped by default (see
`DATA-WORKSPACE.md`'s large-dataset-handling discipline: script-aggregate before anything reaches the
agent's context, and the agent summarizes before anything reaches the user). The intelligence layer
exists to reduce work, not to create a new reporting bureaucracy the project owner has to read every
month regardless of whether anything changed.

## Reusable workflow names

The following are conceptual groupings of the modules/scripts above, useful for describing a request
concisely — **not new slash commands or a command-registration mechanism**. rcode's existing
architecture doesn't define command syntax at this layer, so none is added here per the scope
discipline in `AGENTS.md`:

```
seo research              seo ingest-gsc            seo ingest-ahrefs
seo analyze-keywords       seo striking-distance     seo content-decay
seo ctr-opportunities      seo internal-links        seo audit
seo monthly-review         seo portfolio-review
```

When a user asks for one of these by name, treat it as shorthand for "run the workflow described
under that heading in this file (or the matching reference module)," not as a literal command to
look up in a registry.

## See also

- `DATA-WORKSPACE.md` — where exports land before any review step runs.
- `GSC-GROWTH-ENGINE.md`, `INTERNAL-LINK-INTELLIGENCE.md`, `TECHNICAL-INTELLIGENCE.md`,
  `BACKLINK-INTELLIGENCE.md` — the analyses each review step delegates to.
- `ACTION-QUEUE.md` — where every review's findings are recorded, deduped, and tracked to resolution.
- `PORTFOLIO-MANAGEMENT.md` — the portfolio-wide rollup a monthly review feeds.
- `rcode/templates/seo/insights/OPPORTUNITIES.md` — the token-efficient report template.
