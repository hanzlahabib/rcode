# Internal Link Intelligence

**Purpose:** a data-driven planner over an existing page inventory, extending the internal-linking
principles already implicit in `SITE-ARCHITECTURE.md`'s URL map and `TOPIC-CLUSTERING.md`'s cluster
structure. This is a post-launch, evidence-driven pass — pillar/cluster architecture is decided once
during Gate 3 (`LIFECYCLE-AND-STAGE-GATES.md`); this module revisits it once real traffic/authority
data exists.

## Reuse the existing inventory format where one exists

`rcode-seo-content-factory` already maintains a page-level link graph at `link-map.json`
(`{ slug: { inbound: [{from, anchor}], outbound: [{to, anchor}] } }`, built by its A6 Internal Linker
agent — see its `rules/pipeline.md` and `rules/agents.md`). Where a project has this file, read it
directly as the current-state input rather than re-deriving link structure from scratch. Where it
doesn't exist (a project not built by `seo-content-factory`, or a pre-existing site), build the
equivalent inventory ad hoc:

```
URL, title, primary topic, one-line summary, pillar, cluster, traffic, authority signals (if available)
```

## What this module outputs

```
pillar → cluster links              (does every cluster page link back to its pillar?)
cluster → pillar links              (does the pillar link out to its clusters?)
related cross-cluster links         (thematically adjacent pages in different clusters)
orphan pages                        (no inbound internal links at all)
strong-supports-weak pairs          (a high-authority/high-traffic page that could pass signal to a
                                      weak one on the same topic)
```

Each suggested link, when practical, should carry:

```
source, target, reason, suggested context, anchor suggestion
```

**Avoid exact-match-anchor spam.** Contextual relevance to the surrounding sentence matters more
than mechanically varying anchor text across links to the same target. This is a stricter framing of
`seo-content-factory`'s "keyword-varied anchors, never the same anchor twice" rule
(`rules/agents.md`) — variety is the mechanical constraint that prevents an over-optimized pattern;
relevance to context is the actual reason a link should exist. Satisfy both, but never sacrifice
relevance purely to hit a variety quota.

## Link opportunity prioritization

Flag a link opportunity as high-value when all three hold:

```
the page already ranks positions ~5-20 for a relevant query
  +
the page lacks relevant internal links
  +
strong related pages exist that could link to it
```

The position-5-20 candidates themselves come from `GSC-GROWTH-ENGINE.md`'s striking-distance
analysis (`seo-gsc-striking-distance.cjs`) — this module doesn't re-derive that ranking data, it
consumes it and checks for the missing-links half of the pattern.

**Treat this as an opportunity hypothesis, not a guaranteed ranking movement.** Adding internal links
is a low-cost, low-risk lever worth trying, but record it as a `HYPOTHESIS` (`EVIDENCE-POLICY.md`)
with an observation window (`ACTION-QUEUE.md`'s observation-window fields) before claiming it caused
any ranking change — especially since internal-link changes rarely happen in isolation from other
edits (see `ACTION-QUEUE.md`'s change-attribution note).

## See also

- `SITE-ARCHITECTURE.md` — where the pillar/cluster URL map is first designed (Gate 3).
- `TOPIC-CLUSTERING.md` — the pre-launch cannibalization check this module's cross-cluster analysis
  extends post-launch.
- `rcode-seo-content-factory` (`rules/pipeline.md`, `rules/agents.md`) — the `link-map.json` format
  and the A6 agent that maintains it during scaled content production.
- `GSC-GROWTH-ENGINE.md` — the source of striking-distance candidates this module cross-references.
- `ACTION-QUEUE.md` — where prioritized link opportunities land as actionable, deduped records.
