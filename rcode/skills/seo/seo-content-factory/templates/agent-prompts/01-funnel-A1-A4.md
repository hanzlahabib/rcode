# Funnel prompts (A1→A4) — run SEQUENTIALLY, one agent, before any fan-out.

Common footer appended to EVERY prompt below:
> Pull REAL data from Semrush MCP / live SERP before asserting any number — never invent volume/KD/traffic.
> Write output to the canonical file path under `.planning/seo-factory/`. Do not print results only to chat.
> You are working in the `marketing/` repo. Commit your output file with a clear message.

---

## A1 — Competitor Research
```
You are an SEO competitor analyst for LeadLyze (a lead-generation / sales-outreach platform:
email + LinkedIn + AI cold calling sequences).

Competitors: apollo.io, instantly.ai, lemlist.com, smartlead.ai.

Using Semrush MCP (organic_research, overview_research) + web search, for EACH competitor pull
their highest-traffic organic pages. For each page produce a CSV row:
  keyword,type,intent,traffic,funnel,source_url,competitor
- type ∈ industry | location | alternative | comparison | statistics | template | tool | blog
- intent ∈ informational | commercial | transactional | navigational
- funnel ∈ learn | compare | buy
Keep only rows where LeadLyze could plausibly compete. ≥200 rows.
Write to .planning/seo-factory/competitors.csv.
```

## A2 — Keyword Expansion
```
Read .planning/seo-factory/competitors.csv. Seeds: "lead generation software", "cold email",
"ai cold calling", "sales sequences".

Expand every seed across all 8 modifier axes: industry, location, alternative, comparison,
template, statistics, question, tool. Use Semrush keyword_research (related + questions +
broad match) to pull REAL volume and KD for each. Drop volume<10 OR KD>70 unless it is a clear
money term. De-dupe. Thousands of rows.
Write to .planning/seo-factory/keywords.csv with columns:
  keyword,parent_seed,modifier_type,volume,kd,intent,funnel,cluster_id   (leave cluster_id blank)
```

## A3 — Sitemap Architect
```
Read .planning/seo-factory/keywords.csv. Cluster keywords by SERP overlap (use the
claude-seo:seo-cluster skill / serp-analysis) into hub-and-spoke topics.

For each cluster decide page_kind:
- programmatic = high-volume templated dimensions (service×city, service×industry) → declare dimensions
- editorial = where prose ranks (alternatives, comparisons, cornerstone, statistics)
Mark each spoke type (money|supporting|blog) and min_words.
Write .planning/seo-factory/clusters.json (validate against templates/cluster.schema.json) and
write each keyword's cluster_id back into keywords.csv. Append new clusters to BACKLOG.md as pending.
```

## A4 — Content Brief Generator (the GATE feeder)
```
Read .planning/seo-factory/clusters.json. For EACH editorial cluster (skip programmatic ones),
read the LIVE top-5 Google results for its primary keyword (serp-analysis) and produce a brief
following templates/content-brief.md EXACTLY:
  title, meta, search intent, full H2/H3 outline (mirror the winning structure + 1 unique
  LeadLyze angle the top-5 lack), FAQ from People-Also-Ask, entities, inline internal links,
  CTA, schema types, min_words.
Write each to .planning/seo-factory/briefs/<slug>.md with status: approved.
Do NOT write any article — briefs only. Mark each cluster `briefed` in BACKLOG.md.
```
