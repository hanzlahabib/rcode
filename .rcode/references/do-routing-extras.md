# /rcode-do — SEO and dev-practices routes

Read only when the input concerns SEO, schema, backlinks, AI search, local SEO, content generation, or Next.js / React / LLM best practices. Referenced from `.rcode/workflows/do.md`.

> **SEO route guard:** Skills in this block assume a project context exists (`.planning/PROJECT.md`). If absent, the `HAS_PRD` check in `<step name="check_project">` redirects to `/rcode-new-project`.

| **— SEO / Content intent —** | | |
| "audit my SEO", "why am I not ranking", "traffic dropped", "ranking dropped", "seo recovery", "crawl errors" | `/rcode-do` → `seo-audit` | Full technical + on-page + content audit across the site |
| "per-page audit", "audit this page", "score this URL", "on-page audit" | `/rcode-do` → `on-page-seo-auditor` | Single-page scored report with fix priorities |
| "core web vitals", "cwv fix", "technical seo", "crawl budget", "indexation", "mobile usability", "site speed" | `/rcode-do` → `technical-seo-checker` | Technical SEO: CWV, crawl, indexing, mobile, speed, architecture, redirects |
| "keyword research", "cluster keywords", "topic map", "keyword clustering", "find keywords" | `/rcode-do` → `seo-growth-orchestrator` (delegates to `claude-seo:seo-cluster`) | Strategy orchestrator produces cluster map from seed keywords |
| "content brief", "write SEO content", "blog post", "seo article", "content with E-E-A-T" | `/rcode-do` → `seo-content-writer` | E-E-A-T-aware prose generation with brief adherence checks |
| "content factory", "programmatic pages", "scale content", "brief location pages", "brief service pages", "run the content factory" | `/rcode-do` → `seo-content-factory` | 10-agent pipeline: competitor research → expansion → clustering → briefs → writing → interlinking → programmatic gen → schema → refresh |
| "build seo site", "build affiliate site", "niche site", "build content site", "seo site scaffold" | `/rcode-do` → `seo-site-builder` | End-to-end site scaffold with SEO architecture baked in |
| "local seo", "google business profile", "gbp", "citations", "nap audit", "rank-and-rent" | `/rcode-do` → `rank-and-rent-local-seo` (delegates to `claude-seo:seo-local`) | Local niche selection, city×service matrix, GBP signals, NAP, citations |
| "schema markup", "structured data", "rich results", "json-ld", "faq schema" | `/rcode-do` → `claude-seo:seo-schema` | Schema generation and validation for all supported types |
| "ai search", "geo seo", "llms.txt", "ai overviews", "perplexity", "chatgpt visibility", "aeo", "why isn't chatgpt mentioning us", "cited in ai overviews" | `/rcode-do` → `seo-aeo-geo` | Bundled AEO/GEO skill: cite-ability structuring, llms.txt, AI-crawler schema. `claude-seo:seo-geo` remains available as a deeper plugin (entity disambiguation) if separately installed |
| "backlinks", "link building", "guest posts", "link acquisition", "digital pr" | `/rcode-do` → `seo-growth-orchestrator` | Backlink acquisition play within the 5-play growth strategy |
| **— end SEO block —** | | |
| **— Dev Practices intent —** | | |
| "next.js best practices", "review my next.js code", "app router", "server component vs client component", "next.js caching", "next.js middleware", "is this the right way to fetch data in next.js" | `/rcode-do` → `nextjs-best-practices` | App Router conventions, Server/Client Component boundary, caching/data-fetching review |
| "react best practices", "component architecture", "where should this state live", "custom hook", "prop drilling", "is this good react code", "review this component" | `/rcode-do` → `react-best-practices` | Component architecture, hooks discipline, state-management boundaries |
| "llm engineering", "prompt engineering", "prompt design", "rag best practices", "how do i design this prompt", "tool calling schema", "context window" | `/rcode-do` → `llm-engineering-best-practices` | Prompt design, context/RAG design, tool-calling schema, LLM failure modes |
| **— end Dev Practices block —** | | |
