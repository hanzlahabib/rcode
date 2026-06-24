---
name: seo-site-builder
description: End-to-end skill for finding, researching, planning, and building profitable affiliate SEO websites — from niche idea to live Next.js site.
---

# seo-site-builder

**End-to-end skill for finding, researching, planning, and building profitable affiliate SEO websites — from niche idea to live Next.js site.**

## Description
This skill encodes the complete workflow for building affiliate content sites that rank on Google. It covers niche discovery, deep market research, keyword analysis, competitor intelligence, content planning, financial modeling, and technical site build — using the exact process proven on SaunaRanked.com (Home Infrared Sauna Reviews niche).

## When to Use
- User says "find me a niche to build an affiliate site"
- User says "research [niche] for SEO site"
- User says "build me a niche site for [topic]"
- User says "run seo-site-builder"
- User wants to go from zero → live affiliate site
- User says "yolo" or "do all the work and report after you finish" to trigger full auto mode

## Modes

### 🔵 Interactive Mode (Default)
Claude presents findings at each stage and waits for user approval before continuing.
- Shows niche list → user picks → researches → user approves → plans → user confirms → builds

### 🔴 Yolo Mode
Triggered by: "yolo" OR "do all the work and report after you finish" OR "do everything and report back"
Claude makes all decisions independently and runs the entire workflow without stopping.
- Picks best niche automatically based on scoring criteria
- Runs all research agents in parallel
- Builds complete plan and site without approval gates
- Only stops if a critical blocker is found (e.g., niche already saturated)

## Core Principles

### 1. Data Before Decisions
Never guess. Every niche pick, keyword target, and content decision must be backed by:
- Real SERP analysis (browser tool)
- Competitor DA verification
- Volume + intent confirmation
- Golden Score / Weakspot data

### 2. No-Backlink First
Always prioritize keywords a brand new site (DA 0) can rank for WITHOUT backlinks:
- Target keywords where AVG DA of top 10 results < 50
- Prefer Weakspot ≥ 2 (2+ beatable pages in top 10)
- Model-specific reviews always beat generic roundups for new sites

### 3. Parallel Research Always
Never research serially. Always spawn multiple agents simultaneously:
- Competitor intel + Keyword research + Monetization run in parallel
- Financial model + Technical setup + Content strategy run in parallel
- Synthesis fires only after all agents complete

### 4. Browser-First Verification
Use Claude browser tools to verify EVERY claim:
- Open actual SERPs and read who is ranking
- Check competitor DA signals from their About pages
- Verify affiliate program existence on brand websites
- Confirm search volumes via Google autocomplete + PAA boxes

### 5. Maple Light Theme (Product-Demand Niches)
Target niches where:
- Products exist and sell ($500+ price point preferred)
- Amazon has 100+ reviews on top products (proven demand)
- Biohacking / wellness / home improvement / fitness angle
- Buyers research extensively before buying (= search traffic)
- Direct brand affiliate programs exist (higher commissions than Amazon)

## Full Workflow

→ See `rules/01-niche-discovery.md`
→ See `rules/02-deep-research.md`
→ See `rules/03-keyword-strategy.md`
→ See `rules/04-content-plan.md`
→ See `rules/05-site-build.md`
→ See `rules/06-yolo.md`

## Templates
→ See `templates/niche-scorecard.md`
→ See `templates/article-stub.mdx`
→ See `templates/image-prompt.md`
→ See `templates/keyword-export.md`

## Quick Reference — Workflow at a Glance

```
PHASE 1: DISCOVERY (10 min)
  → Search/scrape niche ideas from source or Google
  → Score each on: ticket size, competition, affiliate programs, trend
  → Present top 10 list to user
  [INTERACTIVE: User picks | YOLO: Auto-pick top scorer]

PHASE 2: DEEP RESEARCH (parallel agents, 30-60 min)
  → Agent 1: Competitor intelligence (browser tool)
  → Agent 2: Keyword research (browser tool + CSV analysis)
  → Agent 3: Monetization & affiliate programs
  → Agent 4: Amazon product & buyer intent research
  → Agent 5: Content strategy & site architecture
  → Agent 6: Domain & branding
  → Agent 7: Link building strategy
  → Agent 8: Financial model
  → Agent 9: Technical setup
  → Agent 10: Traffic growth model
  → Synthesis agent: Master business plan
  [INTERACTIVE: Show plan → user approves | SOLO YOLO: Continue automatically]

PHASE 3: KEYWORD STRATEGY (15 min)
  → Export keywords.txt (comma-separated for Ads Planner)
  → Request user to verify in Google Keyword Planner
  → Re-prioritize schedule after volume data returns
  → Build article-schedule.md sorted by: DA asc, Weakspot desc

PHASE 4: CONTENT PLAN (30 min)
  → Generate article stubs (MDX frontmatter only)
  → Create image-prompt files per article
  → Build internal linking map
  [INTERACTIVE: Ask to continue to next idea | SOLO YOLO: Continue]

PHASE 5: SITE BUILD (2-3 hours)
  → Init Next.js 16.2.1 with pnpm
  → Install Velite + Tailwind + shadcn/ui
  → Build core components
  → Install BMAD in project dir
  → Hand off to BMAD for final build
```

## Output Files Per Project
```
/[niche-slug]/
├── research/
│   ├── 01-competitor-analysis.md
│   ├── 02-keyword-research.md
│   ├── 03-monetization-analysis.md
│   ├── 04-amazon-product-research.md
│   ├── 05-content-strategy.md
│   ├── 06-domain-branding.md
│   ├── 07-link-building-strategy.md
│   ├── 08-financial-model.md
│   ├── 09-technical-setup.md
│   ├── 10-traffic-growth-model.md
│   └── 00-MASTER-BUSINESS-PLAN.md
├── docs/
│   └── article-schedule.md
├── keywords.txt              ← paste into Google Ads Planner
├── bmad/                     ← BMAD installed here
└── CLAUDE.md
```
