# Pipeline & Data Contracts

The factory is a DAG of artifacts on disk. Agents are stateless — they read canonical
input files and write canonical output files. The files ARE the pipeline; an agent that
dies mid-wave is restartable because its inputs survived on disk.

## Canonical files (single source of truth)

Pipeline state lives under `<marketing>/.planning/seo-factory/` (factory working files,
gitignored except the backlog). Shipped content honors the site's **existing conventions**:
programmatic data as **typed TS modules in `src/data/`** (the site already stores
case-studies/faq/features/pricing this way), editorial as **MDX** (the blog `[slug]` shell
explicitly says "fetch MDX/CMS content by slug").

```
.planning/seo-factory/                # factory working state (orchestrator-owned)
  BACKLOG.md           # cluster frontier: pending|briefed|written|linked|shipped
  competitors.csv      # A1 → keyword,type,intent,traffic,funnel,source_url,competitor
  keywords.csv         # A2 → keyword,parent_seed,modifier_type,volume,kd,intent,funnel,cluster_id
  clusters.json        # A3 → hub-and-spoke topic tree (see schema below)
  link-map.json        # A6 → { slug: { inbound:[{from,anchor}], outbound:[{to,anchor}] } }
  gsc-deltas.csv       # A9/A10 → page,query,clicks,impressions,position,delta_28d
  briefs/<slug>.md     # A4 — the brief-before-prose GATE artifact

src/data/seo/                          # A7 programmatic registries (matches src/data convention)
  services.ts          # [{slug,name,benefits,painPoints,...}]  typed export
  cities.ts            # [{slug,name,region,population,...}]
  industries.ts        # [{slug,name,...}]
src/content/                           # A5 editorial MDX (the blog's stated CMS direction)
  blog/<slug>.mdx          # cornerstone, statistics, question pages
  alternatives/<slug>.mdx  # "<competitor> alternative" money pages
  comparisons/<slug>.mdx   # "<x> vs LeadLyze" pages
```

**Convention rule:** programmatic dimensions are TS (typed, imported by route templates +
`generateStaticParams`); editorial bodies are MDX (loaded by a small `src/lib/mdx.ts` loader).
Do NOT introduce a CMS, contentlayer, or a DB — the site is statically generated.

## Artifact schemas

### keywords.csv (A2 output — the factory's raw material)
```csv
keyword,parent_seed,modifier_type,volume,kd,intent,funnel,cluster_id
lead generation for dentists,lead generation software,industry,720,34,commercial,buy,ind-dentists
apollo alternative,lead generation software,alternative,2900,61,commercial,buy,alt-apollo
lead generation dubai,lead generation software,location,480,22,commercial,buy,loc-dubai
cold email open rate statistics,cold email,statistics,1300,18,informational,learn,stat-coldemail
```
- `modifier_type` ∈ `industry | location | alternative | comparison | template | statistics | question | tool | seed`
- `intent` ∈ `informational | commercial | transactional | navigational`
- `funnel` ∈ `learn | compare | buy`
- `cluster_id` assigned by A3, blank from A2.

### clusters.json (A3 output — the architecture)
```json
{
  "hubs": [
    {
      "id": "lead-generation",
      "title": "Lead Generation",
      "hub_page": { "slug": "lead-generation", "type": "money", "keyword": "lead generation software" },
      "spokes": [
        { "slug": "lead-generation-for-roofers", "type": "money", "keyword": "lead generation for roofers",
          "page_kind": "editorial|programmatic", "min_words": 1200, "cluster_id": "ind-roofers" }
      ],
      "page_kind": "programmatic",
      "dimensions": { "service": "lead-generation", "vary_by": "industries.ts" }
    }
  ]
}
```
- `page_kind: programmatic` → A7 generates via TS data registry + route template (no Writer). `editorial` → A4 brief + A5 Writer (MDX).
- `type` ∈ `money | supporting | blog`.

### .planning/seo-factory/briefs/<slug>.md (A4 output — the GATE)
See `templates/content-brief.md`. No `<slug>.mdx` may be written by A5 unless its brief exists and is marked `status: approved`.

### article frontmatter (A5 output)
See `templates/article.mdx`. Required frontmatter: `title, description, slug, cluster_id, type, keyword, intent, published, schema, internalLinks`.

### link-map.json (A6 output — where most SEO wins happen)
```json
{
  "lead-generation-for-roofers": {
    "inbound":  [{ "from": "lead-generation", "anchor": "lead gen for roofing companies" }],
    "outbound": [{ "to": "cold-calling-for-roofers", "anchor": "cold calling scripts for roofers" }]
  }
}
```
Target: ≥10 inbound + ≥10 outbound per page, anchors keyword-varied (never all identical).

## Execution shapes (why the DAG matters)

- **Funnel (A1–A4): strictly sequential.** A3 needs ALL of A2 to cluster correctly; A4 needs ALL of A3. Parallelizing the funnel produces incoherent clusters. Run it as ONE agent (or the orchestrator directly) end-to-end.
- **Fan-out (A5–A8): embarrassingly parallel per cluster.** This is the herdr wave engine — one worktree per cluster, Writer→Interlinker→Schema sub-chain. See `herdr-wave-mapping.md`.
- **Loop (A9–A10): recurring, never terminal.** Cron-shaped. Feed deltas back to A4. See `weekly-cadence.md`.

## Restartability

Because every stage persists to a canonical file, a crashed wave resumes by re-reading
the file. The BACKLOG tracks which clusters are `pending | briefed | written | linked |
shipped` so the orchestrator always knows the frontier after auto-compact.
