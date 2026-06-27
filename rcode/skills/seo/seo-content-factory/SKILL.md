---
name: rcode-seo-content-factory
description: Autonomous SEO content-factory for LeadLyze — a 10-agent pipeline (competitor research → keyword expansion → clustering → briefs → writing → interlinking → programmatic page gen → schema → refresh → opportunity finding) that researches, clusters, writes, interlinks, and ships 2,000+ SEO pages into the Next.js marketing site. Runs in AUTO mode via herdr orchestration. Trigger when the user says "run the content factory", "build SEO pages", "content factory", "auto SEO", "generate 2000 pages", "programmatic SEO", "SEO auto mode", or invokes /seo-factory.
metadata:
  version: 1.0.0
  target: "LeadLyze — the canonical `marketing/` site (Next.js 16 App Router, React 19, Tailwind v4). NOT marketing-v2..v5 (rejected redesigns)."
  composes_with: ["herdr-orchestration", "autonomous-fix-campaign"]
---

# SEO Content Factory

**You are not writing articles one page at a time. You are running a repeatable content-production *system*** that continuously discovers, clusters, briefs, writes, interlinks, and ships LeadLyze SEO pages — at the scale of 2,000+ pages — using Claude + Semrush MCP + herdr parallel agents.

This skill is the **factory floor**: the conveyor (the 10-agent pipeline), the machines (each agent's contract), and the auto-mode motor (herdr waves + heartbeat). It delegates *parallel-agent mechanics* to `herdr-orchestration` and the *auto-mode loop discipline* to `autonomous-fix-campaign`. **Read both before running in auto mode.**

## When to Use

**HARD-TRIGGER words — activate immediately:**
- `content factory`, `seo factory`, `/seo-factory`
- "build SEO pages", "generate 2000 pages", "programmatic SEO", "page factory"
- "auto SEO", "SEO auto mode", "run the SEO pipeline"
- "interlink the site", "content briefs at scale", "location/industry/comparison pages"

**Soft-trigger:** the user wants continuous organic-traffic growth for LeadLyze via *produced pages* (not just advice). For pure local-business / GBP / backlink advisory work, use `seo-growth-orchestrator` instead — this skill is the **production line**, that one is the **strategist**.

## Non-Negotiable Hard Rules

1. **Composes with `herdr-orchestration` + `autonomous-fix-campaign`.** Every golden rule of those skills applies verbatim: `cld` not `claude`, one worktree+branch per agent, work locally, **never push/deploy without explicit per-campaign consent**, durable backlog committed before wave 1, heartbeat never silent while agents work. Do not re-implement their mechanics here.
2. **BRIEFS BEFORE PROSE — hard gate.** The Writer agent (Agent 5) NEVER runs for a page that lacks an approved brief artifact on disk (`content/briefs/<slug>.md`). No brief → no article. This is the firewall against generic AI content. See `rules/quality-gates.md`.
3. **Evidence before generation.** Every keyword that enters the factory carries *real* Semrush/SERP data (volume, KD, intent, a live-SERP check), not an AI guess. AI-estimated volume is a hypothesis to verify, never ground truth.
4. **Data-driven for scale, MDX for craft.** 2,000 programmatic pages come from a JSON registry + `generateStaticParams` (100 cities × 20 services = 2,000 from ~5 data files) — NOT 2,000 hand-written MDX files. MDX is reserved for the ~100 editorial pages (alternatives, comparisons, cornerstone blog) where prose quality ranks. See `rules/programmatic-pages.md`.
5. **No duplicate/thin pages ship.** Every generated page passes the indexability gate (unique title+H1+intro, ≥ the cluster's min word floor, real internal links, valid schema) before it lands in the published set. Thin pages get `noindex` until enriched, not shipped raw. See `rules/quality-gates.md`.
6. **One source of truth per artifact.** Keywords live in `content/seo/keywords.csv`. Clusters in `content/seo/clusters.json`. The link graph in `content/seo/link-map.json`. Agents read/write these canonical files — never private copies that drift.

## The Pipeline (10 agents, 3 execution shapes)

The 10 agents are **not** 10 equal peers. They form a DAG with three distinct shapes:

```
   FUNNEL (sequential — each consumes the prior's artifact)
   A1 Competitor Research ─▶ A2 Keyword Expansion ─▶ A3 Sitemap Architect ─▶ A4 Brief Generator
                                                                                    │
   FAN-OUT (parallel per-cluster — the herdr wave engine)                          ▼
                         ┌──────────────┬──────────────┬──────────────┐
                    A5 Writer      A6 Interlinker  A7 Programmatic  A8 Schema
                         └──────────────┴──────────────┴──────────────┘
                                                  │
                                                  ▼  MDX + data registry + routes → marketing
   LOOP (recurring cron — never "done")
   A9 Content Refresh (weekly)   A10 Opportunity Finder (daily)  ──▶ append to BACKLOG → re-enter A4
```

| # | Agent | Shape | Consumes | Produces | Detail |
|---|-------|-------|----------|----------|--------|
| 1 | Competitor Research | funnel | seed domains | `competitors.csv` (keyword,type,intent,traffic,funnel) | `rules/agents.md` |
| 2 | Keyword Expansion | funnel | seeds + competitors.csv | `keywords.csv` (thousands) | `rules/agents.md` |
| 3 | Sitemap Architect | funnel | keywords.csv | `clusters.json` (hub→spoke tree) | `rules/agents.md` |
| 4 | Brief Generator | funnel | clusters.json | `briefs/<slug>.md` | `rules/agents.md` |
| 5 | Content Writer | fan-out | one brief | `content/<type>/<slug>.mdx` | `rules/agents.md` |
| 6 | Internal Linker | fan-out | all pages + link-map | 10 in + 10 out links/page → `link-map.json` | `rules/agents.md` |
| 7 | Programmatic Generator | fan-out | clusters.json (data type) | `content/data/*.json` + route templates | `rules/programmatic-pages.md` |
| 8 | Schema Agent | fan-out | each page | JSON-LD via `src/lib/jsonld.ts` | `rules/programmatic-pages.md` |
| 9 | Content Refresh | loop (weekly) | GSC + live pages | updated stats/links/examples | `rules/weekly-cadence.md` |
| 10 | Opportunity Finder | loop (daily) | competitor deltas | new briefs → BACKLOG | `rules/weekly-cadence.md` |

Full per-agent prompts (hardened, self-contained, paste-into-pane) live in `templates/agent-prompts/`.

## Auto Mode — the Run Loop

When the user says "auto" / "run the factory", execute this loop. It is `autonomous-fix-campaign`'s wave engine, specialized for content:

**Phase 0 — Setup (orchestrator, once)**
1. Confirm the heartbeat path with the user (`/loop`, `/schedule` cron, or manual ping) — never claim a wakeup you can't fire. (autonomous-fix-campaign rule 2.)
2. Confirm push/deploy policy. Default: **local only, no push** until explicitly approved.
3. Seed the durable backlog: `cp templates/BACKLOG.md <marketing>/.planning/seo-factory/BACKLOG.md`, commit it.
4. Establish the content layer in marketing if absent (content dirs, route templates, mdx loader) — see `rules/programmatic-pages.md`. Capture `pnpm tsc --noEmit | grep -c "error TS"` baseline.

**Phase 1 — Funnel (sequential, orchestrator-run or single agent)**
Run A1→A2→A3→A4 in order. These are cheap, Semrush-MCP-bound, and each gates the next. Output: `keywords.csv`, `clusters.json`, and a `briefs/` directory. **Do NOT parallelize the funnel** — A3 needs all of A2, A4 needs all of A3.

> **First-run default (DECIDED 2026-06-14):** start with **editorial money pages**
> (alternative + comparison clusters — highest commercial intent) in the first waves, THEN
> the programmatic service×city/industry engine. Editorial channel uses **`next-mdx-remote`**.

**Phase 2 — Fan-out waves (herdr, the volume engine)**
For each batch of N clusters (3–5 per wave), spin a herdr worktree+pane per cluster and run the **Writer→Interlinker→Schema** sub-chain on that cluster's pages. Programmatic (A7) clusters skip the Writer and run the data-registry path instead. Merge each wave into the integration branch before the next wave forks. Heartbeat every 10–15 min; never go silent. (Full mechanics: `rules/herdr-wave-mapping.md`.)

**Phase 3 — Gate + integrate**
Run the indexability gate (`rules/quality-gates.md`) across the wave's pages. Failures → `noindex` + re-brief, not ship. `pnpm tsc --noEmit` must not exceed baseline. Merge integration branch → master only with explicit user consent.

**Phase 4 — Loop (recurring)**
A9 (weekly refresh) + A10 (daily opportunity finder) append new work to BACKLOG → re-enter Phase 1's A4 for the new briefs. The factory never "finishes" — it idles between waves.

## Targets (set expectations honestly)

| Window | Pages | Mix |
|--------|-------|-----|
| Month 1 | 200 | programmatic location/industry + 20 cornerstone |
| Month 2 | 500 | + alternative/comparison pages |
| Month 3 | 1,000+ | + statistics/template/tool/question pages |

Programmatic pages can index in weeks; cornerstone editorial is a 60–180 day payoff. Say this to the user — don't promise rankings in 30 days.

## Integration (granular skills this factory calls)

- **Keyword/cluster mechanics:** `keyword-research`, `serp-analysis`, `competitor-analysis`, `content-gap-analysis`, `claude-seo:seo-cluster`
- **Writing/on-page:** `seo-content-writer`, `on-page-seo-auditor`, `meta-tags-optimizer`, `claude-seo:seo-content`
- **Links/schema/build:** `internal-linking-optimizer`, `schema-markup-generator`, `seo-site-builder`, `claude-seo:seo-schema`, `claude-seo:seo-sitemap`
- **Data:** **Semrush MCP** (`keyword_research`, `organic_research`, `overview_research`, `backlink_research`, `url_research`), GSC via browser/`browser-harness`.
- **Strategy layer:** `seo-growth-orchestrator` for the judgment/plays around the production.

## File References
- **Pipeline DAG + data contracts**: `rules/pipeline.md`
- **The 10 agent specs (hardened)**: `rules/agents.md`
- **herdr wave mapping (fan-out engine)**: `rules/herdr-wave-mapping.md`
- **Programmatic pages + marketing wiring**: `rules/programmatic-pages.md`
- **Quality gates (briefs-first, anti-thin, indexability)**: `rules/quality-gates.md`
- **Weekly cadence + 90-day plan + A9/A10 loop**: `rules/weekly-cadence.md`
- **Artifact templates**: `templates/` (CSV/JSON/MDX/route/schema)
- **Paste-ready agent prompts**: `templates/agent-prompts/`

## Validation Checklist
- [ ] Confirmed heartbeat path + push policy with user (Phase 0)
- [ ] Durable `BACKLOG.md` committed before wave 1
- [ ] Funnel (A1–A4) ran sequentially; `keywords.csv` + `clusters.json` exist
- [ ] No Writer ran without a brief on disk (briefs-first gate held)
- [ ] Programmatic pages use the data registry, not 2,000 MDX files
- [ ] Every shipped page passed the indexability gate (unique, word floor, links, schema)
- [ ] `pnpm tsc --noEmit` did not exceed baseline after each wave merge
- [ ] No push/deploy without explicit user consent
