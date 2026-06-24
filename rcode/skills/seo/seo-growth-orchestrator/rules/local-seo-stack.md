# Play 2 — Local SEO 6-Prompt Stack

Six prompts that rank a local business. Run in this order; each produces a concrete artifact. Full prompts in `templates/local-*.md`.

## 1. GBP category audit  → `templates/local-gbp-categories.md`
Fastest local win. Analyze the business's Google Business Profile categories, reverse-engineer every category competitors use, and recommend exactly which to add and **in what order** so Google doesn't flag rapid changes.
- Output: "add today" (highest correlation, lowest risk) vs "add next week" lists; keep the existing primary; categories the model refuses to recommend without live verification; rationale.
- Why: most listings have a primary category from years ago and zero secondaries — leaving rankings on the table. GBP is what shows first in Maps/Search and what ChatGPT/Perplexity pull from.

## 2. GSC page-2 keyword gold mine  → `templates/local-gsc-goldmine.md`
Needs the user logged into Google Search Console in Chrome; Claude reads it via the Chrome extension / browser-harness (their session).
- Filter: avg position 8–20, has impressions, **not** branded, commercial/transactional intent. Sort by impressions, take top 20.
- Per keyword: forensic audit (keyword in title? H1? first 100 words? word count vs top-5? internal links pointing in? meta description? schema present?).
- Output: rewritten title + meta per page, plus a **30-day sprint** (week-by-week, current→new state per fix).

## 3. Competitor review sentiment mining  → `templates/local-review-mining.md`
Read ~100 reviews per competitor (200+ total). Extract: 5-star emotional language, top-10 *before-state fears*, top-15 *outcome phrases*, exact *recommendation language*, and the 5-star vs 3-star *trust-trigger gap*.
- Output (3 deliverables): rewritten GBP description (A/B/C), homepage headline + subhead variations, FAQ entries + a review-request script — all in the customers' own words.

## 4. Service + city landing page builder  → `templates/local-city-pages.md`
Pages rank, not sites. Build the full location-page stack in one session.
- Output: site audit + **gap matrix** (which service×city pages exist vs missing), publishing order (what first + why), full page copy per page, FAQ schema, internal-linking plan, image alt text.
- Rule: one page per service × each surrounding city/neighborhood the business wants jobs in.

## 5. Local citation audit + directory cleanup  → `templates/local-citations.md`
Find everywhere the NAP (name/address/phone/website) appears; flag inconsistencies (abbreviations count). Industry-specific directories (Thumbtack, Angi, HomeAdvisor, etc.).
- Output: high-priority fixes with exact corrected values + where to fix; missing high-value listings to claim (easy authority + backlinks).

## 6. Blog / keyword / content engine  → see `rules/content-engine.md`
Business context → competitive + opportunity analysis → blog titles + keyword list mapped to search intent, interlinked with service pages and content clusters. Optionally fully automate via tools (Play 4).

## Sequencing logic (Nick-Huber-style 90-day shape)
Days 1–14: GBP setup + NAP cleanup + first ~10 reviews. Days 15–45: one ultra-strong service/money page + 3–5 neighboring city pages + a trust page + 2 cornerstone posts. Ongoing: review velocity, weekly GBP posts, local link building. The 30-day payoff comes from GBP + pages + reviews — **not** new blog posts (those are 60–180 days).

Delegate mechanics to: `claude-seo:seo-local`, `claude-seo:seo-maps`, `on-page-seo-auditor`, `schema-markup-generator`, `internal-linking-optimizer`.
