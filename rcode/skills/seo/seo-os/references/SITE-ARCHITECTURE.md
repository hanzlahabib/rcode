# Site Architecture and Topical Authority

**Purpose:** turn approved topic clusters (`TOPIC-CLUSTERING.md`) and page-type decisions
(`PAGE-TYPE-CLASSIFIER.md`) into a concrete site structure — built from topics and user needs, not
from arbitrary keyword counts.

## Every site needs

```
primary entity/topic          primary search opportunity     primary conversion
supporting topic clusters     supporting tools/services       internal link relationships
conversion paths
```

Record these in `.rcode/seo/PROJECT.md` (durable facts) and `.rcode/seo/SITE-MAP.md` (the concrete
URL tree).

## Topical authority model

For each core entity, discover and map:

```
attributes   actions   problems   calculations   comparisons   questions
use cases    services  locations  costs          requirements  tools
supporting concepts
```

Example decomposition:

```
EV charger installation
├── home installation          ├── cost               ├── permits
├── commercial installation    ├── electrical requirements
├── Level 2 / Tesla wall connector   ├── installation time
├── troubleshooting            ├── incentives          └── service areas
```

Only create a page for a node in this tree if it passes the page-existence test
(`PAGE-TYPE-CLASSIFIER.md`) — the tree describes the topic space, not an automatic page-per-node
mandate.

## Internal linking

Differentiate **structural links** (nav/header/footer — naturally repeat across pages) from
**contextual SEO links** (body links relevant to the specific page). Avoid blindly injecting
identical keyword-rich link blocks into every page. For larger sites, model the link graph
explicitly per page: `parent`, `children`, `siblings`, `related tools`, `related guides`,
`related services`, `related locations`. No important page should be orphaned; avoid excessive
indiscriminate linking in the other direction. Treat any linking tactic without verified causal
evidence as a `HYPOTHESIS` (`EVIDENCE-POLICY.md`), not a rule — do not encode unproven theories about
ranking algorithms as canonical knowledge here.

## Output

- `.rcode/seo/SITE-MAP.md` — URL tree with page types and parent/child relationships.
- Internal-link plan feeding into build (`OUTPUT-TEMPLATES.md`'s per-page-type content skeletons
  each expect a "related" section wired from this map).

## See also

- `PAGE-TYPE-CLASSIFIER.md` — the per-node page-type decision this architecture is built from.
- `../../seo-astro-implementation/references/astro-site-factory.md` (Lane C) — how this maps onto
  an Astro project's content collections and route structure.
- `LOCAL-SEO.md` — the location-specific architecture variant for local projects.
