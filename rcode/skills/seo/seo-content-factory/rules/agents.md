# The 10 Agents (hardened specs)

The user's original prompts were directionally right but too loose to run autonomously.
These are the hardened versions: each states its **input file**, **output file**, **tools**,
and **acceptance check**. Paste-ready copies are in `templates/agent-prompts/`.

Every agent prompt ends with the same two lines (the factory's discipline):
> Pull REAL data from Semrush MCP / live SERP before asserting numbers — never invent volume/KD.
> Write your output to the canonical file path. Do not print results only to chat.

---

## A1 — Competitor Research (funnel)
- **In:** seed domains (LeadLyze + 3–5 named competitors, e.g. apollo.io, instantly.ai, lemlist.com).
- **Tools:** Semrush `organic_research`, `overview_research`, `backlink_research`; `competitor-analysis` skill; web search.
- **Out:** `.planning/seo-factory/competitors.csv` → `keyword,type,intent,traffic,funnel,source_url,competitor`.
- **Task:** For each competitor pull top organic pages by traffic. Classify each into `type` ∈ industry / location / alternative / comparison / statistics / template / tool / blog. Tag `intent` and `funnel`. Keep rows where LeadLyze could plausibly compete.
- **Accept:** ≥200 rows, every row has a real `source_url` and a Semrush-sourced `traffic` estimate.

## A2 — Keyword Expansion (funnel)
- **In:** seeds + `competitors.csv`.
- **Tools:** Semrush `keyword_research` (broad match, related, questions); `keyword-research` skill.
- **Out:** `.planning/seo-factory/keywords.csv` (schema in `pipeline.md`).
- **Task:** Expand each seed across the 8 modifier axes — industry, location, alternative, comparison, template, statistics, question, tool. Pull volume + KD for each from Semrush. Drop volume<10 OR KD>70 unless it's a money term. De-dupe.
- **Accept:** thousands of rows, each with real volume+kd, `modifier_type` set, no dupes.

## A3 — Sitemap Architect (funnel)
- **In:** `keywords.csv`.
- **Tools:** `claude-seo:seo-cluster` (SERP-overlap clustering), `serp-analysis`.
- **Out:** `.planning/seo-factory/clusters.json` (schema in `pipeline.md`) + assigns `cluster_id` back into `keywords.csv`.
- **Task:** Cluster by SERP overlap into hub-and-spoke topics. Mark each spoke `page_kind: programmatic | editorial` and `type: money | supporting | blog`. Programmatic = high-volume templated dimensions (service×city, service×industry). Editorial = where prose ranks (alternatives, comparisons, cornerstone).
- **Accept:** every keyword belongs to exactly one cluster; each hub has a hub page + ≥3 spokes; programmatic clusters declare their `dimensions`.

## A4 — Content Brief Generator (funnel — the GATE feeder)
- **In:** one `editorial` cluster from `clusters.json`.
- **Tools:** `serp-analysis` (read top-5 live SERP pages), `content-gap-analysis`.
- **Out:** `.planning/seo-factory/briefs/<slug>.md` (template: `content-brief.md`), `status: approved`.
- **Task:** From the live top-5 SERP, extract the winning structure. Produce: title, meta, search intent, full H2/H3 outline, FAQ block, entities to cover, target internal links (from `link-map`/clusters), CTA, schema type, min word count. **Programmatic clusters skip A4** (they get a data record, not a brief).
- **Accept:** brief covers every entity the top-5 cover + 1 unique angle LeadLyze can own; marked approved.

## A5 — Content Writer (fan-out)
- **In:** ONE approved `briefs/<slug>.md`. **Refuses to run without it.**
- **Tools:** `seo-content-writer`, `on-page-seo-auditor`, `meta-tags-optimizer`.
- **Out:** `src/content/<type>/<slug>.mdx` (template: `article.mdx`).
- **Task:** Write strictly to the brief. Requirements: original LeadLyze examples + real use cases, ≥1 data table, real statistics (cited), FAQ section, the brief's internal links inline, the meta + frontmatter. **Anti-generic rules (`quality-gates.md`) are mandatory** — no "in today's fast-paced world", no filler intros, no unsupported claims.
- **Accept:** matches brief outline 1:1, ≥ brief's min words, passes `on-page-seo-auditor`, frontmatter valid.

## A6 — Internal Linker (fan-out — highest ROI)
- **In:** all existing pages (`src/content/**`, `src/data/seo/**`) + `link-map.json`.
- **Tools:** `internal-linking-optimizer`.
- **Out:** updates `link-map.json` + injects links into pages.
- **Task:** For each new page propose ≥10 inbound (from relevant existing pages) + ≥10 outbound, with **keyword-varied anchors** (never the same anchor twice). Prefer same-cluster + hub↔spoke links. Apply edits and record in `link-map.json`.
- **Accept:** every shipped page has ≥10/≥10; no orphan pages; anchor diversity ratio >0.7.

## A7 — Programmatic Page Generator (fan-out — the 2,000-page engine)
- **In:** `programmatic` clusters from `clusters.json`.
- **Out:** `src/data/seo/{services,cities,industries}.ts` + route template under `src/app/(seo)/...`. See `programmatic-pages.md`.
- **Task:** Build the dimension registries (TS, typed) and a single dynamic route per pattern with `generateStaticParams` looping the cross-product. 100 cities × 20 services = 2,000 pages from ~5 files. Each page: Hero, Benefits, Case Studies, Pricing, FAQ, CTA — composed from data, never duplicated boilerplate prose (see thin-content gate).
- **Accept:** `pnpm build` statically generates the full cross-product; spot-checked pages have unique title/H1/intro; no tsc errors.

## A8 — Schema Agent (fan-out)
- **In:** each generated page.
- **Tools:** `schema-markup-generator`, `claude-seo:seo-schema`; existing `src/lib/jsonld.ts`.
- **Out:** JSON-LD injected per page via `jsonld.ts` helpers.
- **Task:** Emit the right schema per page type — FAQPage, SoftwareApplication, Product, Review/AggregateRating, BreadcrumbList. Extend `src/lib/jsonld.ts` with typed builders; do not hand-write raw `<script>` blobs.
- **Accept:** every page validates against schema.org; types match page intent.

## A9 — Content Refresh (loop — weekly)
- **In:** `gsc-deltas.csv` (pages losing position over 28 days).
- **Tools:** GSC via `browser-harness`/Chrome ext, Semrush, `serp-analysis`.
- **Out:** updated pages + refreshed stats/competitors/links/examples; `lastUpdated` bumped.
- **Task:** Find decaying pages, diff against current top-3 SERP, update stale stats, add new competitors/links/examples, refresh `dateModified`.
- **Accept:** each refreshed page's `dateModified` updated + a recorded diff of what changed.

## A10 — Opportunity Finder (loop — daily)
- **In:** competitor organic deltas (keywords they newly rank for that LeadLyze doesn't).
- **Tools:** Semrush `organic_research` (diff vs last run), web search.
- **Out:** appends new clusters to `BACKLOG.md` → re-enters A4.
- **Task:** Daily, find net-new competitor keywords not in `keywords.csv`. Prioritize by volume × intent × winnability. Auto-generate a brief stub for the top N and queue them.
- **Accept:** new opportunities deduped against `keywords.csv`; top-N briefed and queued, not just listed.
