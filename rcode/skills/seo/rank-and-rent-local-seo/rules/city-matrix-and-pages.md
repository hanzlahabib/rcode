# City Matrix & Pages

How to turn chosen subniches into a programmatic subniche × city page set that ranks for local long-tail intent.

## Purpose
The asset is volume of well-targeted pages: one winnable subniche replicated across many cities. This rule defines the matrix, how to build pages with existing skills, and the quality bar that keeps them out of thin-content penalties.

## Rules

### Define the matrix

**Subniche × city**
Rows = your 5–10 chosen subniches. Columns = target cities. Start with cities a real buyer already wants (a buyer's city list is gold — build those first). One subniche × 100 cities = 100 pages.

**Start narrow, then widen**
Build one subniche fully across the priority cities before adding the next subniche. Depth ranks; breadth-without-depth doesn't.

### Build with the existing skills (don't hand-roll)

**Generate**
`seo-site-builder` for the page framework/templating; `seo-content-factory` for the per-page copy. Each page targets `<subniche> <city>` and its near-me / emergency variants.

**Localize**
`geo-content-optimizer` + `entity-optimizer` for genuine local relevance — city landmarks, neighborhoods, service-area language, NAP. Avoid pure {city} token-swap pages.

**Structure & markup**
`schema-markup-generator` for LocalBusiness/Service JSON-LD. `internal-linking-optimizer` to silo: subniche hub → city pages, and cross-link related subniches.

**QA every page**
`on-page-seo-auditor` (title/H1/intent match) + `technical-seo-checker` (indexability, speed, mobile). No page ships unaudited.

See `templates/service-city-page.md` for the page skeleton.

### Domains & map pack

**Exact-match domains**
Because everyone chases the head term, subniche EMDs are often available cheap (e.g. a `basementfloodingcleanup<city>.com` for ~$10). Grab them where it fits the strategy.

**GBP where allowed**
A Google Business Profile / map-pack listing helps where the niche permits. In spam-heavy niches it's hard — then rely on mass long-tail organic. Multiple subniche sites can also be used to dominate the 3-pack in one area (advanced).

## Examples

### Example: Build order
```
Subniche: basement flooding cleanup
Cities (buyer-supplied): Dallas, Houston, Austin, Phoenix, Atlanta, Las Vegas, ...
1. Build hub page + all city pages for THIS subniche (geo + schema + silo + QA)
2. rank-tracker on the set
3. Only then start subniche #2
```

### Example: Page pipeline
```
seo-site-builder → seo-content-factory → geo-content-optimizer/entity-optimizer
→ schema-markup-generator → internal-linking-optimizer
→ on-page-seo-auditor + technical-seo-checker → publish → rank-tracker
```

## Anti-Patterns

### Token-swap doorway pages
**Problem**: Identical page with only `{city}` changed → thin/doorway content, penalized.
**Instead**: Localize meaningfully (geo skill), vary intent sections, keep each page genuinely useful.

### Publish-and-forget
**Problem**: 100 pages live, none tracked, no idea what ranks.
**Instead**: `rank-tracker` from day one; double down on the subniche/city cells that move.

## Related
- `subniche-discovery.md` — supplies the rows
- `monetization.md` — what the ranked pages are for
- `templates/service-city-page.md` — page skeleton

## Changelog
- 2026-06-22: Initial version.
