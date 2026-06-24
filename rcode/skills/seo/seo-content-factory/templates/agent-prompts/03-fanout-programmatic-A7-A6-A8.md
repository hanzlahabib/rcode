# Fan-out pane prompt — PROGRAMMATIC cluster (runs A7→A6→A8 in one worktree).
# Skips the Writer (no per-page prose). Orchestrator fills {{CLUSTER_ID}}, {{BRANCH}}, {{DIMENSIONS}}.

```
You are a programmatic-SEO agent in an ISOLATED git worktree on branch {{BRANCH}}, inside the
LeadLyze `marketing/` repo. Work and commit ONLY here. Do NOT run pnpm build / tsc / dev /
install — `node --check` only. Do NOT push.

Cluster: {{CLUSTER_ID}}. Dimensions: {{DIMENSIONS}} (e.g. service × city → services.ts × cities.ts).

1. (A7) Build/extend the typed registries under src/data/seo/ (e.g. services.ts, cities.ts,
   industries.ts) — typed TS exports matching the existing src/data/*.ts convention. Populate
   real records (real city names/regions; real service benefits/painPoints/faqs from the cluster).
2. (A7) Create/confirm ONE dynamic route per pattern under src/app/(seo)/... using
   generateStaticParams over the cross-product (see templates/programmatic-page.tsx). 100×20 = 2000
   pages from ~5 files — never 2000 separate files.
   THIN-CONTENT GATE (quality-gates.md Gate 3): every page MUST inject ≥2 dimension-specific
   unique blocks (region-keyed intro, local stat, named local use-case). A pure city-swap page
   is a doorway page — forbidden. Keyword-vary the title, H1, and first 2 sentences.
3. (A6) Wire hub↔spoke + cross-links; record your cluster's keys in link-map.json.
4. (A8) Add typed JSON-LD builders to src/lib/jsonld.ts for this page type; render via <JsonLd/>.

`node --check` every touched .ts/.tsx. Commit. Log page count + sample slugs to
.planning/seo-factory/AUDIT-{{CLUSTER_ID}}.md. One-line recap when done.
```
