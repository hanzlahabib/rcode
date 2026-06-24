# Play 4 — Content + Automation Engine

Goal: SEO-rich blog content → RSS → repurposed social, optionally fully automated. The chain: **Claude (brain) → blog/RSS (SEO-rich) → social posts → publish**.

## The pipeline
1. **Business context** — Claude asks for site URL, industry, niche, audience (clarify to ≥95%).
2. **Competitive + opportunity research** — competitor gaps, weak spots, keyword clusters, ranking opportunities. (Delegate to `competitor-analysis`, `content-gap-analysis`, `keyword-research`, `serp-analysis`.)
3. **Blog plan** — titles + primary/supporting keywords, mapped to search intent, interlinked with service pages and content clusters.
4. **Generate content WITH the on-page SEO layer** — title/meta, H2/H3, internal links to money pages (from sitemap), external links to trusted sources, alt text, FAQ schema. **Raw Claude prose lacks this layer — you must add it.** Either:
   - Use the granular skills: `seo-content-writer` + `on-page-seo-auditor` + `internal-linking-optimizer` + `schema-markup-generator`, OR
   - Use a tool that bakes SEO structure in on publish (see `tools.md`).
5. **RSS** — published posts populate the RSS feed.
6. **Social repurposing** — pull the RSS feed, generate platform social posts that link back to the blog/money pages, attach images (pulled from the article or generated).
7. **Publish/schedule** — manually, or via a publishing API on a weekly/monthly schedule.

## Automation tiers (let the user pick by budget)
- **Manual**: Claude produces plan + content; user pastes/publishes. $0 tooling.
- **Semi**: Claude plans; a content tool builds SEO-structured articles; user reviews + auto-posts to site.
- **Full**: content tool API auto-publishes articles → RSS → Claude builds social posts → social publishing API schedules them. Hands-off weekly run.

## Save it as a skill / reusable run
Once the workflow prompt is built, save it in Claude as a reusable skill (e.g. "SEO content autopilot") so it's one command each week. The practitioner runs it every Monday to schedule the week's blog + social.

## Honesty guardrails (see dos-and-donts.md)
- Tool APIs (Arvo content, Blotato social) are **paid third parties** — optional, disclose cost.
- Human-review the plan and any factual claims before auto-publish.
- Don't mass-publish thin posts to hit a number; quality + intent match.
