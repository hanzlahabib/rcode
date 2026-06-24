# Rule: Deep Research — 10 Parallel Agents

## When to Run
After niche is selected (user approved or solo yolo auto-selected)

## Research Directory Structure
Create immediately:
```
/[project-root]/research/
```

## The 10 Research Agents (Launch ALL in Parallel)

### Agent 1 — Competitor Intelligence
**Goal:** Find top 15 competing domains, their weaknesses, content gaps
**Browser tool usage:**
- Search: "best [niche keyword]" → note who ranks top 10
- Search: "[brand] review" for each major brand → who's reviewing?
- Check each competitor's About page for domain age, author info
- Look for: anonymous authors, outdated content, thin reviews, vendor bias
**Key questions to answer:**
- Which sites are weakest (anonymous, no testing, thin content)?
- What content types are MISSING from current top results?
- Is there a "named expert + independent testing" gap?
**Output:** `research/01-competitor-analysis.md`

### Agent 2 — Keyword Research
**Goal:** 100+ keywords scored 🟢🟡🔴, 30-day content roadmap
**Browser tool usage:**
- Search each seed keyword → note SERP composition (big brands vs small affiliates)
- Check Google autocomplete for each seed
- Read PAA (People Also Ask) boxes for question keywords
- Search: "[brand name] review" for each brand in niche
**Scoring:**
- 🟢 Green: AVG DA < 50, small affiliates ranking, buyer intent
- 🟡 Yellow: AVG DA 50-65, mix of sites, good intent
- 🔴 Red: Forbes/Amazon/WebMD dominate, DA 70+
**Output:** `research/02-keyword-research.md`

### Agent 3 — Monetization & Affiliate Programs
**Goal:** Every affiliate program, commission rate, cookie duration
**Browser tool usage:**
- Search: "[brand name] affiliate program" for each brand
- Check ShareASale, CJ Affiliate, Impact, Awin for programs
- Search: "[niche] affiliate program commission" 
- Calculate: commission per sale at each price tier
**Must answer:**
- What is Amazon commission % for this product category?
- Which brands have direct programs paying 5-15%?
- What is realistic revenue at 1k/5k/10k/50k monthly visitors?
**Output:** `research/03-monetization-analysis.md`

### Agent 4 — Amazon Product & Buyer Intent
**Goal:** Top products, buyer pain points, questions buyers ask
**Browser tool usage:**
- Search Amazon for main product category
- Read 1-star and 5-star reviews on top 5 bestsellers
- Read Q&A sections for buyer questions
- Check Amazon autocomplete for sub-niches
**Key findings:**
- Volume sweet spot (which price range sells most?)
- Top 3 buyer complaints → become content angles
- Top questions in Q&A → become FAQ/informational articles
**Output:** `research/04-amazon-product-research.md`

### Agent 5 — Content Strategy & Site Architecture
**Goal:** 7 content pillars, site URL structure, first 50 articles
**Browser tool usage:**
- Search Reddit for "[niche] buying advice" threads
- Search: "site:reddit.com [niche keyword]" for buyer questions
- Check Quora for unanswered niche questions
**Deliverables:**
- Full URL structure (/reviews/, /compare/, /guides/, /health/, /best/)
- First 50 articles in priority order with slugs
- Article templates for each type
- 7 differentiators competitors aren't doing
**Output:** `research/05-content-strategy.md`

### Agent 6 — Domain & Branding
**Goal:** Best domain name, brand positioning, E-E-A-T strategy
**Browser tool usage:**
- Check competitor domain name patterns from SERP
- Verify top domain candidates pass "radio test"
**Naming patterns (ranked best to worst):**
1. [niche-word] + [authority word]: ranked, advisor, lab, verdict, report
2. [adjective] + [niche-word]: the[niche], my[niche]
3. Exact match: only if .com available at normal price
**Avoid:** Non-.com TLDs unless .com is $20k+ premium
**Output:** `research/06-domain-branding.md`

### Agent 7 — Link Building Strategy
**Goal:** 12-month link acquisition calendar, 0 PBNs
**Browser tool usage:**
- Search: "[competitor domain] mentioned on Reddit"
- Find relevant subreddits for niche
- Find Quora questions with weak/no answers
**Free link sources (always include):**
- Reddit (r/[niche], r/biohacking, r/homeimprovement)
- Quora answers
- Pinterest (start Day 1)
- YouTube companion channel
**Digital PR anchor:** Always identify ONE data-driven content piece that earns natural links (EMF test, survey, cost study)
**Output:** `research/07-link-building-strategy.md`

### Agent 8 — Financial Model
**Goal:** P&L table (24 months), break-even, IRR, exit valuation
**Research real prices for:**
- Namecheap .com domain (~$10/yr)
- Cloudways DigitalOcean 2GB ($28/mo)
- Kadence Pro theme ($79/yr)
- AAWP ($49/yr)
- Rank Math Pro ($79/yr)
- Ahrefs Starter ($29/mo)
**Standard assumptions:**
- Blended commission: 3.9% (70% Amazon 3% + 30% direct 6%)
- Conversion rate: 0.75%
- Break-even: Month 7-9 typically
- Exit multiple: 32-38x monthly net profit
**Output:** `research/08-financial-model.md`

### Agent 9 — Technical Setup
**Goal:** Complete tech stack, plugin list, Day 1 checklist
**Standard stack (always use):**
- Hosting: Cloudways DigitalOcean 2GB
- CMS: Next.js 16.2.1 + Velite + MDX (NOT WordPress unless specifically requested)
- Theme: Kadence Pro (if WordPress) / Tailwind + shadcn/ui (if Next.js)
- Affiliate links: AAWP (Amazon) + ThirstyAffiliates (direct brands)
- SEO: Rank Math Pro
- Analytics: Google Analytics 4 + Search Console
**Output:** `research/09-technical-setup.md`

### Agent 10 — Traffic Growth Model
**Goal:** 24-month traffic projections, 3 scenarios, sandbox timeline
**Research:**
- Google sandbox duration for this niche type (YMYL adjacent = 4-6 months)
- Real case studies from NichePursuits, Income School, Authority Hacker
- Pinterest sandbox timeline (6-8 months)
- CTR by position in 2025 (Position 1 = ~19% with AI Overviews)
**3 scenarios always:**
- Best: 2x base projections
- Base: realistic median
- Worst: sandbox never fully lifts, recovery plan
**Output:** `research/10-traffic-growth-model.md`

## Synthesis Agent (fires after ALL 10 complete)
**Input:** All 10 research files
**Output:** `research/00-MASTER-BUSINESS-PLAN.md`
**Structure:** 14 sections (Executive Summary → Exit Strategy)
**Rule:** If synthesis times out, split into PART1 (sections 1-7) and PART2 (sections 8-14) then merge

## Progress Reporting
After each agent completes, report key finding in this format:
```
✅ Agent [N] done — [Key insight in one sentence]
[2-3 bullet points of most important findings]
```

## Interactive Gate
After all 10 + synthesis complete:
"Research complete for [Niche]. Master plan at research/00-MASTER-BUSINESS-PLAN.md
Want to:
1. Continue to keyword strategy for this niche
2. Research the next niche idea first
3. Go to site build immediately"
