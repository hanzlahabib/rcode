# Backlink Intelligence

**Purpose:** the asset-identification and signal-analysis layer that decides *what's worth building
and pursuing*; `rcode-seo-growth-orchestrator`'s `rules/backlinks.md` already owns the acquisition
mechanics (the guest-post finder and competitor-backlink-mining workflows, `outreach-targets.csv` /
`competitor-backlinks.csv` outputs) — this module feeds that workflow better targets, it doesn't
duplicate it.

No backlink CSV schema is defined in this system yet (`DATA-WORKSPACE.md`'s data-source capability
map lists Ahrefs/Semrush/Majestic as the source for "what links exist," but the canonical CSV
schemas this skill normalizes today only cover GSC queries/pages and Ahrefs organic keywords — see
`DATA-WORKSPACE.md` §4). Where a backlink export is available, reason over it directly with the
signal categories below rather than waiting on a dedicated parser; adding one later is a
`seo-csv-normalize.cjs` schema addition, not a new module.

## Linkable asset engine

Use the project's topical map and actual capabilities to identify assets genuinely worth referencing
— not just "content," but something with intrinsic reference value:

```
calculator          dataset             benchmark           interactive tool
template             statistics page     industry glossary   original study
visualization        public API          checklist
```

For each candidate, assess:

```
who would link          why                  build cost
maintenance cost         originality          business value          SEO value
```

Prefer assets built from data the project already possesses or can realistically collect — a
"benchmark" nobody can actually populate with real numbers is a liability, not an asset.

## Backlink signal analysis

When backlink data is available, analyze:

```
strong pages (pages earning links already)      strong competitors (who out-links us)
link gaps (domains linking to competitors, not us)
unlinked mentions (brand mentioned without a link)
lost links                                       broken backlinks
```

feeding candidates into `ACTION-QUEUE.md` as outreach or reclamation actions. **Do not recommend mass
outreach by default.** A link-gap list is a prioritized starting point for the personalized workflow
below, not a mail-merge target list.

## Personalized outreach discipline

When outreach is actually warranted, base every pitch on real context:

```
target page/article        target site        our resource        specific relevance
```

The output should reference an actual connection between the two — never generic filler like "I love
your amazing article." Mass-generated fake personalization is worse than no personalization; it
signals spam louder than an honest generic template would. Quality over volume: a handful of
genuinely relevant pitches beats a hundred templated ones. This is the same discipline
`seo-growth-orchestrator/rules/backlinks.md`'s Workflow A already applies at the drafting
step — this module's job is making sure the *targets* fed into that drafting step are real link
gaps and real linkable assets, not an arbitrary list.

## Dual-purpose assets: SEO and AI citation

Some of the same asset types above are valuable for two separate reasons at once:

```
traditional SEO (links, rankings, referral traffic)
                    +
AI citation potential (an LLM can quote/reference it as a source)
```

Calculators, datasets, benchmarks, interactive comparisons, original studies, and statistics
resources are the clearest examples — they create something other sites *and* models can reference,
which neither generic prose nor a keyword-targeted landing page does as well. See `AI-VISIBILITY.md`
for how the AI-citation half is tracked; this module only flags the asset as a candidate.

## Link-worthy vs. keyword-targeted

Not every asset needs a high-volume target keyword to justify existing. Some are built primarily to:

```
earn links           earn mentions           support topical authority           provide evidence
```

Allow these into the architecture when strategically justified even if their own search volume is
low — their value shows up in what they enable elsewhere (backlinks to the domain, citation support
for other pages' claims, AI-visibility candidacy), not in their own ranking.

## See also

- `seo-growth-orchestrator/rules/backlinks.md` — the acquisition and outreach-drafting
  mechanics this module feeds rather than replaces.
- `AI-VISIBILITY.md` — the AI-citation half of a dual-purpose asset's value.
- `ACTION-QUEUE.md` — where prioritized outreach and asset-build candidates land.
- `DATA-WORKSPACE.md` — the data-source capability map, including where backlink data currently has
  no dedicated normalizer schema.
